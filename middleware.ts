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

// ✅ Routes réservées aux admins (Admin et Super Admin)
const ADMIN_ROUTES = [
  '/logements',
  '/collaborateurs',
  '/dashboard',
  '/recherche',
  '/admin/lits',
  '/admin/modeles',
  '/mon-logement',  // ✅ Ajouté pour les collaborateurs
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

  // ✅ Vérifier le token
  try {
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(atob(base64Payload));
    console.log('👤 [Middleware] Utilisateur:', payload.email, 'Rôle:', payload.role);

    // ✅ Vérifier les permissions pour les routes admin
    if (ADMIN_ROUTES.some(route => pathname.startsWith(route)) && payload.role !== 'admin' && payload.role !== 'super_admin') {
      console.log('⛔ [Middleware] Accès refusé: rôle insuffisant pour route admin');
      return NextResponse.redirect(new URL('/', request.url));
    }

    // ✅ Vérifier les permissions pour les routes Super Admin
    if (SUPER_ADMIN_ROUTES.some(route => pathname.startsWith(route)) && payload.role !== 'super_admin') {
      console.log('⛔ [Middleware] Accès refusé: rôle insuffisant pour route super admin');
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
}