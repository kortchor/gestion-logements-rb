import logger from '@/lib/logger';

interface TransferMetricsOptions {
  startedAt?: number;
}

/**
 * Logs a lightweight payload-size metric to help detect transfer-heavy endpoints.
 */
export function logApiTransferMetrics(
  route: string,
  payload: unknown,
  options: TransferMetricsOptions = {}
): void {
  try {
    const json = JSON.stringify(payload);
    const bytes = Buffer.byteLength(json, 'utf8');
    const durationMs = options.startedAt ? Date.now() - options.startedAt : undefined;

    logger.info(
      {
        route,
        response_bytes: bytes,
        duration_ms: durationMs,
      },
      'API transfer metrics'
    );
  } catch (error) {
    if (error instanceof Error) {
      logger.warn(
        {
          route,
          message: error.message,
        },
        'Unable to compute API transfer metrics'
      );
    }
  }
}
