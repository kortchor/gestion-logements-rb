import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { TokenPayload } from './auth';

type ApiHandler = (
  request: NextRequest,
  payload: TokenPayload,
  context: { params: { [key: string]: string | string[] | undefined } }
) => Promise<NextResponse>;

export function withAuth(handler: ApiHandler, allowedRoles: string[]) {
  return async (request: NextRequest, context: { params: { [key: string]: string | string[] | undefined } }) => {
    try {
      // ✅ DÉBALLER LA PROMESSE
      const params = context.params ? await context.params : {};
      
      const token = request.cookies.get('token')?.value;

      if (!token) {
        return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
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
      if (error instanceof Error && (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')) {
        return NextResponse.json({ success: false, error: 'Token invalide ou expiré.' }, { status: 401 });
      }
      return NextResponse.json({ success: false, error: 'Erreur interne du serveur.' }, { status: 500 });
    }
  };
}

export function withSuperAdminAuth(handler: ApiHandler) {
  // ✅ Simplification : withSuperAdminAuth est maintenant un cas particulier de withAuth
  return withAuth(handler, ['super_admin']);
}