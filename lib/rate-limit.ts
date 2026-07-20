/**
 * Système de rate limiting simple (en mémoire pour développement)
 * Pour la production, utiliser Redis
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number; // Fenêtre de temps en ms
  maxRequests: number; // Nombre max de requêtes dans la fenêtre
}

/**
 * Middleware de rate limiting simple
 * @param identifier - Clé unique (ex: email, IP)
 * @param config - Configuration du rate limiting
 * @returns true si la requête est autorisée, false si limite dépassée
 */
export function checkRateLimit(identifier: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  // Première requête ou fenêtre expirée
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return true;
  }

  // Incrémenter le compteur
  entry.count += 1;

  // Vérifier si la limite est dépassée
  if (entry.count > config.maxRequests) {
    return false;
  }

  return true;
}

/**
 * Nettoyer les anciennes entrées du map (exécuter périodiquement)
 */
export function cleanupRateLimitMap(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Nettoyer les anciennes entrées toutes les 5 minutes
if (typeof global !== 'undefined') {
  setInterval(cleanupRateLimitMap, 5 * 60 * 1000);
}

/**
 * Configuration de rate limiting pour le login (5 tentatives par 15 minutes)
 */
export const LOGIN_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 tentatives
};
