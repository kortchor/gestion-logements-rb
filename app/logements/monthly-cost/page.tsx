'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

interface LogementCout {
  id: number;
  nom_logement: string;
  adresse: string;
  ville: string;
  prix_loyer: number;
  date_debut_contrat: string;
  date_fin_contrat: string | null;
  cout_loyer_mois: number;
}

interface GroupeVille {
  ville: string;
  logements: LogementCout[];
  sousTotal: number;
}

interface MonthlyCostData {
  mois: string;
  date: string;
  totalCout: number;
  logements: LogementCout[];
  groupedByVille: GroupeVille[];
}

export default function MonthlyCostPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<MonthlyCostData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchCoutMensuel();
  }, [selectedDate]);

  const fetchCoutMensuel = async () => {
    try {
      setPageLoading(true);
      const [year, month] = selectedDate.split('-');
      const response = await fetch(
        `/api/logements/monthly-cost?year=${year}&month=${month}`,
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold">💰 Coût Mensuel des Loyers</h1>
          <p className="text-gray-600 mt-2">Calcul du coût total des loyers pour une période donnée</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Sélecteur de mois */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Sélectionner le mois
          </label>
          <div className="flex gap-4 items-center">
            <input
              type="month"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              onClick={() => {
                const today = new Date();
                setSelectedDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Aujourd'hui
            </button>
          </div>
        </div>

        {pageLoading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : data ? (
          <>
            {/* Résumé */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{data.mois}</h2>
              <p className="text-gray-600 mb-4">Coût total pour cette période</p>
              <div className="text-5xl font-bold text-green-600">
                {data.totalCout.toFixed(2)}€
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Pour {data.logements.length} logement(s) actif(s)
              </p>
            </div>

            {/* Détails par ville */}
            {data.groupedByVille.map((groupe) => (
              <div key={groupe.ville} className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-blue-500">
                  📍 {groupe.ville}
                </h3>

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
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Loyer mensuel
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Dates contrat
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Coût mois
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupe.logements.map((log) => (
                          <tr key={log.id} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">
                              <Link
                                href={`/logements/${log.id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {log.nom_logement}
                              </Link>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {log.adresse}
                            </td>
                            <td className="px-6 py-4 text-center font-medium text-gray-900">
                              {log.prix_loyer.toFixed(2)}€
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-600">
                              <div className="text-xs">
                                {log.date_debut_contrat && log.date_debut_contrat.split('T')[0]}
                              </div>
                              <div className="text-xs text-gray-500">
                                {log.date_fin_contrat ? `→ ${log.date_fin_contrat.split('T')[0]}` : '→ Indéterminé'}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-green-600">
                              {log.cout_loyer_mois.toFixed(2)}€
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                        <tr>
                          <td colSpan={4} className="px-6 py-3 font-bold text-gray-900 text-right">
                            Sous-total {groupe.ville}:
                          </td>
                          <td className="px-6 py-3 text-right font-bold text-blue-600">
                            {groupe.sousTotal.toFixed(2)}€
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="bg-blue-900 text-white rounded-lg p-6 flex justify-between items-center">
              <div>
                <p className="text-blue-100 mb-2">Coût total pour {data.mois}</p>
                <p className="text-4xl font-bold">{data.totalCout.toFixed(2)}€</p>
              </div>
              <div className="text-6xl opacity-20">💰</div>
            </div>
          </>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">Aucun logement actif pour cette période.</p>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors inline-block"
          >
            ← Retour au dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
