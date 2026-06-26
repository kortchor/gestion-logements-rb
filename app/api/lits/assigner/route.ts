import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lit_id, collaborateur_id, date_debut, date_fin } = body;

    // Vérifier que le lit existe et est disponible
    const litResult = await query(
      'SELECT id FROM lits WHERE id = $1 AND est_occupe = false',
      [lit_id]
    );

    if (litResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ce lit n\'est pas disponible' },
        { status: 400 }
      );
    }

    // Vérifier que le collaborateur existe
    const collabResult = await query(
      'SELECT id FROM collaborateurs WHERE id = $1',
      [collaborateur_id]
    );

    if (collabResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Collaborateur non trouvé' },
        { status: 404 }
      );
    }

    // Assigner le lit
    await query(
      `UPDATE lits 
       SET est_occupe = true, 
           collaborateur_id = $1, 
           date_debut_occupation = $2, 
           date_fin_occupation = $3 
       WHERE id = $4`,
      [collaborateur_id, date_debut || null, date_fin || null, lit_id]
    );

    return NextResponse.json(
      { success: true, message: 'Lit assigné avec succès' },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'assignation' },
      { status: 500 }
    );
  }
}