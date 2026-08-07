import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { logError } from '@/lib/logger';
import { logApiTransferMetrics } from '@/lib/api-transfer-metrics';

const getHandler = async (_request: NextRequest, _payload: TokenPayload) => {
  const startedAt = Date.now();
  void _request;
  void _payload;
  try {
    const result = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM logements) AS total_logements,
        (SELECT COUNT(*)::int FROM logements WHERE COALESCE(est_actif, true) = true) AS logements_actifs,
        (SELECT COUNT(*)::int FROM collaborateurs) AS total_collaborateurs,
        (SELECT COUNT(*)::int FROM collaborateurs WHERE COALESCE(est_actif, true) = true) AS collaborateurs_actifs,
        (SELECT COUNT(*)::int FROM baux) AS total_baux,
        (
          SELECT COUNT(*)::int
          FROM baux
          WHERE date_debut <= CURRENT_DATE
            AND (date_fin IS NULL OR date_fin >= CURRENT_DATE)
        ) AS baux_encours
    `);

    const row = result.rows[0] || {};
    const payload = {
      success: true,
      data: {
        totalLogements: Number(row.total_logements || 0),
        logementActifs: Number(row.logements_actifs || 0),
        totalCollaborateurs: Number(row.total_collaborateurs || 0),
        collaborateursActifs: Number(row.collaborateurs_actifs || 0),
        baux: Number(row.total_baux || 0),
        bauxEncours: Number(row.baux_encours || 0),
      },
    };

    logApiTransferMetrics('/api/dashboard/stats', payload, { startedAt });
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/dashboard/stats', method: 'GET' });
    }
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement des statistiques dashboard' },
      { status: 500 }
    );
  }
};

export const GET = withAuth(getHandler, ['admin', 'super_admin', 'user']);
