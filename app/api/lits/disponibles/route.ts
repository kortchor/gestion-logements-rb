import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { ensureLitOccupantsTable } from '@/lib/lit-occupants-schema';

export async function GET(request: NextRequest) {
  try {
    await ensureLitOccupantsTable();
    const { searchParams } = new URL(request.url);
    const dateDebut = searchParams.get('date_debut');
    const dateFin = searchParams.get('date_fin');

    let queryStr = `
      WITH bed_state AS (
        SELECT
          l.id,
          l.numero,
          l.chambre_id,
          COALESCE(
            lo_counts.occupants_count,
            CASE WHEN l.collaborateur_id IS NOT NULL THEN 1 ELSE 0 END
          ) AS occupants_count,
          CASE
            WHEN LOWER(TRIM(COALESCE(c.type_lit, 'simple'))) = 'double' THEN 2
            ELSE 1
          END AS capacity
        FROM lits l
        JOIN chambres c ON c.id = l.chambre_id
        LEFT JOIN (
          SELECT lit_id, COUNT(*)::int AS occupants_count
          FROM lit_occupants
          GROUP BY lit_id
        ) lo_counts ON lo_counts.lit_id = l.id
      )
      SELECT 
        bs.id,
        bs.numero,
        bs.occupants_count >= bs.capacity AS est_occupe,
        bs.chambre_id,
        c.nom as chambre_nom,
        c.type_lit,
        c.logement_id,
        log.nom_logement,
        log.adresse as logement_adresse,
        log.ville,
        log.type_occupation_effectif,
        log.date_debut_contrat,
        log.date_fin_contrat
      FROM bed_state bs
      LEFT JOIN chambres c ON bs.chambre_id = c.id
      LEFT JOIN logements log ON c.logement_id = log.id
      WHERE bs.occupants_count < bs.capacity
        AND COALESCE(log.est_actif, true) = true
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

    queryStr += ` ORDER BY log.nom_logement, c.nom, bs.numero`;

    const params = dateDebut && dateFin ? [dateDebut, dateFin] : [];
    const result = await query(queryStr, params);
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/lits/disponibles', method: 'GET' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des lits' },
      { status: 500 }
    );
  }
}