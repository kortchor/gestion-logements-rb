import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query(`
      SELECT DISTINCT ville 
      FROM logements 
      WHERE est_visible = true
      ORDER BY ville
    `);
    const villes = result.rows.map((row: any) => row.ville);
    return NextResponse.json({ success: true, data: villes });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des villes' },
      { status: 500 }
    );
  }
}