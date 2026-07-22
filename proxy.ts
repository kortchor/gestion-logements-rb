import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { logRequest } from '@/lib/logger';

// ✅ Routes publiques (sans authentification)
const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/setup', // ✅ Autoriser l'accès à la route d'initialisation
  '/signature', // ✅ Autoriser l'accès public à la page de signature
];

// ✅ Routes réservées aux admins (Admin et Super Admin)
const ADMIN_ROUTES = [
  '/dashboard',
  '/logements',
  '/collaborateurs',
  '/recherche',
  '/admin/lits',
  '/admin/modeles',
];

// ✅ Routes réservées aux Super Admin
const SUPER_ADMIN_ROUTES = [
  '/admin/users',
  '/admin/technicien',
];
 
// ✅ Routes pour tous les utilisateurs connectés (y compris 'user')
const USER_ROUTES = [
  '/mon-logement',
];

/**
 * Ajoute les headers de sécurité à la réponse
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // 🔒 Content Security Policy (CSP)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:;"
  );

  // Empêcher le clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Empêcher le MIME-sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // XSS Protection (pour IE/Edge)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (anciennement Feature-Policy)
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );

  // HSTS (HTTPS Strict Transport Security) - uniquement en production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}
 
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const startTime = Date.now();

  console.log('🛡️ [Proxy] Path:', pathname);

  // Ignorer les assets statiques
  if (pathname.startsWith('/_next') || pathname.startsWith('/public')) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // ✅ Routes publiques - accès libre
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    console.log('✅ [Proxy] Route publique');
    const response = NextResponse.next();
    const duration = Date.now() - startTime;
    logRequest(request.method, pathname, 200, duration);
    return addSecurityHeaders(response);
  }

  // ✅ Récupérer le token depuis le cookie
  const token = request.cookies.get('token')?.value;

  console.log('🔑 [Proxy] Token:', token ? '✅ Présent' : '❌ Absent');

  // Si pas de token, rediriger vers login
  if (!token) {
    console.log('🔀 [Proxy] Redirection vers /login');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    const duration = Date.now() - startTime;
    logRequest(request.method, pathname, 302, duration);
    const response = NextResponse.redirect(loginUrl);
    return addSecurityHeaders(response);
  }

  // ✅ VÉRIFIER LA SIGNATURE DU TOKEN (Correctif de sécurité majeur)
  try {
    const payload = await verifyToken(token);
    if (!payload) {
      console.error('❌ [Proxy] Token invalide ou expiré');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      const duration = Date.now() - startTime;
      logRequest(request.method, pathname, 401, duration);
      const response = NextResponse.redirect(loginUrl);
      return addSecurityHeaders(response);
    }

    console.log('👤 [Proxy] Utilisateur:', payload.email, 'Rôle:', payload.role);
    const userRole = payload.role;
    const isSuperAdminRoute = SUPER_ADMIN_ROUTES.some(route => pathname.startsWith(route));
    const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));

    switch (userRole) {
      case 'super_admin':
        // Le Super Admin a accès à tout
        break;
      case 'admin':
      case 'admin_readonly':
        // L'Admin (et admin_readonly) ne peut pas accéder aux routes Super Admin
        if (isSuperAdminRoute) {
          console.log('⛔ [Proxy] Accès refusé (Super Admin requis) pour:', pathname);
          const duration = Date.now() - startTime;
          logRequest(request.method, pathname, 403, duration);
          const response = NextResponse.redirect(new URL('/', request.url));
          return addSecurityHeaders(response);
        }
        break;
      case 'user':
      default:
        // Les utilisateurs simples ne peuvent accéder qu'à leurs routes
        if (isAdminRoute || isSuperAdminRoute) {
          console.log('⛔ [Proxy] Accès refusé (Admin requis) pour:', pathname);
          const duration = Date.now() - startTime;
          logRequest(request.method, pathname, 403, duration);
          const response = NextResponse.redirect(new URL('/', request.url));
          return addSecurityHeaders(response);
        }
        break;
    }

    const duration = Date.now() - startTime;
    logRequest(request.method, pathname, 200, duration);
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('❌ [Proxy] Erreur lors de la vérification du token:', error);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    const duration = Date.now() - startTime;
    logRequest(request.method, pathname, 500, duration);
    const response = NextResponse.redirect(loginUrl);
    return addSecurityHeaders(response);
  }
}

export const config = {
  matcher: [
    /*
     * Exclure les chemins qui commencent par :
     * - api (routes API)
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico (icône)
     * - public (fichiers publics)
     * Inclure tous les autres chemins.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
