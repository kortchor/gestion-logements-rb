import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger, { logError } from '@/lib/logger';

export async function GET() {
  try {
    logger.debug({ route: '/api/logements/disponibles' }, 'API /api/logements/disponibles appelee');

    // ✅ AMÉLIORATION : Requête unique et performante utilisant l'agrégation JSON
    const result = await query(`
      SELECT
        l.id, l.nom_logement, l.adresse, l.ville, l.type_occupation_effectif,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', c.id,
            'nom', c.nom,
            'lits', COALESCE(lits_agg.lits, '[]'::jsonb)
          )
        ) FILTER (WHERE c.id IS NOT NULL) as chambres
      FROM logements l
      LEFT JOIN chambres c ON l.id = c.logement_id
      LEFT JOIN (
        SELECT chambre_id, jsonb_agg(jsonb_build_object('id', id, 'numero', numero, 'est_occupe', est_occupe)) as lits
        FROM lits
        GROUP BY chambre_id
      ) as lits_agg ON c.id = lits_agg.chambre_id
      WHERE l.est_visible = true -- Garder ce filtre important
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