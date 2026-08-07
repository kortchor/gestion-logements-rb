'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

interface DbSummary {
  database_name: string;
  database_size: string;
  active_connections: number;
  commits: number;
  rollbacks: number;
  cache_hit_ratio_pct: number;
}

interface KeyTableStat {
  table_name: string;
  live_rows: number;
  seq_scan: number;
  idx_scan: number;
  index_usage_pct: number;
  inserted_rows: number;
  updated_rows: number;
  deleted_rows: number;
  total_size: string;
  last_vacuum: string | null;
  last_autovacuum: string | null;
  last_analyze: string | null;
  last_autoanalyze: string | null;
}

interface IndexStat {
  table_name: string;
  index_name: string;
  idx_scan: number;
  index_size: string;
}

interface DbHealthResponse {
  success: boolean;
  generatedAt?: string;
  data?: {
    database: DbSummary | null;
    keyTables: KeyTableStat[];
    indexes: IndexStat[];
    recommendations: string[];
  };
  error?: string;
}

interface TrendSnapshot {
  timestamp: string;
  cacheHitRatioPct: number;
  activeConnections: number;
  criticalTables: number;
}

const TREND_STORAGE_KEY = 'db-health-trend-v1';
const TREND_MAX_POINTS = 20;
const RUNBOOK_STORAGE_KEY = 'db-health-runbook-v1';

const RUNBOOK_STEPS = [
  {
    id: 'snapshot',
    title: 'Prendre un snapshot DB health',
    detail: 'Capturer les metriques actuelles et exporter JSON/CSV pour reference.',
  },
  {
    id: 'critical',
    title: 'Verifier les tables critiques',
    detail: 'Prioriser les tables avec seq_scan eleve et index usage faible.',
  },
  {
    id: 'analyze',
    title: 'Executer ANALYZE sur tables ciblees',
    detail: 'Utiliser le fichier SQL check-list exporte depuis cette page.',
  },
  {
    id: 'explain',
    title: 'Lancer EXPLAIN ANALYZE',
    detail: 'Valider les plans des endpoints sensibles apres maintenance.',
  },
  {
    id: 'verify',
    title: 'Verifier tendance post-correction',
    detail: 'Confirmer l amelioration via cache hit ratio et alertes reduites.',
  },
] as const;

