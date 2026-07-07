import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('🟢 API /api/logements/disponibles appelée');

    // Récupérer les logements avec leurs chambres et lits
    const logementsResult = await query(`
      SELECT 
        l.id,
        l.nom_logement,
        l.adresse,
        l.ville
      FROM logements l
      WHERE l.est_visible = true
      ORDER BY l.nom_logement
    `);

    const result = [];

    for (const logement of logementsResult.rows) {
      // Récupérer les chambres de ce logement
      const chambresResult = await query(`
        SELECT 
          c.id,
          c.nom
        FROM chambres c
        WHERE c.logement_id = $1
        ORDER BY c.id
      `, [logement.id]);

      const chambres = [];

      for (const chambre of chambresResult.rows) {
        // Récupérer les lits de cette chambre
        const litsResult = await query(`
          SELECT 
            li.id,
            li.numero,
            li.est_occupe
          FROM lits li
          WHERE li.chambre_id = $1
          ORDER BY li.id
        `, [chambre.id]);

        chambres.push({
          id: chambre.id,
          nom: chambre.nom || `Chambre ${chambre.id}`,
          lits: litsResult.rows.map(lit => ({
            id: lit.id,
            numero: lit.numero || String(lit.id),
            est_occupe: lit.est_occupe
          }))
        });
      }

      result.push({
        id: logement.id,
        nom_logement: logement.nom_logement || 'Logement sans nom',
        adresse: logement.adresse || 'Adresse non renseignée',
        chambres: chambres
      });
    }

    console.log('🟢 Résultat:', result.length, 'logements trouvés');
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Erreur API logements disponibles:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des logements' },
      { status: 500 }
    );
  }
}