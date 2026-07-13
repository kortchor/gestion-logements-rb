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

    // ✅ CORRECTION : Requête simplifiée et plus robuste pour éviter les erreurs de jointure complexes.
    // Les détails spécifiques (chambre, lit) seront chargés sur la page de détail du bail si nécessaire.
    const result = await query(
      `SELECT
        b.*,
        COALESCE(l.nom_logement, 'N/A') as logement_nom,
        COALESCE(l.adresse, 'N/A') as logement_adresse,
        COALESCE(c.nom, 'N/A') as chambre_nom,
        COALESCE(li.numero, 'N/A') as lit_numero,
      FROM baux AS b
      LEFT JOIN logements AS l ON b.logement_id = l.id
      LEFT JOIN chambres AS c ON b.chambre_id = c.id
      LEFT JOIN lits AS li ON b.lit_id = li.id
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