import { NextRequest, NextResponse } from 'next/server';
import { TokenPayload, verifyToken } from './auth';
import { logAudit } from './audit';

type Params = { [key: string]: string | string[] | undefined };

type ApiHandler = (
  request: NextRequest,
  payload: TokenPayload,
  context: { params: Params }
) => Promise<NextResponse>;

function isWriteMethod(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

function actionFromMethod(method: string): string {
  if (method === 'POST') return 'create';
  if (method === 'PUT' || method === 'PATCH') return 'update';
  if (method === 'DELETE') return 'delete';
  return 'unknown';
}

function inferEntityType(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const apiIdx = segments.indexOf('api');
  if (apiIdx === -1 || !segments[apiIdx + 1]) {
    return 'unknown';
  }

  if (segments[apiIdx + 1] === 'admin') {
    return segments[apiIdx + 2] || 'admin';
  }

  return segments[apiIdx + 1];
}

function inferEntityId(pathname: string): number | undefined {
  const segments = pathname.split('/').filter(Boolean);
  for (const segment of segments) {
    const parsed = parseInt(segment, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

/**
 * @description Protège une route API par authentification et vérification des rôles.
 * Les rôles autorisés peuvent être 'admin', 'super_admin', 'user', 'admin_readonly'.
 */
export function withAuth(handler: ApiHandler, allowedRoles?: string[]) {
  return async (request: NextRequest, context?: { params?: Promise<Params> }) => {
    try {
      // Lire le token depuis le cookie OU depuis le header Authorization (fallback)
      let token = request.cookies.get('token')?.value;
      
      if (!token) {
        const authHeader = request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.slice(7);
        }
      }

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

      // Vérifier que admin_readonly ne tente pas une écriture (POST, PUT, DELETE)
      if (payload.role === 'admin_readonly' && !isReadOnlyAllowed(request.method)) {
        return NextResponse.json({ success: false, error: 'Accès refusé. Ce profil est en lecture seule.' }, { status: 403 });
      }

      const resolvedParams = context?.params ? await context.params : {};
      const response = await handler(request, payload, { params: resolvedParams });

      if (isWriteMethod(request.method) && response.status < 400) {
        const pathname = request.nextUrl.pathname;
        const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;

        await logAudit({
          userId: payload.id,
          userEmail: payload.email,
          action: actionFromMethod(request.method),
          entityType: inferEntityType(pathname),
          entityId: inferEntityId(pathname),
          changes: {
            method: request.method,
            path: pathname,
          },
          ipAddress,
        });
      }

      return response;
    } catch (error) {
      console.error('Erreur withAuth:', error);
      if (error instanceof Error && (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')) {
        return NextResponse.json({ success: false, error: 'Token invalide ou expiré.' }, { status: 401 });
      }
      return NextResponse.json({ success: false, error: 'Erreur interne du serveur.' }, { status: 500 });
    }
  };
}

/**
 * Vérifie si la méthode HTTP est autorisée pour un admin_readonly
 */
function isReadOnlyAllowed(method: string): boolean {
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
}

/**
 * Helper pour les routes GET en lecture seule (accessible à admin_readonly)
 */
export function withReadAuth(handler: ApiHandler) {
  return withAuth(handler, ['admin', 'super_admin', 'admin_readonly', 'user']);
}

/**
 * Helper pour les routes d'écriture (accessible à admin et super_admin uniquement)
 */
export function withWriteAuth(handler: ApiHandler) {
  return withAuth(handler, ['admin', 'super_admin']);
}

export function withSuperAdminAuth(handler: ApiHandler) {
  return withAuth(handler, ['super_admin']);
}
