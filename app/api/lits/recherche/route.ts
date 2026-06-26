import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ville = searchParams.get('ville');
    const type_lit = searchParams.get('type_lit');
    const nombre_lits = searchParams.get('nombre_lits');
    const date_debut = searchParams.get('date_debut');
    const date_fin = searchParams.get('date_fin');
    const type_occupation = searchParams.get('type_occupation');

    let sql = `
      SELECT 
        l.id,
        l.numero,
        ch.nom as chambre_nom,
        ch.id as chambre_id,
        log.id as logement_id,
        log.adresse as logement_adresse,
        log.ville,
        ch.type_lit,
        ch.nombre_lits,
        log.type_occupation,
        log.est_visible
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

    if (nombre_lits) {
      sql += ` AND ch.nombre_lits >= $${paramIndex}`;
      params.push(parseInt(nombre_lits));
      paramIndex++;
    }

    if (type_occupation) {
      sql += ` AND log.type_occupation = $${paramIndex}`;
      params.push(type_occupation);
      paramIndex++;
    }

    // Vérifier la disponibilité pour les dates
    if (date_debut && date_fin) {
      sql += ` AND (l.date_debut_occupation IS NULL OR l.date_fin_occupation IS NULL OR 
               NOT (l.date_debut_occupation <= $${paramIndex} AND l.date_fin_occupation >= $${paramIndex + 1}))`;
      params.push(date_fin);
      params.push(date_debut);
      paramIndex += 2;
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