import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

/**
 * POST /api/lits/[id]/retirer-occupant
 * Retire un collaborateur du lit
 * Body: { collaborateur_id }
 */
export const POST = withAuth(async (request: NextRequest, payload: TokenPayload) => {
  try {
    const { id } = request.nextUrl.pathname.split('/').reduce((acc, segment, idx, arr) => {
      if (segment === 'lits') acc.id = arr[idx + 1];
      return acc;
    }, {} as any);

    const body = await request.json();
    const { collaborateur_id } = body;

    if (!id || !collaborateur_id) {
      return NextResponse.json(
        { error: 'ID du lit et collaborateur_id requis' },
        { status: 400 }
      );
    }

    // Vérifier que l'occupant existe
    const occupant = await query(
      'SELECT * FROM lit_occupants WHERE lit_id = $1 AND collaborateur_id = $2',
      [id, collaborateur_id]
    );

    if (occupant.rows.length === 0) {
      return NextResponse.json(
        { error: 'Cet occupant n\'est pas assigné à ce lit' },
        { status: 404 }
      );
    }

    // Retirer l'occupant
    await query(
      'DELETE FROM lit_occupants WHERE lit_id = $1 AND collaborateur_id = $2',
      [id, collaborateur_id]
    );

    // Vérifier si le lit a d'autres occupants
    const remaining = await query(
      'SELECT COUNT(*) FROM lit_occupants WHERE lit_id = $1',
      [id]
    );

    const hasOccupants = parseInt(remaining.rows[0].count) > 0;

    // Si pas d'occupants, marquer le lit comme libre
    if (!hasOccupants) {
      await query('UPDATE lits SET est_occupe = false WHERE id = $1', [id]);

      // Terminer les baux actifs pour ce collaborateur (optionnel)
      // Cela peut être fait par l'admin manuellement si nécessaire
    } else {
      // Si un autre occupant existe, recalculer sa participation (il paie maintenant 100% au lieu de 50%)
      const otherOccupant = await query(
        'SELECT collaborateur_id FROM lit_occupants WHERE lit_id = $1',
        [id]
      );

      if (otherOccupant.rows.length > 0) {
        const otherCollabId = otherOccupant.rows[0].collaborateur_id;
        const litData = await query(
          `SELECT l.id, ch.logement_id 
           FROM lits l 
           JOIN chambres ch ON l.chambre_id = ch.id 
           WHERE l.id = $1`,
          [id]
        );

        const logement_id = litData.rows[0].logement_id;
        const logInfo = await query('SELECT prix_loyer FROM logements WHERE id = $1', [logement_id]);
        const prix_loyer = parseFloat(logInfo.rows[0]?.prix_loyer || 0);

        // Mettre à jour le bail du collaborateur restant
        await query(
          `UPDATE baux 
           SET participation_mensuelle = $1 
           WHERE collaborateur_id = $2 AND logement_id = $3 AND date_fin >= CURRENT_DATE`,
          [prix_loyer, otherCollabId, logement_id]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Occupant retiré avec succès',
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors du retrait de l\'occupant' },
      { status: 500 }
    );
  }
});
