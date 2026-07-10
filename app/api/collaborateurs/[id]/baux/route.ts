import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

const getBauxHandler = async (
  request: NextRequest,
  payload: TokenPayload, // Le payload du token est maintenant disponible
  { params }: { params: { id: string } }
) => {
  try {
    const collaborateurId = parseInt(params.id, 10);

    if (isNaN(collaborateurId)) {
      return NextResponse.json({ error: 'ID de collaborateur invalide' }, { status: 400 });
    }

    console.log('📋 Récupération des baux pour le collaborateur:', collaborateurId);

    const result = await query(
      `SELECT
         b.*, 
         l.nom_logement as logement_nom,
         l.adresse as logement_adresse,
         c.nom as chambre_nom,
         li.numero as lit_numero,
         (SELECT montant_caution FROM cautions WHERE bail_id = b.id) as montant_caution,
         (SELECT statut_caution FROM cautions WHERE bail_id = b.id) as statut_caution,
         (SELECT justificatif_caution_url FROM cautions WHERE bail_id = b.id) as justificatif_caution_url
      FROM baux b
      LEFT JOIN logements l ON b.logement_id = l.id
      LEFT JOIN chambres c ON b.chambre_id = c.id
      LEFT JOIN lits li ON b.lit_id = li.id
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

// Exporter la méthode GET protégée par l'authentification
export const GET = withAuth(getBauxHandler, ['admin', 'super_admin', 'user']);