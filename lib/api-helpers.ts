import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';

type AuthenticatedRequestHandler = (
  request: NextRequest,
  payload: TokenPayload,
  context: { params?: { [key: string]: string } }
) => Promise<NextResponse>;

export function withAuth(handler: AuthenticatedRequestHandler, allowedRoles?: string[]) {
  return async (request: NextRequest, context: { params?: { [key: string]: string } }) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé. Rôle non autorisé.' }, { status: 403 });
    }

    return handler(request, payload, context);
  };
}

export function withSuperAdminAuth(handler: AuthenticatedRequestHandler) {
  return async (request: NextRequest, context: { params?: { [key: string]: string } }) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    if (payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé. Super Admin uniquement.' }, { status: 403 });
    }

    return handler(request, payload, context);
  };
}