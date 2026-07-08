import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

// Ce handler est exécuté uniquement si le token est valide (grâce à withAuth)
const getMeHandler = async (request: NextRequest, payload: TokenPayload) => {
  // Le payload du token contient déjà toutes les informations de l'utilisateur.
  // On le renvoie simplement au client.
  return NextResponse.json({ success: true, user: payload });
};

// On protège la route avec withAuth.
// N'importe quel utilisateur connecté peut y accéder.
export const GET = withAuth(getMeHandler);