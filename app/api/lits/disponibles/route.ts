import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query(`
      SELECT 
        l.id,
        l.numero,
        l.est_occupe,
        l.chambre_id,
        c.nom as chambre_nom,
        c.logement_id
      FROM lits l
      LEFT JOIN chambres c ON l.chambre_id = c.id
      WHERE l.est_occupe = false
      ORDER BY l.id
    `);
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des lits' },
      { status: 500 }
    );
  }
}