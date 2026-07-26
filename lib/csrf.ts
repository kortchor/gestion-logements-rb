/**
 * Gestion des tokens CSRF simples
 * Pour les requêtes POST/PUT/DELETE depuis le navigateur
 */

import crypto from 'crypto';

const csrfTokens = new Map<string, { token: string; createdAt: number }>();
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 heures

/**
 * Générer un token CSRF unique
 */
export function generateCSRFToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + TOKEN_EXPIRY;
  csrfTokens.set(token, { token, createdAt: expiresAt });
  return token;
}

/**
 * Vérifier si un token CSRF est valide
 */
export function verifyCSRFToken(token: string): boolean {
  const entry = csrfTokens.get(token);

  if (!entry) {
    return false;
  }

  // Vérifier l'expiration
  if (Date.now() > entry.createdAt) {
    csrfTokens.delete(token);
    return false;
  }

  return true;
}

/**
 * Supprimer un token après utilisation
 */
export function consumeCSRFToken(token: string): void {
  csrfTokens.delete(token);
}

/**
 * Nettoyer les anciens tokens (à exécuter périodiquement)
 */
export function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [token, entry] of csrfTokens.entries()) {
    if (now > entry.createdAt) {
      csrfTokens.delete(token);
    }
  }
}

// Nettoyer les tokens expirés toutes les heures
if (typeof global !== 'undefined') {
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
}

/**
 * Middleware pour vérifier le CSRF sur les mutations
 * À utiliser dans les routes POST/PUT/DELETE
 */
export function verifyCsrfMiddleware(request: Request): boolean {
  // GET, HEAD, OPTIONS n'ont pas besoin de CSRF
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }

  // Vérifier d'abord le token CSRF explicite si fourni.
  const token = request.headers.get('x-csrf-token');

  if (token) {
    return verifyCSRFToken(token);
  }

  // Fallback défensif: vérifier l'origine/referer/sec-fetch-site pour les requêtes navigateur.
  // Cela évite de casser les appels existants tout en bloquant les CSRF cross-site.
  try {
    const expectedOrigins = new Set<string>();
    expectedOrigins.add(new URL(request.url).origin);

    const appUrl = process.env.NEXTAUTH_URL;
    if (appUrl) {
      try {
        expectedOrigins.add(new URL(appUrl).origin);
      } catch {
        // Ignore invalid NEXTAUTH_URL format
      }
    }

    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) {
      try {
        const normalizedVercelUrl = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
        expectedOrigins.add(new URL(normalizedVercelUrl).origin);
      } catch {
        // Ignore invalid VERCEL_URL format
      }
    }

    const allowedByOrigin = (() => {
      const origin = request.headers.get('origin');
      if (!origin) {
        return false;
      }
      return expectedOrigins.has(origin);
    })();

    if (allowedByOrigin) {
      return true;
    }

    const referer = request.headers.get('referer');
    if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        if (expectedOrigins.has(refererOrigin)) {
          return true;
        }
      } catch {
        return false;
      }
    }

    // Certains navigateurs/proxys n'envoient pas toujours Origin/Referer.
    // Si la requête est explicitement same-origin ou same-site, on l'accepte.
    const fetchSite = request.headers.get('sec-fetch-site');
    if (fetchSite === 'same-origin' || fetchSite === 'same-site' || fetchSite === 'none') {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}
