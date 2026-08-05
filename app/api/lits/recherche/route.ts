import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withReadAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { logError } from '@/lib/logger';
import { ensureLitOccupantsTable } from '@/lib/lit-occupants-schema';

export const dynamic = 'force-dynamic';

const getHandler = async (request: NextRequest, payload: TokenPayload) => {
  void payload;
  try {
    await ensureLitOccupantsTable();
    const { searchParams } = new URL(request.url);
    const ville = searchParams.get('ville');
    const type_lit = searchParams.get('type_lit');
    const type_occupation = searchParams.get('type_occupation');
    const date_debut = searchParams.get('date_debut');
    const date_fin = searchParams.get('date_fin');

    let sql = `
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
            WHEN LOWER(TRIM(COALESCE(ch.type_lit, 'simple'))) = 'double' THEN 2
            ELSE 1
          END AS capacity
        FROM lits l
        JOIN chambres ch ON ch.id = l.chambre_id
        LEFT JOIN (
          SELECT lit_id, COUNT(*)::int AS occupants_count
          FROM lit_occupants
          GROUP BY lit_id
        ) lo_counts ON lo_counts.lit_id = l.id
      )
      SELECT 
        bs.id,
        bs.numero,
        bs.chambre_id,
        ch.nom as chambre_nom,
        ch.type_lit,
        ch.logement_id,
        log.nom_logement,
        log.adresse as logement_adresse,
        log.ville,
        log.mixte_autorise,
        log.type_occupation_effectif as type_occupation,
        log.date_debut_contrat,
        log.date_fin_contrat
      FROM bed_state bs
      LEFT JOIN chambres ch ON bs.chambre_id = ch.id
      LEFT JOIN logements log ON ch.logement_id = log.id
      WHERE bs.occupants_count < bs.capacity
        AND COALESCE(log.est_actif, true) = true
        AND (log.date_debut_contrat IS NULL OR log.date_debut_contrat <= CURRENT_DATE)
        AND (log.date_fin_contrat IS NULL OR log.date_fin_contrat >= CURRENT_DATE)
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
      if (type_occupation === 'mixte') {
        sql += ` AND log.mixte_autorise = true`;
      } else if (type_occupation === 'fille') {
        sql += ` AND (log.type_occupation_effectif = 'F' OR log.mixte_autorise = true)`;
      } else if (type_occupation === 'garçon') {
        sql += ` AND (log.type_occupation_effectif = 'M' OR log.mixte_autorise = true)`;
      }
    }

    // Filtrer par dates si fournies
    if (date_debut && date_fin) {
      sql += `
        AND (
          -- Logement disponible toute l'année (pas de date_fin_contrat)
          log.date_fin_contrat IS NULL
          -- OU la période demandée est dans la période disponible du logement
          OR (
            (log.date_debut_contrat IS NULL OR log.date_debut_contrat <= $${paramIndex}::date)
            AND (log.date_fin_contrat IS NULL OR log.date_fin_contrat >= $${paramIndex + 1}::date)
          )
        )
      `;
      params.push(date_debut);
      params.push(date_fin);
      paramIndex += 2;
    }

    sql += ` ORDER BY log.ville, log.adresse, ch.nom, bs.numero`;

    const result = await query(sql, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/lits/recherche', method: 'GET' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la recherche' },
      { status: 500 }
    );
  }
};

export const GET = withReadAuth(getHandler);
