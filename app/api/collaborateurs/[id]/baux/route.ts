import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collaborateurId = parseInt(params.id, 10);

    if (isNaN(collaborateurId)) {
      return NextResponse.json({ error: 'ID de collaborateur invalide' }, { status: 400 });
    }

    console.log('📋 Récupération des baux pour le collaborateur:', collaborateurId);

    // Requête simplifiée qui ne plante pas même si des colonnes manquent
    const result = await query(
      `SELECT
         b.*,
         COALESCE(l.nom, 'Logement sans nom') as logement_nom,
         COALESCE(l.adresse, 'Adresse non renseignée') as logement_adresse,
         COALESCE(c.nom, 'Chambre sans nom') as chambre_nom,
         COALESCE(li.numero, 'N/A') as lit_numero,
         ca.montant as montant_caution,
         ca.statut as statut_caution,
         ca.justificatif_url as justificatif_caution_url
      FROM baux b
      LEFT JOIN logements l ON b.logement_id = l.id
      LEFT JOIN chambres c ON b.chambre_id = c.id
      LEFT JOIN lits li ON b.lit_id = li.id
      LEFT JOIN cautions ca ON b.id = ca.bail_id
      WHERE b.collaborateur_id = $1
      ORDER BY b.date_debut DESC`,
      [collaborateurId]
    );

    console.log('📋 Baux trouvés:', result.rows.length);
    // ✅ Standardiser la réponse pour qu'elle corresponde aux attentes du front-end
    return NextResponse.json(
      { success: true, data: result.rows }, { status: 200 }
    );
  } catch (error) {
    console.error('❌ Erreur GET baux:', error);
    // En cas d'erreur, on retourne un tableau vide plutôt qu'une erreur 500
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des baux' },
      { status: 500 }
    );
  }
}