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
      `SELECT
        b.id, b.date_debut, b.date_fin, b.participation_mensuelle, b.chambre_privée, b.signe,
        json_build_object(
          'id', l.id,
          'nom', COALESCE(l.nom_logement, 'N/A'),
          'adresse', COALESCE(l.adresse, 'N/A'),
          'etat_lieux_photos', l.etat_lieux_photos
        ) as logement,
        json_build_object(
          'id', ch.id,
          'nom', COALESCE(ch.nom, 'N/A')
        ) as chambre,
        json_build_object(
          'id', lit.id,
          'numero', COALESCE(lit.numero, 'N/A')
        ) as lit
      FROM baux AS b
      LEFT JOIN logements AS l ON b.logement_id = l.id
      LEFT JOIN chambres AS ch ON b.chambre_id = ch.id
      LEFT JOIN lits AS lit ON b.lit_id = lit.id
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
