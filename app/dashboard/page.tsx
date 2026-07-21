'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardStats {
  totalLogements: number;
  logementActifs: number;
  totalCollaborateurs: number;
  collaborateursActifs: number;
  baux: number;
  bauxEncours: number;
}

interface CostData {
  totalCoutMois: number;
  mois: string;
}

interface CostByCenter {
  centre_analytique: string;
  coût_total: number;
  nombre_logements: number;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [costData, setCostData] = useState<CostData | null>(null);
  const [costByCenter, setCostByCenter] = useState<CostByCenter[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [costsLoading, setCostsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setStatsLoading(true);
        setError('');

        const [logementsRes, collaborateursRes, bauxRes, costsRes, costsByCenterRes] = await Promise.all([
          fetch('/api/logements').catch(err => {
            console.error('Erreur logements:', err);
            return new Response(JSON.stringify([]), { status: 500 });
          }),
          fetch('/api/collaborateurs').catch(err => {
            console.error('Erreur collaborateurs:', err);
            return new Response(JSON.stringify([]), { status: 500 });
          }),
          fetch('/api/baux').catch(err => {
            console.error('Erreur baux:', err);
            return new Response(JSON.stringify({ baux: [] }), { status: 500 });
          }),
          fetch('/api/dashboard/costs').catch(err => {
            console.error('Erreur coûts mensuels:', err);
            return new Response(JSON.stringify({ success: false }), { status: 500 });
          }),
          fetch('/api/dashboard/costs?type=by-center').catch(err => {
            console.error('Erreur coûts par centre:', err);
            return new Response(JSON.stringify({ success: false }), { status: 500 });
          }),
        ]);

        // Gérer les réponses avec try-catch
        let logements = [];
        let collaborateurs = [];
        let baux = [];
        let costs = null;
        let costsByCenter = [];

        try {
          const logementsData = await logementsRes.json();
          logements = logementsData.data || logementsData || [];
        } catch (e) {
          console.error('Erreur parsing logements:', e);
          logements = [];
        }

        try {
          const collaborateursData = await collaborateursRes.json();
          collaborateurs = collaborateursData.data || collaborateursData || [];
        } catch (e) {
          console.error('Erreur parsing collaborateurs:', e);
          collaborateurs = [];
        }

        try {
          const bauxData = await bauxRes.json();
          baux = bauxData.baux || bauxData.data || [];
        } catch (e) {
          console.error('Erreur parsing baux:', e);
          baux = [];
        }

        try {
          const costsResponse = await costsRes.json();
          if (costsResponse.success && costsResponse.data) {
            setCostData(costsResponse.data);
          }
        } catch (e) {
          console.error('Erreur parsing coûts mensuels:', e);
        }

        try {
          const costsCenterResponse = await costsByCenterRes.json();
          if (costsCenterResponse.success && Array.isArray(costsCenterResponse.data)) {
            setCostByCenter(costsCenterResponse.data);
          }
        } catch (e) {
          console.error('Erreur parsing coûts par centre:', e);
        }

        // Calculer les baux en cours
        const bauxEncours = baux.filter((b: any) => {
          try {
            const now = new Date();
            const debut = new Date(b.date_debut);
            const fin = new Date(b.date_fin);
            return debut <= now && now <= fin;
          } catch {
            return false;
          }
        }).length;

        setStats({
          totalLogements: Array.isArray(logements) ? logements.length : 0,
          logementActifs: Array.isArray(logements) ? logements.filter((l: any) => l.est_actif !== false).length : 0,
          totalCollaborateurs: Array.isArray(collaborateurs) ? collaborateurs.length : 0,
          collaborateursActifs: Array.isArray(collaborateurs) ? collaborateurs.filter((c: any) => c.est_actif !== false).length : 0,
          baux: Array.isArray(baux) ? baux.length : 0,
          bauxEncours,
        });
      } catch (err) {
        console.error('Erreur dashboard:', err);
        setError('Erreur lors du chargement des statistiques. Veuillez rafraîchir la page.');
        setStats(null);
      } finally {
        setStatsLoading(false);
        setCostsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'admin_readonly')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">❌ Accès refusé</h1>
          <p className="text-gray-600">Vous n'avez pas les permissions pour accéder au dashboard.</p>
          <Link href="/" className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">📊 Dashboard</h1>
          <p className="text-gray-600 mt-2">Bienvenue {user.prenom} {user.nom}</p>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            ❌ {error}
          </div>
        )}

        {statsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Carte Logements */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Logements</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalLogements}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.logementActifs} actifs</p>
                </div>
                <div className="text-4xl">🏠</div>
              </div>
            </div>

            {/* Carte Collaborateurs */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Collaborateurs</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalCollaborateurs}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.collaborateursActifs} actifs</p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
            </div>

            {/* Carte Baux */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Baux</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{stats.baux}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.bauxEncours} en cours</p>
                </div>
                <div className="text-4xl">📋</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            ⚠️ Impossible de charger les statistiques. Veuillez vérifier votre connexion.
          </div>
        )}

        {/* Graphiques de coûts */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Analyse des coûts</h2>
          
          {costsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coût mensuel total */}
              {costData && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Coût mensuel total</h3>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">
                      {costData.totalCoutMois.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                    <p className="text-sm text-gray-600">Somme des loyers actuels - {costData.mois}</p>
                  </div>
                </div>
              )}

              {/* Coûts par centre analytique */}
              {costByCenter.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Coûts par centre analytique</h3>
                  <div className="space-y-3">
                    {costByCenter.map((center) => (
                      <div key={center.centre_analytique} className="flex items-between justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-gray-800">{center.centre_analytique}</p>
                          <p className="text-xs text-gray-600">{center.nombre_logements} logements</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">
                            {center.coût_total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Graphique pie chart - répartition par centre */}
              {costByCenter.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Répartition des coûts</h3>
                  <div style={{ position: 'relative', height: '300px' }}>
                    <Pie
                      data={{
                        labels: costByCenter.map((c) => c.centre_analytique),
                        datasets: [
                          {
                            label: 'Coûts par centre',
                            data: costByCenter.map((c) => c.coût_total),
                            backgroundColor: [
                              '#3b82f6',
                              '#10b981',
                              '#f59e0b',
                              '#ef4444',
                              '#8b5cf6',
                              '#ec4899',
                            ],
                            borderColor: '#fff',
                            borderWidth: 2,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom' as const,
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/logements" className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg border border-blue-200 transition-colors no-underline">
              <p className="text-lg font-semibold text-blue-900">🏠</p>
              <p className="text-sm text-blue-700 mt-2">Gérer les logements</p>
            </Link>
            <Link href="/collaborateurs" className="bg-green-50 hover:bg-green-100 p-4 rounded-lg border border-green-200 transition-colors no-underline">
              <p className="text-lg font-semibold text-green-900">👥</p>
              <p className="text-sm text-green-700 mt-2">Gérer les collaborateurs</p>
            </Link>
            <Link href="/admin/modeles" className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg border border-purple-200 transition-colors no-underline">
              <p className="text-lg font-semibold text-purple-900">📄</p>
              <p className="text-sm text-purple-700 mt-2">Modèles de convention</p>
            </Link>
            <Link href="/" className="bg-gray-50 hover:bg-gray-100 p-4 rounded-lg border border-gray-200 transition-colors no-underline">
              <p className="text-lg font-semibold text-gray-900">📊</p>
              <p className="text-sm text-gray-700 mt-2">Retour à l'accueil</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
