import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withSuperAdminAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { logError } from '@/lib/logger';
import { logApiTransferMetrics } from '@/lib/api-transfer-metrics';

const KEY_TABLES = [
  'logements',
  'chambres',
  'lits',
  'lit_occupants',
  'collaborateurs',
  'baux',
  'notifications',
] as const;

const getHandler = async (_request: NextRequest, payload: TokenPayload) => {
  const startedAt = Date.now();
  void payload;

  try {
    const [dbResult, tableStatsResult, indexStatsResult] = await Promise.all([
      query(
        `SELECT
          current_database() AS database_name,
          pg_size_pretty(pg_database_size(current_database())) AS database_size,
          COALESCE(numbackends, 0)::int AS active_connections,
          COALESCE(xact_commit, 0)::bigint AS commits,
          COALESCE(xact_rollback, 0)::bigint AS rollbacks,
          CASE
            WHEN (blks_hit + blks_read) = 0 THEN 0::numeric
            ELSE ROUND((blks_hit::numeric / NULLIF(blks_hit + blks_read, 0)::numeric) * 100, 2)
          END AS cache_hit_ratio_pct
        FROM pg_stat_database
        WHERE datname = current_database()`
      ),
      query(
        `SELECT
          st.relname AS table_name,
          COALESCE(st.n_live_tup, 0)::bigint AS live_rows,
          COALESCE(st.seq_scan, 0)::bigint AS seq_scan,
          COALESCE(st.idx_scan, 0)::bigint AS idx_scan,
          CASE
            WHEN COALESCE(st.seq_scan, 0) + COALESCE(st.idx_scan, 0) = 0 THEN 0::numeric
            ELSE ROUND((st.idx_scan::numeric / NULLIF(st.seq_scan + st.idx_scan, 0)::numeric) * 100, 2)
          END AS index_usage_pct,
          COALESCE(st.n_tup_ins, 0)::bigint AS inserted_rows,
          COALESCE(st.n_tup_upd, 0)::bigint AS updated_rows,
          COALESCE(st.n_tup_del, 0)::bigint AS deleted_rows,
          pg_size_pretty(pg_total_relation_size(st.relid)) AS total_size,
          st.last_vacuum,
          st.last_autovacuum,
          st.last_analyze,
          st.last_autoanalyze
        FROM pg_stat_user_tables st
        WHERE st.relname = ANY($1::text[])
        ORDER BY pg_total_relation_size(st.relid) DESC`,
        [KEY_TABLES]
      ),
      query(
        `SELECT
          sui.relname AS table_name,
          sui.indexrelname AS index_name,
          COALESCE(sui.idx_scan, 0)::bigint AS idx_scan,
          pg_size_pretty(pg_relation_size(sui.indexrelid)) AS index_size
        FROM pg_stat_user_indexes sui
        WHERE sui.relname = ANY($1::text[])
        ORDER BY sui.relname, sui.idx_scan DESC`,
        [KEY_TABLES]
      ),
    ]);

    const tableStats = tableStatsResult.rows;
    const indexStats = indexStatsResult.rows;

    const recommendations = tableStats
      .filter((row) => Number(row.live_rows || 0) > 1000)
      .flatMap((row) => {
        const tableName = String(row.table_name);
        const seqScan = Number(row.seq_scan || 0);
        const idxScan = Number(row.idx_scan || 0);
        const indexUsagePct = Number(row.index_usage_pct || 0);
        const recs: string[] = [];

        if (seqScan > idxScan * 2 && seqScan > 50) {
          recs.push(`Table ${tableName}: seq_scan dominant (${seqScan} vs idx_scan ${idxScan}), verifier les index sur filtres frequents.`);
        }

        if (indexUsagePct < 40 && seqScan > 20) {
          recs.push(`Table ${tableName}: index_usage faible (${indexUsagePct}%), inspecter EXPLAIN ANALYZE des requetes critiques.`);
        }

        return recs;
      });

    const payloadResponse = {
      success: true,
      generatedAt: new Date().toISOString(),
      data: {
        database: dbResult.rows[0] || null,
        keyTables: tableStats,
        indexes: indexStats,
        recommendations,
      },
    };

    logApiTransferMetrics('/api/admin/perf/db-health', payloadResponse, { startedAt });
    return NextResponse.json(payloadResponse);
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/perf/db-health', method: 'GET' });
    }
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la recuperation des metriques DB' },
      { status: 500 }
    );
  }
};

export const GET = withSuperAdminAuth(getHandler);
