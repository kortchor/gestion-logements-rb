import { NextRequest, NextResponse } from 'next/server';
import { TokenPayload, verifyToken } from './auth'; // ✅ CORRECTION: Importer verifyToken

type Params = { [key: string]: string | string[] | undefined };

type ApiHandler = (
  request: NextRequest,
  payload: TokenPayload,
  context: { params: Params }
) => Promise<NextResponse>;

export function withAuth(handler: ApiHandler, allowedRoles?: string[]) {
  // ✅ Compatible Next.js 15 : params est désormais une Promise
  return async (request: NextRequest, context: { params: Promise<Params> }) => {
    try {
      const token = request.cookies.get('token')?.value;

      if (!token) {
        return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
      }

      const payload = await verifyToken(token);
      
      if (!payload) {
        return NextResponse.json({ success: false, error: 'Token invalide' }, { status: 401 });
      }

      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
        return NextResponse.json({ success: false, error: 'Accès refusé. Rôle non autorisé.' }, { status: 403 });
      }

      // Résoudre la promesse params avant d'appeler le handler
      const resolvedParams = await context.params;
      return handler(request, payload, { params: resolvedParams });
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
