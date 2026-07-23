import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

/**
 * POST /api/lits/[id]/assigner-couple
 * Assigne deux collaborateurs à un lit double
 * Body: { collaborateur1_id, collaborateur2_id }
 */
export const POST = withAuth(async (request: NextRequest, payload: TokenPayload) => {
  try {
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
    const litResult = await query('SELECT * FROM lits WHERE id = $1', [id]);
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

    // Marquer le lit comme occupé
    await query('UPDATE lits SET est_occupe = true WHERE id = $1', [id]);

    // Créer les baux automatiquement (si pas déjà existants)
    const logement_id = lit.logement_id;
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

    // Créer ou mettre à jour le bail pour collaborateur 1
    const existingBail1 = await query(
      'SELECT * FROM baux WHERE logement_id = $1 AND collaborateur_id = $2 AND date_fin >= CURRENT_DATE',
      [logement_id, collaborateur1_id]
    );

    if (existingBail1.rows.length === 0) {
      // Récupérer le prix du logement
      const logInfo = await query('SELECT prix_loyer FROM logements WHERE id = $1', [logement_id]);
      const prix_loyer = parseFloat(logInfo.rows[0]?.prix_loyer || 0);
      const participation = collaborateur2_id ? prix_loyer / 2 : prix_loyer;

      await query(
        `INSERT INTO baux (logement_id, collaborateur_id, date_debut, date_fin, participation_mensuelle)
         VALUES ($1, $2, $3, $4, $5)`,
        [logement_id, collaborateur1_id, today, endDate, participation]
      );
    }

    // Créer le bail pour collaborateur 2 (si applicable)
    if (collaborateur2_id) {
      const existingBail2 = await query(
        'SELECT * FROM baux WHERE logement_id = $1 AND collaborateur_id = $2 AND date_fin >= CURRENT_DATE',
        [logement_id, collaborateur2_id]
      );

      if (existingBail2.rows.length === 0) {
        const logInfo = await query('SELECT prix_loyer FROM logements WHERE id = $1', [logement_id]);
        const prix_loyer = parseFloat(logInfo.rows[0]?.prix_loyer || 0);
        const participation = prix_loyer / 2;

        await query(
          `INSERT INTO baux (logement_id, collaborateur_id, date_debut, date_fin, participation_mensuelle)
           VALUES ($1, $2, $3, $4, $5)`,
          [logement_id, collaborateur2_id, today, endDate, participation]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: collaborateur2_id 
        ? 'Couple assigné au lit avec succès et baux créés (50/50)' 
        : 'Collaborateur assigné au lit avec succès et bail créé',
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'assignation' },
      { status: 500 }
    );
  }
});
