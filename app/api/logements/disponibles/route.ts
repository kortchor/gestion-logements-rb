import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('🟢 API /api/logements/disponibles appelée');

    // Récupérer toutes les données (logements, chambres, lits) en une seule requête
    const result = await query(`
      SELECT 
        l.id as logement_id,
        l.nom_logement,
        l.type_occupation_effectif,
        l.adresse,
        c.id as chambre_id,
        c.nom as chambre_nom,
        li.id as lit_id,
        li.numero as lit_numero,
        li.est_occupe
      FROM logements l
      LEFT JOIN chambres c ON l.id = c.logement_id
      LEFT JOIN lits li ON c.id = li.chambre_id
      WHERE l.est_visible = true
      ORDER BY l.nom_logement, c.id, li.id
    `);

    const logementsMap = new Map();

    for (const row of result.rows) {
      if (!logementsMap.has(row.logement_id)) {
        logementsMap.set(row.logement_id, {
          id: row.logement_id,
          nom_logement: row.nom_logement || 'Logement sans nom',
          adresse: row.adresse || 'Adresse non renseignée',
          type_occupation_effectif: row.type_occupation_effectif,
          chambres: new Map(),
        });
      }

      const logement = logementsMap.get(row.logement_id);

      if (row.chambre_id && !logement.chambres.has(row.chambre_id)) {
        logement.chambres.set(row.chambre_id, {
          id: row.chambre_id,
          nom: row.chambre_nom || `Chambre ${row.chambre_id}`,
          lits: [],
        });
      }

      if (row.lit_id) {
        logement.chambres.get(row.chambre_id).lits.push({
          id: row.lit_id,
          numero: row.lit_numero || String(row.lit_id),
          est_occupe: row.est_occupe,
        });
      }
    }

    const logements = Array.from(logementsMap.values()).map(l => ({ ...l, chambres: Array.from(l.chambres.values()) }));

    console.log('🟢 Résultat:', logements.length, 'logements trouvés');
    return NextResponse.json(logements);
  } catch (error) {
    console.error('❌ Erreur API logements disponibles:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des logements' },
      { status: 500 }
    );
  }
}