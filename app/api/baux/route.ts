import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { logApiTransferMetrics } from '@/lib/api-transfer-metrics';

// ✅ GET - Récupérer tous les baux
export async function GET(request: Request) {
  const startedAt = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const view = (searchParams.get('view') || 'summary').toLowerCase();
    const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '100', 10), 500));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    let queryText = view === 'full'
      ? `SELECT 
          b.id,
          b.logement_id,
          b.collaborateur_id,
          b.date_debut,
          b.date_fin,
          b.participation_mensuelle,
          b.yousign_request_id,
          b.signature_link,
          b.created_at,
          c.nom,
          c.prenom,
          c.email,
          l.adresse,
          l.ville,
          l.prix_loyer
        FROM baux b
        LEFT JOIN collaborateurs c ON b.collaborateur_id = c.id
        LEFT JOIN logements l ON b.logement_id = l.id`
      : `SELECT 
          b.id,
          b.logement_id,
          b.collaborateur_id,
          b.date_debut,
          b.date_fin,
          b.participation_mensuelle,
          b.created_at
        FROM baux b`;

    const queryParams = [];

    if (id) {
      queryText += ' WHERE b.id = $1';
      queryParams.push(id);
    } else {
      queryText += ` ORDER BY b.date_fin DESC LIMIT $1 OFFSET $2`;
      queryParams.push(limit);
      queryParams.push(offset);
    }

    const [result, countResult] = await Promise.all([
      query(queryText, queryParams),
      id
        ? Promise.resolve({ rows: [{ total: 1, actifs: 0 }] })
        : query(
            `SELECT
               COUNT(*)::int AS total,
               COUNT(*) FILTER (
                 WHERE date_debut <= CURRENT_DATE
                   AND (date_fin IS NULL OR date_fin >= CURRENT_DATE)
               )::int AS actifs
             FROM baux`
          ),
    ]);

    const total = parseInt(countResult.rows[0]?.total || '0', 10);
    const actifs = parseInt(countResult.rows[0]?.actifs || '0', 10);
    const payload = {
      success: true,
      data: result.rows,
      baux: result.rows,
      counts: {
        total,
        actifs,
      },
      pagination: id
        ? undefined
        : {
            limit,
            offset,
            total,
            hasMore: offset + result.rows.length < total,
          },
    };
    logApiTransferMetrics('/api/baux', payload, { startedAt });
    
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/baux', method: 'GET' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}
