'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

interface AuditEntry {
  id: number;
  user_id: number;
  user_email: string;
  prenom: string;
  nom: string;
  action: string;
  entity_type: string;
  entity_id: number;
  changes: Record<string, unknown> | null;
  ip_address: string;
  created_at: string;
}

export default function AuditTrailPage() {
  const { user, loading } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<{
    entity_type?: string;
    action?: string;
    user_email?: string;
    start_date?: string;
    end_date?: string;
  }>({});

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filter.entity_type) params.append('entity_type', filter.entity_type);
    if (filter.action) params.append('action', filter.action);
    if (filter.user_email) params.append('user_email', filter.user_email);
    if (filter.start_date) params.append('start_date', filter.start_date);
    if (filter.end_date) params.append('end_date', filter.end_date);
    return params;
  }, [filter]);

  const fetchAuditTrail = useCallback(async () => {
    try {
      setPageLoading(true);
      setError(null);
      const params = buildFilterParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      const response = await fetch(`/api/admin/audit-trail?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setEntries(data.data);
        setTotal(data.total);
      } else {
        setEntries([]);
        setTotal(0);
        setError(data?.error || 'Impossible de charger le suivi des actions.');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setEntries([]);
      setTotal(0);
      setError(error instanceof Error ? error.message : 'Erreur de chargement du suivi des actions.');
    } finally {
      setPageLoading(false);
    }
  }, [buildFilterParams, page, pageSize]);

  useEffect(() => {
    fetchAuditTrail();
  }, [fetchAuditTrail]);

  const handleExportCsv = async () => {
    try {
      const params = buildFilterParams();
      params.append('format', 'csv');

      const response = await fetch(`/api/admin/audit-trail?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Export CSV impossible pour le moment.');
      }

      const csvText = await response.text();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Erreur export CSV.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="p-8 text-center text-red-600">
        ❌ Accès refusé. Super administrateur requis.
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold">📋 Suivi des Actions</h1>
          <p className="text-gray-600 mt-2">Historique complet de toutes les actions effectuées par les administrateurs</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            ❌ {error}
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-bold mb-4">Filtres</h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type d&apos;entité</label>
              <select
                value={filter.entity_type || ''}
                onChange={(e) => {
                  setFilter({ ...filter, entity_type: e.target.value || undefined });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous</option>
                <option value="collaborateur">Collaborateur</option>
                <option value="logement">Logement</option>
                <option value="lit">Lit</option>
                <option value="bail">Bail</option>
                <option value="signalement">Signalement</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
              <select
                value={filter.action || ''}
                onChange={(e) => {
                  setFilter({ ...filter, action: e.target.value || undefined });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes</option>
                <option value="create">Création</option>
                <option value="update">Modification</option>
                <option value="delete">Suppression</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email utilisateur</label>
              <input
                type="text"
                value={filter.user_email || ''}
                onChange={(e) => {
                  setFilter({ ...filter, user_email: e.target.value || undefined });
                  setPage(1);
                }}
                placeholder="Filtrer par email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date début</label>
              <input
                type="date"
                value={filter.start_date || ''}
                onChange={(e) => {
                  setFilter({ ...filter, start_date: e.target.value || undefined });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date fin</label>
              <input
                type="date"
                value={filter.end_date || ''}
                onChange={(e) => {
                  setFilter({ ...filter, end_date: e.target.value || undefined });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">&nbsp;</label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setFilter({});
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Réinitialiser
                </button>
                <button
                  onClick={handleExportCsv}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {total} action(s) enregistrée(s)
            </p>
            <p className="text-sm text-gray-500">
              Page {page} / {totalPages || 1}
            </p>
          </div>

          {pageLoading ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : entries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Heure</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entité</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Détails</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">
                          {entry.prenom} {entry.nom}
                        </div>
                        <div className="text-xs text-gray-500">{entry.user_email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          entry.action === 'create' ? 'bg-green-100 text-green-800' :
                          entry.action === 'update' ? 'bg-blue-100 text-blue-800' :
                          entry.action === 'delete' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.action === 'create' ? '➕ Création' :
                           entry.action === 'update' ? '✏️ Modification' :
                           entry.action === 'delete' ? '🗑️ Suppression' :
                           entry.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="font-medium">{entry.entity_type}</div>
                        {entry.entity_id && <div className="text-xs text-gray-500">ID: {entry.entity_id}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {entry.changes ? (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:underline">Voir les modifications</summary>
                            <pre className="text-xs bg-gray-100 p-2 mt-2 rounded overflow-auto max-h-40">
                              {JSON.stringify(entry.changes, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{entry.ip_address || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              Aucune action enregistrée
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Précédent
              </button>
              <span className="text-sm text-gray-600">
                Page {page} sur {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant →
              </button>
            </div>
          )}
        </div>

        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-block px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
          >
            ← Retour au dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
