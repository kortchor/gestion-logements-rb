import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const litId = parseInt(params.id);

    // Vérifier que le lit existe
    const checkResult = await query(
      'SELECT id, est_occupe FROM lits WHERE id = $1',
      [litId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Lit non trouvé' },
        { status: 404 }
      );
    }

    if (!checkResult.rows[0].est_occupe) {
      return NextResponse.json(
        { error: 'Ce lit est déjà libre' },
        { status: 400 }
      );
    }

    // Libérer le lit
    await query(
      'UPDATE lits SET est_occupe = false, collaborateur_id = NULL WHERE id = $1',
      [litId]
    );

    return NextResponse.json(
      { success: true, message: 'Lit libéré avec succès' },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la libération' },
      { status: 500 }
    );
  }
}