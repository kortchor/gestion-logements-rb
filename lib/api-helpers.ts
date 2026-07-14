import { NextRequest, NextResponse } from 'next/server';
import { TokenPayload, verifyToken } from './auth'; // ✅ CORRECTION: Importer verifyToken

type ApiHandler = (
  request: NextRequest,
  payload: TokenPayload,
  context: { params: { [key: string]: string | string[] | undefined } }
) => Promise<NextResponse>;

export function withAuth(handler: ApiHandler, allowedRoles: string[]) {
  return async (request: NextRequest, context: { params: { [key: string]: string | string[] | undefined } }) => {
    try {
      const token = request.cookies.get('token')?.value;

      if (!token) {
        return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
      }

      const payload = await verifyToken(token) as TokenPayload;
      
      if (!payload) {
        return NextResponse.json({ success: false, error: 'Token invalide' }, { status: 401 });
      }

      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
        return NextResponse.json({ success: false, error: 'Accès refusé. Rôle non autorisé.' }, { status: 403 });
      }

      return handler(request, payload, context);
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