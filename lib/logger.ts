/**
 * Système de logging structuré avec Pino
 * Utilise des niveaux: debug, info, warn, error
 */

import pino from 'pino';

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;
const ALERT_MIN_INTERVAL_MS = Number.parseInt(process.env.ALERT_MIN_INTERVAL_MS || '30000', 10);
let lastAlertAt = 0;

function canSendAlertNow(): boolean {
  if (!ALERT_WEBHOOK_URL) return false;
  if (process.env.NODE_ENV !== 'production') return false;

  const now = Date.now();
  if (now - lastAlertAt < ALERT_MIN_INTERVAL_MS) {
    return false;
  }

  lastAlertAt = now;
  return true;
}

async function sendAlert(eventType: string, message: string, details?: Record<string, unknown>) {
  if (!canSendAlertNow()) return;

  try {
    await fetch(ALERT_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: 'gestion-logements-rb',
        environment: process.env.NODE_ENV,
        eventType,
        message,
        timestamp: new Date().toISOString(),
        details,
      }),
    });
  } catch (alertError) {
    logger.warn({ alertError, eventType }, 'Impossible d envoyer une alerte monitoring');
  }
}

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
export function logError(error: Error, context?: Record<string, unknown>) {
  logger.error({ error, ...context }, error.message);

  void sendAlert('error', error.message, {
    ...context,
    errorName: error.name,
    stack: error.stack?.split('\n').slice(0, 5).join('\n'),
  });
}

// Log la sécurité
export function logSecurityEvent(event: string, details?: Record<string, unknown>) {
  logger.warn({ event, ...details }, `🔒 Security: ${event}`);

  void sendAlert('security', event, details);
}

// Log les authentifications
export function logAuth(userId: number, email: string, action: string, success: boolean) {
  const level = success ? 'info' : 'warn';
  const emailForLogs = process.env.NODE_ENV === 'production' ? '[redacted]' : email;

  logger[level](
    { userId, email: emailForLogs, action, success },
    `🔐 Auth [${action}]: ${emailForLogs}`
  );

  if (!success) {
    void sendAlert('auth-failure', `Auth failed for action ${action}`, {
      userId,
      action,
      success,
    });
  }
}

export default logger;
