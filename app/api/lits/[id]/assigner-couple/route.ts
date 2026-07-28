import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { verifyCsrfMiddleware } from '@/lib/csrf';
import { logError } from '@/lib/logger';

/**
 * POST /api/lits/[id]/assigner-couple
 * Assigne deux collaborateurs à un lit double
 * Body: { collaborateur1_id, collaborateur2_id }
 */
export const POST = withAuth(async (request: NextRequest, payload: TokenPayload) => {
  void payload;
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json({ error: 'CSRF token invalide' }, { status: 403 });
    }

    const { id } = request.nextUrl.pathname.split('/').reduce((acc, segment, idx, arr) => {
      if (segment === 'lits') acc.id = arr[idx + 1];
      return acc;
    }, {} as any);

    const body = await request.json();
    const { collaborateur1_id, collaborateur2_id } = body;

    if (!id || !collaborateur1_id) {
      return NextResponse.json(
        { error: 'ID du lit et collaborateur1_id requis' },
        { status: 400 }
      );
    }

    // Vérifier que le lit existe
    const litResult = await query(
      `SELECT l.*, ch.logement_id, log.prix_loyer
       FROM lits l
       LEFT JOIN chambres ch ON l.chambre_id = ch.id
       LEFT JOIN logements log ON ch.logement_id = log.id
       WHERE l.id = $1`,
      [id]
    );
    if (litResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Lit non trouvé' },
        { status: 404 }
      );
    }

    const lit = litResult.rows[0];

    // Vérifier que c'est un lit double
    if (lit.type_lit !== 'double') {
      return NextResponse.json(
        { error: 'Seuls les lits doubles peuvent accueillir deux personnes' },
        { status: 400 }
      );
    }

    // Vérifier la capacité réelle du lit via la table lit_occupants
    const occupantsAvant = await query('SELECT COUNT(*) FROM lit_occupants WHERE lit_id = $1', [id]);
    const occupantsCount = parseInt(occupantsAvant.rows[0].count, 10);
    if (occupantsCount >= 2) {
      return NextResponse.json(
        { error: 'Ce lit double est déjà complet' },
        { status: 409 }
      );
    }

    // Vérifier que les collaborateurs existent
    const collab1 = await query('SELECT * FROM collaborateurs WHERE id = $1', [collaborateur1_id]);
    if (collab1.rows.length === 0) {
      return NextResponse.json(
        { error: 'Collaborateur 1 non trouvé' },
        { status: 404 }
      );
    }

    if (collaborateur2_id) {
      const collab2 = await query('SELECT * FROM collaborateurs WHERE id = $1', [collaborateur2_id]);
      if (collab2.rows.length === 0) {
        return NextResponse.json(
          { error: 'Collaborateur 2 non trouvé' },
          { status: 404 }
        );
      }
    }

    // Vérifier que les collaborateurs n'ont pas déjà un lit assigné
    const check1 = await query(
      'SELECT COUNT(*) FROM lit_occupants WHERE collaborateur_id = $1',
      [collaborateur1_id]
    );
    if (parseInt(check1.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Le collaborateur 1 a déjà un lit assigné' },
        { status: 400 }
      );
    }

    if (collaborateur2_id) {
      const check2 = await query(
        'SELECT COUNT(*) FROM lit_occupants WHERE collaborateur_id = $1',
        [collaborateur2_id]
      );
      if (parseInt(check2.rows[0].count) > 0) {
        return NextResponse.json(
          { error: 'Le collaborateur 2 a déjà un lit assigné' },
          { status: 400 }
        );
      }
    }

    // Ajouter les occupants
    await query(
      'INSERT INTO lit_occupants (lit_id, collaborateur_id) VALUES ($1, $2)',
      [id, collaborateur1_id]
    );

    if (collaborateur2_id) {
      await query(
        'INSERT INTO lit_occupants (lit_id, collaborateur_id) VALUES ($1, $2)',
        [id, collaborateur2_id]
      );
    }

    // Marquer le lit comme occupé tant qu'il reste au moins un occupant
    await query('UPDATE lits SET est_occupe = true WHERE id = $1', [id]);

    // Recalculer le partage à partir du nombre réel d'occupants du lit
    const logement_id = lit.logement_id;
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
    const prix_loyer = parseFloat(lit.prix_loyer || 0);

    const occupantsApres = await query(
      `SELECT collaborateur_id
       FROM lit_occupants
       WHERE lit_id = $1
       ORDER BY created_at`,
      [id]
    );

    const occupantIds = occupantsApres.rows.map((row: { collaborateur_id: number }) => row.collaborateur_id);
    const nombreOccupantsApres = occupantIds.length;
    const participationActualisee = nombreOccupantsApres > 0 ? prix_loyer / nombreOccupantsApres : 0;

    for (const occupantId of occupantIds) {
      const existingBail = await query(
        'SELECT id FROM baux WHERE logement_id = $1 AND collaborateur_id = $2 AND date_fin >= CURRENT_DATE LIMIT 1',
        [logement_id, occupantId]
      );

      if (existingBail.rows.length === 0) {
        await query(
          `INSERT INTO baux (logement_id, collaborateur_id, date_debut, date_fin, participation_mensuelle)
           VALUES ($1, $2, $3, $4, $5)`,
          [logement_id, occupantId, today, endDate, participationActualisee]
        );
      } else {
        await query(
          `UPDATE baux
           SET participation_mensuelle = $1
           WHERE logement_id = $2
             AND collaborateur_id = $3
             AND date_fin >= CURRENT_DATE`,
          [participationActualisee, logement_id, occupantId]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: nombreOccupantsApres > 1
        ? 'Couple assigné au lit avec succès et baux ajustés'
        : 'Collaborateur assigné au lit avec succès et bail créé',
    });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/lits/[id]/assigner-couple', method: 'POST' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de l\'assignation' },
      { status: 500 }
    );
  }
});
