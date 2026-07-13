import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('🟢 API /api/logements/disponibles appelée');

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

    console.log('🟢 Résultat:', result.rows.length, 'logements trouvés');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('❌ Erreur API logements disponibles:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des logements' },
      { status: 500 }
    );
  }
}