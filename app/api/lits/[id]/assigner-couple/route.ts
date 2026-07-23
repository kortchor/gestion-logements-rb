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

    return NextResponse.json({
      success: true,
      message: collaborateur2_id 
        ? 'Couple assigné au lit avec succès' 
        : 'Collaborateur assigné au lit avec succès',
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'assignation' },
      { status: 500 }
    );
  }
});
