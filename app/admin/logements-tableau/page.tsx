'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

interface LogementGrouped {
  ville: string;
  logements: Array<{
    id: number;
    nom_logement: string;
    adresse: string;
    est_actif: boolean;
    occupants: Array<{ nom: string; contribution: number; date_debut: string | null; date_fin: string | null }>;
    nombre_occupants: number;
    nombre_lits: number;
    lits_libres: number;
  }>;
}

export default function LogementsTableauPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<LogementGrouped[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pagination, setPagination] = useState({ limit: 25, offset: 0, total: 0, hasMore: false });
  const [counts, setCounts] = useState({ total: 0, actifs: 0, villes: 0 });
  const [filter, setFilter] = useState<{ ville?: string; actif?: boolean }>({
    actif: true,
  });

  const fetchLogements = useCallback(async () => {
    try {
      setPageLoading(true);
      const params = new URLSearchParams();
      if (filter.ville) params.append('ville', filter.ville);
      if (filter.actif !== undefined) params.append('actif', filter.actif.toString());
      params.append('limit', String(pagination.limit));
      params.append('offset', String(pagination.offset));

      const response = await fetch(
        `/api/admin/logements/tableau?${params.toString()}`,
        { credentials: 'include' }
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setCounts({
          total: Number(result?.counts?.total || 0),
          actifs: Number(result?.counts?.actifs || 0),
          villes: Number(result?.counts?.villes || 0),
        });
        if (result?.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: Number(result.pagination.total || 0),
            hasMore: Boolean(result.pagination.hasMore),
          }));
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setPageLoading(false);
    }
  }, [filter, pagination.limit, pagination.offset]);

  useEffect(() => {
    fetchLogements();
  }, [fetchLogements]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, offset: 0 }));
  }, [filter.actif, filter.ville, pagination.limit]);

  const mergeGroupedData = (existing: LogementGrouped[], next: LogementGrouped[]) => {
    const map = new Map<string, LogementGrouped['logements']>();

    for (const group of existing) {
      map.set(group.ville, [...group.logements]);
    }

    for (const group of next) {
      const current = map.get(group.ville) || [];
      map.set(group.ville, [...current, ...group.logements]);
    }

    return Array.from(map.entries())
      .map(([ville, logements]) => ({ ville, logements }))
      .sort((a, b) => a.ville.localeCompare(b.ville, 'fr', { sensitivity: 'base' }));
  };

  const handleExport = async () => {
    try {
      setExporting(true);

      const params = new URLSearchParams();
      if (filter.ville) params.append('ville', filter.ville);
      if (filter.actif !== undefined) params.append('actif', filter.actif.toString());

      const exportLimit = 200;
      let exportOffset = 0;
      let hasMore = true;
      let fullData: LogementGrouped[] = [];

      while (hasMore) {
        params.set('limit', String(exportLimit));
        params.set('offset', String(exportOffset));

        const response = await fetch(`/api/admin/logements/tableau?${params.toString()}`, {
          credentials: 'include',
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result?.error || 'Erreur lors de la récupération des données d\'export');
        }

        fullData = mergeGroupedData(fullData, result.data || []);
        hasMore = Boolean(result?.pagination?.hasMore);
        exportOffset += exportLimit;

        if (!result?.pagination) {
          hasMore = false;
        }
      }

      const csvContent = fullData
        .map((group) => {
          let csv = `\n${group.ville.toUpperCase()}\n`;
          csv += 'Logement,Adresse,Occupants,Contributions,Dates baux,Lits,Libres,Statut\n';
          csv += group.logements
            .map((log) => {
              const occupantsStr = log.occupants
                .map(o => o.nom)
                .join('; ');
              const contributionsStr = log.occupants
                .map(o => o.contribution > 0 ? o.contribution.toFixed(2) : '')
                .filter(c => c)
                .join('; ');
              const bailDatesStr = log.occupants
                .map(o => {
                  const debut = o.date_debut ? o.date_debut.split('T')[0] : 'N/A';
                  const fin = o.date_fin ? o.date_fin.split('T')[0] : 'Indetermine';
                  return `${debut} -> ${fin}`;
                })
                .join('; ');
              return `"${log.nom_logement}","${log.adresse}","${occupantsStr || 'Libre'}","${contributionsStr}","${bailDatesStr}",${log.nombre_lits},${log.lits_libres},"${log.est_actif ? 'Actif' : 'Inactif'}"`;
            })
            .join('\n');
          return csv;
        })
        .join('\n');

      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `logements-tableau-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return (
      <div className="p-8 text-center text-red-600">
        ❌ Accès refusé. Administrateur requis.
      </div>
    );
  }

  const pageLogements = data.reduce((sum, group) => sum + group.logements.length, 0);
  const pageOccupants = data.reduce(
    (sum, group) =>
      sum +
      group.logements.reduce((subSum, log) => subSum + log.nombre_occupants, 0),
    0
  );
  const pageLibres = data.reduce(
    (sum, group) =>
      sum +
      group.logements.reduce((subSum, log) => subSum + log.lits_libres, 0),
    0
  );
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = pagination.total > 0 ? Math.ceil(pagination.total / pagination.limit) : 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold">🏘️ Tableau Logements</h1>
          <p className="text-gray-600 mt-2">Vue d&apos;ensemble de tous les logements par ville</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Statistiques */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-500 text-sm">Logements (filtre)</p>
            <p className="text-3xl font-bold text-blue-600">{counts.total}</p>
            <p className="text-xs text-gray-500 mt-1">Affichés: {pageLogements}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-500 text-sm">Occupants (page)</p>
            <p className="text-3xl font-bold text-green-600">{pageOccupants}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-500 text-sm">Lits libres (page)</p>
            <p className="text-3xl font-bold text-orange-600">{pageLibres}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-500 text-sm">Villes (filtre)</p>
            <p className="text-3xl font-bold text-purple-600">{counts.villes || data.length}</p>
          </div>
        </div>

        {/* Filtres et Export */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex justify-between items-center">
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrer par statut
              </label>
              <select
                value={filter.actif !== false ? 'actif' : 'tous'}
                onChange={(e) => {
                  if (e.target.value === 'actif') {
                    setFilter({ ...filter, actif: true });
                  } else {
                    setFilter({ actif: undefined });
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="actif">Actifs uniquement</option>
                <option value="tous">Tous</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Taille de page
              </label>
              <select
                value={pagination.limit}
                onChange={(e) => {
                  const nextLimit = parseInt(e.target.value, 10);
                  setPagination((prev) => ({ ...prev, limit: nextLimit, offset: 0 }));
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting || pageLoading}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            {exporting ? 'Export en cours...' : '📥 Exporter en CSV'}
          </button>
        </div>

        {/* Logements par Ville */}
        {pageLoading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : data.length > 0 ? (
          data.map((group) => (
            <div key={group.ville} className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-blue-500">
                📍 {group.ville}
              </h2>

              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Logement
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Adresse
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Occupants
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Baux
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Lits
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Libres
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Statut
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.logements.map((logement) => (
                        <tr
                          key={logement.id}
                          className="border-b hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-gray-900">
                            <Link
                              href={`/logements/${logement.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {logement.nom_logement}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {logement.adresse}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {logement.occupants.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {logement.occupants.map((occ, i) => (
                                  <div key={i} className="bg-blue-50 border border-blue-200 rounded px-2 py-1">
                                    <div className="text-blue-900 font-medium text-xs">{occ.nom}</div>
                                    <div className="text-blue-600 text-xs">💰 {occ.contribution.toFixed(2)}€</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                🟢 Libre
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {logement.occupants.length > 0 ? (
                              <div className="space-y-1">
                                {logement.occupants.map((occ, i) => {
                                  const debut = occ.date_debut ? occ.date_debut.split('T')[0] : 'N/A';
                                  const fin = occ.date_fin ? occ.date_fin.split('T')[0] : 'Indéterminé';
                                  return (
                                    <div key={i} className="text-xs">
                                      {debut} → {fin}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Aucun bail actif</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium">
                            {logement.nombre_lits}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                logement.lits_libres > 0
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {logement.lits_libres}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                logement.est_actif
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {logement.est_actif ? '✅ Actif' : '❌ Inactif'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500 bg-white rounded-lg">
            Aucun logement trouvé
          </div>
        )}

        <div className="mt-6 bg-white p-4 rounded-lg shadow flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {currentPage} / {totalPages} - {counts.total} logements au total
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination((prev) => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
              disabled={pageLoading || pagination.offset === 0}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50"
            >
              Precedent
            </button>
            <button
              onClick={() => setPagination((prev) => ({ ...prev, offset: prev.offset + prev.limit }))}
              disabled={pageLoading || !pagination.hasMore}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
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
