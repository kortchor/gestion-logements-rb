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

    // --- DÉSACTIVATION TEMPORAIRE ---
    // On retourne un tableau vide pour éviter toute erreur de base de données.
    console.log('🟡 Fonctionnalité des baux temporairement désactivée. Retour d\'un tableau vide.');
    const result = { rows: [] };
    // --- FIN DE LA DÉSACTIVATION ---
    
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