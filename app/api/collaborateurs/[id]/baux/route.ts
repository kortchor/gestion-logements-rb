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

    // ✅ AMÉLIORATION : Requête SQL entièrement refactorisée pour être plus robuste et performante
    // en utilisant les fonctions d'agrégation JSON de PostgreSQL.
    const result = await query(
      `WITH CautionsAgregees AS (
        -- Agréger les cautions pour n'avoir qu'une ligne par bail_id
        SELECT
          bail_id,
          MAX(montant_caution) as montant_caution,
          MAX(statut_caution) as statut_caution,
          MAX(justificatif_caution_url) as justificatif_caution_url
        FROM cautions
        GROUP BY bail_id
      )
      SELECT
        b.id, b.date_debut, b.date_fin, b.participation_mensuelle, b.chambre_privée, b.signe,
        json_build_object(
          'id', l.id,
          'nom', COALESCE(l.nom_logement, 'N/A'),
          'adresse', COALESCE(l.adresse, 'N/A'),
          'photos_etat_lieux_entree', COALESCE(l.photos_etat_lieux_entree, '{}'::text[])
        ) as logement,
        json_build_object(
          'id', c.id,
          'nom', COALESCE(c.nom, 'N/A')
        ) as chambre,
        json_build_object(
          'id', li.id,
          'numero', COALESCE(li.numero, 'N/A')
        ) as lit,
        ca.montant_caution,
        ca.statut_caution,
        ca.justificatif_caution_url
      FROM baux AS b
      LEFT JOIN logements AS l ON b.logement_id = l.id
      LEFT JOIN chambres AS c ON b.chambre_id = c.id
      LEFT JOIN lits AS li ON b.lit_id = li.id
      LEFT JOIN CautionsAgregees AS ca ON b.id = ca.bail_id
      WHERE b.collaborateur_id = $1
      ORDER BY b.date_debut DESC`,
      [collaborateurId]
    );
    
    // ✅ Standardiser la réponse pour qu'elle corresponde aux attentes du front-end
    return NextResponse.json(
      { success: true, data: result.rows }, { status: 200 }
    );
  } catch (error) {
    console.error('❌ Erreur GET baux:', error);
    // ✅ CORRECTION : Standardiser la réponse d'erreur pour correspondre aux attentes du front-end
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de la récupération des baux' },
      { status: 500 }
    );
  }
}

// Exporter la méthode GET protégée par l'authentification
export const GET = withAuth(getBauxHandler, ['admin', 'super_admin', 'user']);