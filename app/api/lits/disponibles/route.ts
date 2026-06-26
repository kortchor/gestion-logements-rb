import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query(`
      SELECT 
        l.id,
        l.numero,
        l.est_occupe,
        ch.nom as chambre_nom,
        ch.type_lit,
        ch.nombre_lits,
        log.id as logement_id,
        log.adresse as logement_adresse,
        log.ville,
        log.type_occupation as logement_type_occupation
      FROM lits l
      LEFT JOIN chambres ch ON l.chambre_id = ch.id
      LEFT JOIN logements log ON ch.logement_id = log.id
      WHERE l.est_occupe = false
        AND log.est_visible = true
      ORDER BY log.ville, log.adresse, ch.nom, l.numero
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