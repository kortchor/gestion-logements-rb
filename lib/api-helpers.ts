import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';

type AuthenticatedRequestHandler = (
  request: NextRequest,
  payload: TokenPayload,
  context: { params?: { [key: string]: string } }
) => Promise<NextResponse>;

export function withAuth(handler: AuthenticatedRequestHandler, allowedRoles?: string[]) {
  return async (request: NextRequest, context: { params?: Promise<{ [key: string]: string }> }) => {
    try {
      // ✅ DÉBALLER LA PROMESSE
      const params = context.params ? await context.params : {};
      
      const token = request.cookies.get('token')?.value;

      if (!token) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
      }

      const payload = await verifyToken(token);

      if (!payload) {
        return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
      }

      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
        return NextResponse.json({ error: 'Accès refusé. Rôle non autorisé.' }, { status: 403 });
      }

      return handler(request, payload, { params });
    } catch (error) {
      console.error('Erreur withAuth:', error);
      return NextResponse.json(
        { error: 'Erreur serveur' },
        { status: 500 }
      );
    }
  };
}

export function withSuperAdminAuth(handler: AuthenticatedRequestHandler) {
  return async (request: NextRequest, context: { params?: Promise<{ [key: string]: string }> }) => {
    try {
      const params = context.params ? await context.params : {};
      const token = request.cookies.get('token')?.value;
      const payload = token ? await verifyToken(token) : null;

      if (!payload) {
        return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
      }

      if (payload.role !== 'super_admin') {
        return NextResponse.json({ error: 'Accès refusé. Super Admin uniquement.' }, { status: 403 });
      }

      return handler(request, payload, { params });
    } catch (error) {
      console.error('Erreur withSuperAdminAuth:', error);
      return NextResponse.json(
        { error: 'Erreur serveur' },
        { status: 500 }
      );
    }
  };
}