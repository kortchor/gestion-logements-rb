import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { logError } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token manquant' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = await verifyToken(token);
      if (!decoded) {
        return NextResponse.json(
          { error: 'Token invalide' },
          { status: 401 }
        );
      }

      return NextResponse.json({ success: true, user: decoded });
    } catch {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/auth/verify' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}