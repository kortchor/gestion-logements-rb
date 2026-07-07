import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const collaborateurId = parseInt(params.id);

    if (isNaN(collaborateurId)) {
      return NextResponse.json({ error: 'ID de collaborateur invalide' }, { status: 400 });
    }

    const result = await query(
      `SELECT 
        l.id,
        l.numero,
        l.est_occupe,
        l.chambre_id,
        c.nom as chambre_nom,
        c.logement_id,
        log.nom_logement as logement_nom,
        log.adresse as logement_adresse
      FROM lits l
      LEFT JOIN chambres c ON l.chambre_id = c.id
      LEFT JOIN logements log ON c.logement_id = log.id
      WHERE l.collaborateur_id = $1 AND l.est_occupe = true
      LIMIT 1`,
      [collaborateurId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(null, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur GET lit actuel:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du lit actuel' },
      { status: 500 }
    );
  }
}