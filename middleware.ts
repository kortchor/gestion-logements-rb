import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes qui ne nécessitent pas d'authentification
const PUBLIC_ROUTES = ['/login', '/api/auth/login'];

// Routes réservées aux admins
const ADMIN_ROUTES = ['/admin', '/api/admin'];

// Routes réservées aux super admins
const SUPER_ADMIN_ROUTES = ['/admin/users'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Vérifier si c'est une route publique
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Récupérer le token depuis le cookie ou le header
  const token = request.cookies.get('token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');

  // Si pas de token, rediriger vers login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Vérifier le token (décodage simple)
  try {
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(atob(base64Payload));
    const { role } = payload;

    // Vérifier les permissions pour les routes admin
    if (ADMIN_ROUTES.some(route => pathname.startsWith(route)) && role !== 'admin' && role !== 'super_admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Vérifier les permissions pour les routes super admin
    if (SUPER_ADMIN_ROUTES.some(route => pathname.startsWith(route)) && role !== 'super_admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Token invalide
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};