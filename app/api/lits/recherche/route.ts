import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ville = searchParams.get('ville');
    const type_lit = searchParams.get('type_lit');
    const type_occupation = searchParams.get('type_occupation');
    const date_debut = searchParams.get('date_debut');
    const date_fin = searchParams.get('date_fin');

    let sql = `
      SELECT 
        l.id,
        l.numero,
        ch.nom as chambre_nom,
        ch.type_lit,
        log.adresse as logement_adresse,
        log.ville,
        log.type_occupation as logement_type_occupation
      FROM lits l
      LEFT JOIN chambres ch ON l.chambre_id = ch.id
      LEFT JOIN logements log ON ch.logement_id = log.id
      WHERE l.est_occupe = false
        AND log.est_visible = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (ville) {
      sql += ` AND log.ville = $${paramIndex}`;
      params.push(ville);
      paramIndex++;
    }

    if (type_lit) {
      sql += ` AND ch.type_lit = $${paramIndex}`;
      params.push(type_lit);
      paramIndex++;
    }

    if (type_occupation) {
      sql += ` AND log.type_occupation = $${paramIndex}`;
      params.push(type_occupation);
      paramIndex++;
    }

    sql += ` ORDER BY log.ville, log.adresse, ch.nom, l.numero`;

    const result = await query(sql, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recherche' },
      { status: 500 }
    );
  }
}