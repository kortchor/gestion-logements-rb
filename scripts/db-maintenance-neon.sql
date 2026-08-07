-- DB maintenance playbook for Neon / PostgreSQL
-- Run manually in a SQL console connected to production.
-- Goal: keep planner stats fresh and quickly inspect scan/index usage.

-- 1) Quick health snapshot
SELECT
  now() AS captured_at,
  current_database() AS database_name,
  pg_size_pretty(pg_database_size(current_database())) AS database_size;

SELECT
  schemaname,
  relname,
  n_live_tup,
  seq_scan,
  idx_scan,
  CASE
    WHEN (seq_scan + idx_scan) = 0 THEN 0
    ELSE ROUND((idx_scan::numeric / NULLIF(seq_scan + idx_scan, 0)::numeric) * 100, 2)
  END AS index_usage_pct,
  last_autoanalyze,
  last_autovacuum
FROM pg_stat_user_tables
WHERE relname IN ('logements', 'chambres', 'lits', 'lit_occupants', 'collaborateurs', 'baux', 'notifications')
ORDER BY n_live_tup DESC;

-- 2) Refresh planner statistics for critical tables
ANALYZE VERBOSE logements;
ANALYZE VERBOSE chambres;
ANALYZE VERBOSE lits;
ANALYZE VERBOSE lit_occupants;
ANALYZE VERBOSE collaborateurs;
ANALYZE VERBOSE baux;
ANALYZE VERBOSE notifications;

-- 3) Optional: inspect heaviest indexes
SELECT
  ui.relname AS table_name,
  ui.indexrelname AS index_name,
  ui.idx_scan,
  pg_size_pretty(pg_relation_size(ui.indexrelid)) AS index_size
FROM pg_stat_user_indexes ui
WHERE ui.relname IN ('logements', 'chambres', 'lits', 'lit_occupants', 'collaborateurs', 'baux', 'notifications')
ORDER BY pg_relation_size(ui.indexrelid) DESC
LIMIT 30;

-- 4) Optional: execution plan checks (run one by one)
-- EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM baux WHERE collaborateur_id = 123 ORDER BY date_debut DESC LIMIT 20;
-- EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM logements WHERE est_actif = true ORDER BY ville, nom_logement LIMIT 25;