export default function DbHealthPage() {
  const { user, loading } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<DbHealthResponse['data'] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [trend, setTrend] = useState<TrendSnapshot[]>([]);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [exportState, setExportState] = useState<'idle' | 'json' | 'csv' | 'sql'>('idle');
  const [runbookState, setRunbookState] = useState<Record<string, boolean>>({});
  const [runbookCopyState, setRunbookCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const fetchHealth = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setPageLoading(true);
      }

      setError(null);
      const response = await fetch('/api/admin/perf/db-health', { credentials: 'include' });
      const result: DbHealthResponse = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Impossible de charger les metriques DB');
      }

      setPayload(result.data);
      setGeneratedAt(result.generatedAt || new Date().toISOString());

      const tableRows = result.data.keyTables || [];
      const criticalCount = tableRows.filter((table) => {
        const hasHeavySeqScan = Number(table.seq_scan || 0) > Number(table.idx_scan || 0) * 2;
        const lowIndexUsage = Number(table.index_usage_pct || 0) < 40;
        return hasHeavySeqScan && lowIndexUsage;
      }).length;

      const nextSnapshot: TrendSnapshot = {
        timestamp: result.generatedAt || new Date().toISOString(),
        cacheHitRatioPct: Number(result.data.database?.cache_hit_ratio_pct || 0),
        activeConnections: Number(result.data.database?.active_connections || 0),
        criticalTables: criticalCount,
      };

      setTrend((prev) => {
        const next = [...prev, nextSnapshot].slice(-TREND_MAX_POINTS);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(TREND_STORAGE_KEY, JSON.stringify(next));
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement des metriques DB');
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'super_admin') {
      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(TREND_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as TrendSnapshot[];
            if (Array.isArray(parsed)) {
              setTrend(parsed.slice(-TREND_MAX_POINTS));
            }
          }

          const runbookRaw = window.localStorage.getItem(RUNBOOK_STORAGE_KEY);
          if (runbookRaw) {
            const parsedRunbook = JSON.parse(runbookRaw) as Record<string, boolean>;
            if (parsedRunbook && typeof parsedRunbook === 'object') {
              setRunbookState(parsedRunbook);
            }
          }
        } catch {
          // Ignore local cache parse errors.
        }
      }
      fetchHealth();
    } else {
      setPageLoading(false);
    }
  }, [user]);

  const criticalTables = useMemo(() => {
    if (!payload?.keyTables) return [];

    return payload.keyTables.filter((table) => {
      const hasHeavySeqScan = Number(table.seq_scan || 0) > Number(table.idx_scan || 0) * 2;
      const lowIndexUsage = Number(table.index_usage_pct || 0) < 40;
      return hasHeavySeqScan && lowIndexUsage;
    });
  }, [payload]);

  const trendPoints = useMemo(() => {
    if (trend.length === 0) return '';
    const width = 100;
    const height = 32;
    const values = trend.map((item) => item.cacheHitRatioPct);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = Math.max(max - min, 1);

    return trend
      .map((item, index) => {
        const x = (index / Math.max(trend.length - 1, 1)) * width;
        const y = height - ((item.cacheHitRatioPct - min) / span) * height;
        return `${x},${y}`;
      })
      .join(' ');
  }, [trend]);

  const runbookProgress = useMemo(() => {
    const done = RUNBOOK_STEPS.filter((step) => runbookState[step.id]).length;
    const total = RUNBOOK_STEPS.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, total, pct };
  }, [runbookState]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(RUNBOOK_STORAGE_KEY, JSON.stringify(runbookState));
    }
  }, [runbookState]);

  const copyReport = async () => {
    if (!payload) return;

    const report = {
      generatedAt,
      database: payload.database,
      criticalTables,
      recommendations: payload.recommendations,
      keyTables: payload.keyTables,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1600);
    } catch {
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2000);
    }
  };

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    if (!payload) return;

    setExportState('json');
    const report = {
      generatedAt,
      database: payload.database,
      criticalTables,
      recommendations: payload.recommendations,
      keyTables: payload.keyTables,
      indexes: payload.indexes,
      trend,
    };
    const fileName = `db-health-report-${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(JSON.stringify(report, null, 2), fileName, 'application/json;charset=utf-8;');
    setTimeout(() => setExportState('idle'), 1200);
  };

  const exportCsv = () => {
    if (!payload) return;

    setExportState('csv');
    const escape = (value: string | number | null | undefined) => {
      const normalized = String(value ?? '');
      return `"${normalized.replace(/"/g, '""')}"`;
    };

    const lines: string[] = [];
    lines.push('section,table_name,index_name,metric,value,generated_at');

    lines.push([
      escape('database'),
      '',
      '',
      escape('database_name'),
      escape(payload.database?.database_name || ''),
      escape(generatedAt || ''),
    ].join(','));
    lines.push([
      escape('database'),
      '',
      '',
      escape('database_size'),
      escape(payload.database?.database_size || ''),
      escape(generatedAt || ''),
    ].join(','));
    lines.push([
      escape('database'),
      '',
      '',
      escape('cache_hit_ratio_pct'),
      escape(payload.database?.cache_hit_ratio_pct ?? ''),
      escape(generatedAt || ''),
    ].join(','));

    for (const table of payload.keyTables || []) {
      lines.push([escape('table'), escape(table.table_name), '', escape('live_rows'), escape(table.live_rows), escape(generatedAt || '')].join(','));
      lines.push([escape('table'), escape(table.table_name), '', escape('seq_scan'), escape(table.seq_scan), escape(generatedAt || '')].join(','));
      lines.push([escape('table'), escape(table.table_name), '', escape('idx_scan'), escape(table.idx_scan), escape(generatedAt || '')].join(','));
      lines.push([escape('table'), escape(table.table_name), '', escape('index_usage_pct'), escape(table.index_usage_pct), escape(generatedAt || '')].join(','));
      lines.push([escape('table'), escape(table.table_name), '', escape('total_size'), escape(table.total_size), escape(generatedAt || '')].join(','));
    }

    for (const idx of payload.indexes || []) {
      lines.push([escape('index'), escape(idx.table_name), escape(idx.index_name), escape('idx_scan'), escape(idx.idx_scan), escape(generatedAt || '')].join(','));
      lines.push([escape('index'), escape(idx.table_name), escape(idx.index_name), escape('index_size'), escape(idx.index_size), escape(generatedAt || '')].join(','));
    }

    const fileName = `db-health-report-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(`\ufeff${lines.join('\n')}`, fileName, 'text/csv;charset=utf-8;');
    setTimeout(() => setExportState('idle'), 1200);
  };

  const exportSqlChecklist = () => {
    if (!payload) return;

    setExportState('sql');
    const dateLabel = generatedAt ? new Date(generatedAt).toISOString() : new Date().toISOString();
    const lines: string[] = [];

    lines.push('-- DB Health SQL Checklist');
    lines.push(`-- Generated at: ${dateLabel}`);
    lines.push('-- Scope: targeted checks derived from monitoring alerts.');
    lines.push('');
    lines.push('-- 1) Global quick checks');
    lines.push("SELECT now() AS captured_at, current_database() AS db, pg_size_pretty(pg_database_size(current_database())) AS db_size;");
    lines.push('');
    lines.push('-- 2) Analyze flagged tables first');

    if (criticalTables.length === 0) {
      lines.push('-- No critical table currently flagged by the monitor.');
      lines.push("ANALYZE VERBOSE logements;");
      lines.push("ANALYZE VERBOSE baux;");
      lines.push("ANALYZE VERBOSE collaborateurs;");
    } else {
      for (const table of criticalTables) {
        lines.push(`ANALYZE VERBOSE ${table.table_name};`);
      }
    }

    lines.push('');
    lines.push('-- 3) Inspect scan/index usage for tracked tables');
    lines.push("SELECT relname, n_live_tup, seq_scan, idx_scan, CASE WHEN (seq_scan + idx_scan)=0 THEN 0 ELSE ROUND((idx_scan::numeric / NULLIF(seq_scan + idx_scan,0)::numeric) * 100, 2) END AS index_usage_pct FROM pg_stat_user_tables WHERE relname IN ('logements','chambres','lits','lit_occupants','collaborateurs','baux','notifications') ORDER BY n_live_tup DESC;");
    lines.push('');
    lines.push('-- 4) Suggested EXPLAIN plans for critical endpoints');
    lines.push("EXPLAIN (ANALYZE, BUFFERS) SELECT b.id, b.date_debut, b.date_fin FROM baux b WHERE b.collaborateur_id = 123 ORDER BY b.date_debut DESC LIMIT 20;");
    lines.push("EXPLAIN (ANALYZE, BUFFERS) SELECT log.id, log.ville FROM logements log WHERE COALESCE(log.est_actif, true)=true ORDER BY log.ville, log.nom_logement LIMIT 25 OFFSET 0;");
    lines.push("EXPLAIN (ANALYZE, BUFFERS) SELECT COUNT(*) FROM baux b WHERE b.date_debut <= CURRENT_DATE AND COALESCE(b.date_fin, CURRENT_DATE + INTERVAL '10 years') >= CURRENT_DATE;");
    lines.push('');
    lines.push('-- 5) Optional index usage details');
    lines.push("SELECT ui.relname AS table_name, ui.indexrelname AS index_name, ui.idx_scan, pg_size_pretty(pg_relation_size(ui.indexrelid)) AS index_size FROM pg_stat_user_indexes ui WHERE ui.relname IN ('logements','chambres','lits','lit_occupants','collaborateurs','baux','notifications') ORDER BY ui.relname, ui.idx_scan DESC;");

    const fileName = `db-health-checklist-${new Date().toISOString().slice(0, 10)}.sql`;
    downloadFile(lines.join('\n'), fileName, 'application/sql;charset=utf-8;');
    setTimeout(() => setExportState('idle'), 1200);
  };

  const toggleRunbookStep = (stepId: string) => {
    setRunbookState((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const resetRunbook = () => {
    setRunbookState({});
  };

  const copyRunbookStatus = async () => {
    const lines = RUNBOOK_STEPS.map((step, index) => {
      const marker = runbookState[step.id] ? '[x]' : '[ ]';
      return `${index + 1}. ${marker} ${step.title}`;
    });

    const summary = [
      `Runbook incident DB - progression ${runbookProgress.done}/${runbookProgress.total} (${runbookProgress.pct}%)`,
      ...lines,
      generatedAt ? `Derniere mesure: ${new Date(generatedAt).toLocaleString('fr-FR')}` : 'Derniere mesure: N/A',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      setRunbookCopyState('copied');
      setTimeout(() => setRunbookCopyState('idle'), 1500);
    } catch {
      setRunbookCopyState('error');
      setTimeout(() => setRunbookCopyState('idle'), 1500);
    }
  };

  if (loading || pageLoading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  if (!user || user.role !== 'super_admin') {
    return <div className="p-8 text-center text-red-600">Acces refuse. Super administrateur requis.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold">Monitoring Base de Donnees</h1>
          <p className="text-gray-600 mt-2">Sante PostgreSQL, usage index, scans et maintenance.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard" className="inline-flex items-center rounded-md bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400">
            Retour dashboard
          </Link>
          <button
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
            className="inline-flex items-center rounded-md bg-slate-700 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {refreshing ? 'Rafraichissement...' : 'Rafraichir'}
          </button>
          <button
            onClick={copyReport}
            disabled={!payload}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {copyState === 'copied' ? 'Rapport copie' : copyState === 'error' ? 'Echec copie' : 'Copier rapport'}
          </button>
          <button
            onClick={exportJson}
            disabled={!payload}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {exportState === 'json' ? 'JSON exporte' : 'Exporter JSON'}
          </button>
          <button
            onClick={exportCsv}
            disabled={!payload}
            className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {exportState === 'csv' ? 'CSV exporte' : 'Exporter CSV'}
          </button>
          <button
            onClick={exportSqlChecklist}
            disabled={!payload}
            className="inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {exportState === 'sql' ? 'SQL exporte' : 'Exporter SQL check-list'}
          </button>
        </div>

        {payload?.database && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Base</p>
              <p className="text-xl font-bold text-slate-800">{payload.database.database_name}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Taille</p>
              <p className="text-xl font-bold text-blue-700">{payload.database.database_size}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Connexions actives</p>
              <p className="text-xl font-bold text-emerald-700">{payload.database.active_connections}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Cache hit ratio</p>
              <p className="text-xl font-bold text-purple-700">{payload.database.cache_hit_ratio_pct}%</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Etat global</h2>
          <div className="text-sm text-gray-700 grid grid-cols-1 md:grid-cols-3 gap-2">
            <p>Commits: <strong>{payload?.database?.commits ?? 0}</strong></p>
            <p>Rollbacks: <strong>{payload?.database?.rollbacks ?? 0}</strong></p>
            <p>Genere le: <strong>{generatedAt ? new Date(generatedAt).toLocaleString('fr-FR') : 'N/A'}</strong></p>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Tendance locale cache hit ratio (20 derniers points)</p>
            {trend.length > 1 ? (
              <svg viewBox="0 0 100 32" className="h-12 w-full rounded border border-gray-200 bg-gray-50">
                <polyline
                  fill="none"
                  stroke="rgb(59 130 246)"
                  strokeWidth="1.5"
                  points={trendPoints}
                />
              </svg>
            ) : (
              <p className="text-xs text-gray-500">Pas assez de points pour afficher la tendance.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tables critiques</h2>
            <span className="text-sm text-gray-500">{payload?.keyTables?.length || 0} table(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">Table</th>
                  <th className="px-4 py-3 text-right">Rows</th>
                  <th className="px-4 py-3 text-right">Seq scan</th>
                  <th className="px-4 py-3 text-right">Idx scan</th>
                  <th className="px-4 py-3 text-right">Usage index</th>
                  <th className="px-4 py-3 text-right">Taille</th>
                </tr>
              </thead>
              <tbody>
                {(payload?.keyTables || []).map((row) => (
                  <tr key={row.table_name} className="border-b">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.table_name}</td>
                    <td className="px-4 py-3 text-right">{row.live_rows}</td>
                    <td className="px-4 py-3 text-right">{row.seq_scan}</td>
                    <td className="px-4 py-3 text-right">{row.idx_scan}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          row.index_usage_pct >= 70
                            ? 'bg-emerald-100 text-emerald-700'
                            : row.index_usage_pct >= 40
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {row.index_usage_pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{row.total_size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Alertes prioritaires</h2>
            {criticalTables.length === 0 ? (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-3">
                Aucun signal critique detecte sur les tables majeures.
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-red-700">
                {criticalTables.map((row) => (
                  <li key={row.table_name} className="bg-red-50 border border-red-200 rounded p-3">
                    {row.table_name}: seq_scan={row.seq_scan}, idx_scan={row.idx_scan}, usage={row.index_usage_pct}%
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Recommandations</h2>
            {(payload?.recommendations || []).length === 0 ? (
              <p className="text-sm text-gray-600">Aucune recommandation immediate.</p>
            ) : (
              <ul className="space-y-2 text-sm text-gray-700">
                {(payload?.recommendations || []).map((rec, idx) => (
                  <li key={idx} className="bg-slate-50 border border-slate-200 rounded p-3">{rec}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Runbook Incident DB</h2>
              <p className="text-sm text-gray-600">Checklist operationnelle pour investiguer et stabiliser rapidement.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">{runbookProgress.done}/{runbookProgress.total} ({runbookProgress.pct}%)</span>
              <button
                onClick={copyRunbookStatus}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-xs text-white hover:bg-indigo-700"
              >
                {runbookCopyState === 'copied' ? 'Statut copie' : runbookCopyState === 'error' ? 'Echec copie' : 'Copier statut'}
              </button>
              <button
                onClick={resetRunbook}
                className="inline-flex items-center rounded-md bg-gray-200 px-3 py-2 text-xs text-gray-800 hover:bg-gray-300"
              >
                Reinitialiser
              </button>
            </div>
          </div>

          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-emerald-500" style={{ width: `${runbookProgress.pct}%` }} />
          </div>

          <div className="space-y-2">
            {RUNBOOK_STEPS.map((step, index) => (
              <label key={step.id} className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                <input
                  type="checkbox"
                  checked={Boolean(runbookState[step.id])}
                  onChange={() => toggleRunbookStep(step.id)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">{index + 1}. {step.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{step.detail}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
