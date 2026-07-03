import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ✅ Routes publiques (sans authentification)
const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

// ✅ Routes API qui restent accessibles
const API_ROUTES = [
  '/api/notifications',
  '/api/lits',
  '/api/collaborateurs',
  '/api/logements',
  '/api/email',
  '/api/cron',
  '/api/admin/modeles',
  '/api/admin/lits',
  '/api/admin/users',
  '/api/admin/technicien',
  '/api/signalements',
];

// ✅ Routes réservées aux admins (Admin et Super Admin)
const ADMIN_ROUTES = [
  '/logements',
  '/collaborateurs',
  '/dashboard',
  '/recherche',
  '/admin/lits',
  '/admin/modeles',
];

// ✅ Routes réservées aux Super Admin
const SUPER_ADMIN_ROUTES = [
  '/admin/users',
  '/admin/technicien',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ Ignorer les fichiers statiques
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // ✅ Routes publiques - accès libre
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // ✅ Routes API - accès libre
  if (API_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // ✅ Récupérer le token depuis le header Authorization
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  // Si pas de token, rediriger vers login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ✅ Vérifier le token
  try {
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(atob(base64Payload));
    
    // ✅ Vérifier les permissions pour les routes admin
    if (ADMIN_ROUTES.some(route => pathname.startsWith(route)) && payload.role !== 'admin' && payload.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // ✅ Vérifier les permissions pour les routes Super Admin
    if (SUPER_ADMIN_ROUTES.some(route => pathname.startsWith(route)) && payload.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('❌ [Middleware] Token invalide');
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\..*).*)',
  ],
};