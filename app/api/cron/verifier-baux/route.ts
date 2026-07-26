import { NextRequest, NextResponse } from 'next/server';
import logger, { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function fetchWithTimeout(url: string, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { cache: 'no-store', signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callAlertEndpoint(baseUrl: string, jours: number, type: string, label: string) {
  const endpoint = `${baseUrl}/api/email/alerte-fin-bail?jours=${jours}&type=${type}`;
  const response = await fetchWithTimeout(endpoint);

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Endpoint ${label} en echec (${response.status}): ${payload.slice(0, 200)}`);
  }

  const data = await response.json();
  return { type: label, ...data };
}

export async function GET(request: NextRequest) {
  try {
    const host = request.headers.get('host');
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const runtimeBaseUrl = host ? `${protocol}://${host}` : null;
    const baseUrl = process.env.NEXTAUTH_URL || runtimeBaseUrl || 'http://localhost:3000';
    const results = [];

    // 1. Alerte 1 mois avant (30 jours)
    logger.info({ route: '/api/cron/verifier-baux', step: '30_days' }, 'Envoi des alertes 1 mois avant');
    results.push(await callAlertEndpoint(baseUrl, 30, 'premiere', '1 mois (30j)'));

    // 2. Alerte 2 semaines avant (14 jours)
    logger.info({ route: '/api/cron/verifier-baux', step: '14_days' }, 'Envoi des alertes 2 semaines avant');
    results.push(await callAlertEndpoint(baseUrl, 14, 'relance', '2 semaines (14j)'));

    // 3. Alerte 1 semaine avant (7 jours)
    logger.info({ route: '/api/cron/verifier-baux', step: '7_days' }, 'Envoi des alertes 1 semaine avant');
    results.push(await callAlertEndpoint(baseUrl, 7, 'derniere', '1 semaine (7j)'));

    // 4. Alerte quotidienne (1 jour avant)
    logger.info({ route: '/api/cron/verifier-baux', step: '1_day' }, 'Envoi des alertes quotidiennes');
    results.push(await callAlertEndpoint(baseUrl, 1, 'quotidienne', '1 jour (1j)'));

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/cron/verifier-baux' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de l\'exécution du cron' },
      { status: 500 }
    );
  }
}