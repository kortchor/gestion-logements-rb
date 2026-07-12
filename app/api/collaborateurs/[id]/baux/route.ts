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

    // ✅ CORRECTION : Utilisation de CTE pour une requête plus robuste et lisible
    const result = await query(
      `WITH DerniereCaution AS (
        -- 1. Isoler la dernière caution pour chaque bail
        SELECT 
          bail_id,
          montant_caution,
          statut_caution,
          justificatif_caution_url
        FROM (
          SELECT 
            bail_id, montant_caution, statut_caution, justificatif_caution_url,
            ROW_NUMBER() OVER(PARTITION BY bail_id ORDER BY created_at DESC) as rn
          FROM cautions
        ) sub
        WHERE rn = 1
      )
      -- 2. Construire le résultat final en joignant les informations
      SELECT
        b.*,
        COALESCE(l.nom_logement, 'N/A') as logement_nom,
        COALESCE(l.adresse, 'N/A') as logement_adresse,
        COALESCE(c.nom, 'N/A') as chambre_nom,
        COALESCE(li.numero, 'N/A') as lit_numero,
        dc.montant_caution,
        dc.statut_caution,
        dc.justificatif_caution_url
      FROM baux AS b
      LEFT JOIN logements AS l ON b.logement_id = l.id
      LEFT JOIN chambres AS c ON b.chambre_id = c.id
      LEFT JOIN lits AS li ON b.lit_id = li.id
      LEFT JOIN DerniereCaution AS dc ON b.id = dc.bail_id
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