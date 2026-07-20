import { NextRequest, NextResponse } from 'next/server';
import { logRequest } from '@/lib/logger';

/**
 * Middleware de sécurité pour ajouter les headers et logs
 * À configurer dans next.config.js
 */
export function middleware(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const path = requestUrl.pathname;

  // Ignorer les assets statiques
  if (path.startsWith('/_next') || path.startsWith('/public')) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // 🔒 Headers de sécurité
  // Content Security Policy (CSP)
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

  // Log la requête (simplifié)
  const startTime = Date.now();
  const duration = Date.now() - startTime;
  logRequest(request.method, path, 200, duration);

  return response;
}

// Configuration du middleware
export const config = {
  matcher: [
    /*
     * Matcher toutes les routes sauf:
     * - api (handling separate)
     * - _next/static
     * - _next/image
     * - favicon.ico
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
