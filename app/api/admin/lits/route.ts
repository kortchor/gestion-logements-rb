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
        log.adresse as logement_adresse,
        log.ville,
        c.nom as collaborateur_nom,
        c.prenom as collaborateur_prenom
      FROM lits l
      LEFT JOIN chambres ch ON l.chambre_id = ch.id
      LEFT JOIN logements log ON ch.logement_id = log.id
      LEFT JOIN collaborateurs c ON l.collaborateur_id = c.id
      ORDER BY log.ville, log.adresse, ch.nom, l.numero
    `);
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}