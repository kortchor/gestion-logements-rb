import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// ✅ Routes publiques (sans authentification)
const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/setup', // ✅ Autoriser l'accès à la route d'initialisation
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
 
export async function proxy(request: NextRequest) {
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

  console.log('🛡️ [Middleware] Path:', pathname);

  // ✅ Routes publiques - accès libre
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    console.log('✅ [Middleware] Route publique');
    return NextResponse.next();
  }

  // ✅ Récupérer le token depuis le cookie
  const token = request.cookies.get('token')?.value;

  console.log('🔑 [Middleware] Token:', token ? '✅ Présent' : '❌ Absent');

  // Si pas de token, rediriger vers login
  if (!token) {
    console.log('🔀 [Middleware] Redirection vers /login');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ✅ VÉRIFIER LA SIGNATURE DU TOKEN (Correctif de sécurité majeur)
  try {
    const payload = await verifyToken(token);
    if (!payload) {
      console.error('❌ [Middleware] Token invalide ou expiré');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    console.log('👤 [Middleware] Utilisateur:', payload.email, 'Rôle:', payload.role);
    const userRole = payload.role;

    // ✅ Vérification des permissions pour les routes SUPER_ADMIN
    if (SUPER_ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
      if (userRole !== 'super_admin') {
        console.log('⛔ [Middleware] Accès refusé (Super Admin requis) pour:', pathname);
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    // ✅ Vérification des permissions pour les routes ADMIN
    if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
      if (userRole !== 'super_admin' && userRole !== 'admin') {
        console.log('⛔ [Middleware] Accès refusé (Admin requis) pour:', pathname);
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('❌ [Middleware] Erreur lors de la vérification du token:', error);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
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
