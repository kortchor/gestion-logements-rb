/**
 * Système de logging structuré avec Pino
 * Utilise des niveaux: debug, info, warn, error
 */

import pino from 'pino';

// Configuration du logger
const logger = pino(
  {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    transport: process.env.NODE_ENV === 'production' 
      ? undefined // JSON logs en production
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        },
  }
);

// Log les requêtes importantes
export function logRequest(method: string, path: string, status?: number, duration?: number) {
  if (status && status >= 400) {
    logger.warn({ method, path, status, duration }, `${method} ${path} - ${status}`);
  } else {
    logger.debug({ method, path, status, duration }, `${method} ${path}`);
  }
}

// Log les erreurs
export function logError(error: Error, context?: Record<string, any>) {
  logger.error({ error, ...context }, error.message);
}

// Log la sécurité
export function logSecurityEvent(event: string, details?: Record<string, any>) {
  logger.warn({ event, ...details }, `🔒 Security: ${event}`);
}

// Log les authentifications
export function logAuth(userId: number, email: string, action: string, success: boolean) {
  const level = success ? 'info' : 'warn';
  logger[level](
    { userId, email, action, success },
    `🔐 Auth [${action}]: ${email}`
  );
}

export default logger;
