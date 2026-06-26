import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    const result = await query(
      'SELECT id, nom, type_lit, nombre_lits FROM chambres WHERE logement_id = $1 ORDER BY id',
      [id]
    );
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des chambres' },
      { status: 500 }
    );
  }
}