import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger, { logError } from '@/lib/logger';
import { ensureLitOccupantsTable } from '@/lib/lit-occupants-schema';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await ensureLitOccupantsTable();
    logger.debug({ route: '/api/logements/disponibles' }, 'API /api/logements/disponibles appelee');

    // Ne retourner que les logements actifs au sens contrat + statut actif.
    const result = await query(`
      SELECT
        l.id, l.nom_logement, l.adresse, l.ville, l.type_occupation_effectif,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', c.id,
            'nom', c.nom,
            'type_lit', c.type_lit,
            'lits', COALESCE(lits_agg.lits, '[]'::jsonb)
          )
        ) FILTER (WHERE c.id IS NOT NULL) as chambres
      FROM logements l
      LEFT JOIN chambres c ON l.id = c.logement_id
      LEFT JOIN (
        SELECT
          lit_rows.chambre_id,
          jsonb_agg(
            jsonb_build_object(
              'id', lit_rows.id,
              'numero', lit_rows.numero,
              'est_occupe', lit_rows.occupants_count >= lit_rows.capacity,
              'occupants_count', lit_rows.occupants_count,
              'capacity', lit_rows.capacity
            )
            ORDER BY lit_rows.numero
          ) AS lits
        FROM (
          SELECT
            l.id,
            l.numero,
            l.chambre_id,
            CASE
              WHEN LOWER(TRIM(COALESCE(ch.type_lit, 'simple'))) = 'double' THEN 2
              ELSE 1
            END AS capacity,
            COALESCE(
              lo_counts.occupants_count,
              CASE WHEN l.collaborateur_id IS NOT NULL THEN 1 ELSE 0 END
            ) AS occupants_count
          FROM lits l
          JOIN chambres ch ON ch.id = l.chambre_id
          LEFT JOIN (
            SELECT lit_id, COUNT(*)::int AS occupants_count
            FROM lit_occupants
            GROUP BY lit_id
          ) AS lo_counts ON lo_counts.lit_id = l.id
        ) AS lit_rows
        GROUP BY lit_rows.chambre_id
      ) as lits_agg ON c.id = lits_agg.chambre_id
      WHERE COALESCE(l.est_actif, true) = true
        AND l.date_debut_contrat IS NOT NULL
        AND l.date_debut_contrat <= CURRENT_DATE
        AND (l.date_fin_contrat IS NULL OR l.date_fin_contrat >= CURRENT_DATE)
      GROUP BY l.id, l.nom_logement, l.adresse, l.ville, l.type_occupation_effectif
      ORDER BY l.ville, l.adresse;
    `);

    logger.debug(
      { route: '/api/logements/disponibles', count: result.rows.length },
      'Resultat logements disponibles'
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/logements/disponibles', method: 'GET' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des logements' },
      { status: 500 }
    );
  }
}