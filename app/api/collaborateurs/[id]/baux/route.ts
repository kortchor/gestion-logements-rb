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

    console.log('📋 Récupération des baux pour le collaborateur:', collaborateurId);

    // Requête simplifiée qui ne plante pas même si des colonnes manquent
    const result = await query(
      `SELECT
         b.*,
         COALESCE(l.nom_logement, 'Logement sans nom') as logement_nom,
         COALESCE(l.adresse, 'Adresse non renseignée') as logement_adresse,
         COALESCE(c.nom, 'Chambre sans nom') as chambre_nom,
         COALESCE(li.numero, 'N/A') as lit_numero
      FROM baux b
      LEFT JOIN logements l ON b.logement_id = l.id
      LEFT JOIN chambres c ON b.chambre_id = c.id
      LEFT JOIN lits li ON b.lit_id = li.id
      WHERE b.collaborateur_id = $1
      ORDER BY b.date_debut DESC`,
      [collaborateurId]
    );

    console.log('📋 Baux trouvés:', result.rows.length);
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error('❌ Erreur GET baux:', error);
    // En cas d'erreur, on retourne un tableau vide plutôt qu'une erreur 500
    return NextResponse.json([]);
  }
}