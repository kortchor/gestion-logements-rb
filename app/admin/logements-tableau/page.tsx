'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

interface LogementGrouped {
  ville: string;
  logements: Array<{
    id: number;
    nom_logement: string;
    adresse: string;
    est_actif: boolean;
    occupants: Array<{ nom: string; contribution: number }>;
    nombre_occupants: number;
    nombre_lits: number;
    lits_libres: number;
  }>;
}

export default function LogementsTableauPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<LogementGrouped[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [filter, setFilter] = useState<{ ville?: string; actif?: boolean }>({
    actif: true,
  });

  useEffect(() => {
    fetchLogements();
  }, [filter]);

  const fetchLogements = async () => {
    try {
      setPageLoading(true);
      const params = new URLSearchParams();
      if (filter.ville) params.append('ville', filter.ville);
      if (filter.actif !== undefined) params.append('actif', filter.actif.toString());

      const response = await fetch(
        `/api/admin/logements/tableau?${params.toString()}`,
        { credentials: 'include' }
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setPageLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const csvContent = data
        .map((group) => {
          let csv = `\n${group.ville.toUpperCase()}\n`;
          csv += 'Logement,Adresse,Occupants,Contributions,Lits,Libres,Statut\n';
          csv += group.logements
            .map((log) => {
              const occupantsStr = log.occupants
                .map(o => o.nom)
                .join('; ');
              const contributionsStr = log.occupants
                .map(o => o.contribution > 0 ? o.contribution.toFixed(2) : '')
                .filter(c => c)
                .join('; ');
              return `"${log.nom_logement}","${log.adresse}","${occupantsStr || 'Libre'}","${contributionsStr}",${log.nombre_lits},${log.lits_libres},"${log.est_actif ? 'Actif' : 'Inactif'}"`;
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

  const totalLogements = data.reduce((sum, group) => sum + group.logements.length, 0);
  const totalOccupants = data.reduce(
    (sum, group) =>
      sum +
      group.logements.reduce((subSum, log) => subSum + log.nombre_occupants, 0),
    0
  );
  const totalLibres = data.reduce(
    (sum, group) =>
      sum +
      group.logements.reduce((subSum, log) => subSum + log.lits_libres, 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold">🏘️ Tableau Logements</h1>
          <p className="text-gray-600 mt-2">Vue d'ensemble de tous les logements par ville</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Statistiques */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-500 text-sm">Total Logements</p>
            <p className="text-3xl font-bold text-blue-600">{totalLogements}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-500 text-sm">Occupants</p>
            <p className="text-3xl font-bold text-green-600">{totalOccupants}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-500 text-sm">Lits Libres</p>
            <p className="text-3xl font-bold text-orange-600">{totalLibres}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-500 text-sm">Villes</p>
            <p className="text-3xl font-bold text-purple-600">{data.length}</p>
          </div>
        </div>

        {/* Filtres et Export */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex justify-between items-center">
          <div className="flex gap-4">
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
          </div>

          <button
            onClick={handleExport}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            📥 Exporter en CSV
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
                                    {occ.contribution > 0 && (
                                      <div className="text-blue-600 text-xs">💰 {occ.contribution.toFixed(2)}€</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                🟢 Libre
                              </span>
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
