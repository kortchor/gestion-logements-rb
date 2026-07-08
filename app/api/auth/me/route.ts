import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

/**
 * API Route pour récupérer les informations de l'utilisateur actuellement connecté.
 * Le wrapper `withAuth` s'occupe de la vérification du token.
 */
const handler = async (request: NextRequest, payload: TokenPayload) => {
  // Si nous arrivons ici, le token est valide.
  // `payload` contient les données de l'utilisateur extraites du token.
  return NextResponse.json({ success: true, user: payload });
};

// On protège la route avec `withAuth`, sans spécifier de rôle, 
// ce qui signifie que tout utilisateur connecté peut y accéder.
export const GET = withAuth(handler);