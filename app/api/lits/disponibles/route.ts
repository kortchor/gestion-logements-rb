import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateDebut = searchParams.get('date_debut');
    const dateFin = searchParams.get('date_fin');

    let queryStr = `
      SELECT 
        l.id,
        l.numero,
        l.est_occupe,
        l.chambre_id,
        c.nom as chambre_nom,
        c.type_lit,
        c.logement_id,
        log.nom_logement,
        log.adresse as logement_adresse,
        log.ville,
        log.type_occupation_effectif,
        log.date_debut_contrat,
        log.date_fin_contrat
      FROM lits l
      LEFT JOIN chambres c ON l.chambre_id = c.id
      LEFT JOIN logements log ON c.logement_id = log.id
      WHERE l.est_occupe = false
        AND log.est_actif = true
    `;

    // Si dates fournies, vérifier que le logement est disponible pendant cette période
    if (dateDebut && dateFin) {
      queryStr += `
        AND (
          -- Logement disponible toute l'année (pas de date_fin_contrat)
          log.date_fin_contrat IS NULL
          -- OU la période demandée est dans la période disponible du logement
          OR (
            (log.date_debut_contrat IS NULL OR log.date_debut_contrat <= $1::date)
            AND (log.date_fin_contrat IS NULL OR log.date_fin_contrat >= $2::date)
          )
        )
      `;
    }

    queryStr += ` ORDER BY log.nom_logement, c.nom, l.numero`;

    const params = dateDebut && dateFin ? [dateDebut, dateFin] : [];
    const result = await query(queryStr, params);
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des lits' },
      { status: 500 }
    );
  }
}