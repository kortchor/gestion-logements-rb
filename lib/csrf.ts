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

  // Vérifier le token dans le header ou le body
  const token = 
    request.headers.get('x-csrf-token') ||
    (request instanceof Request && request.body ? (request.body as any)?.csrf_token : null);

  if (!token) {
    return false;
  }

  return verifyCSRFToken(token);
}
