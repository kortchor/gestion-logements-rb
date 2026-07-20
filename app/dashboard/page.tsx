'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalLogements: number;
  logementActifs: number;
  totalCollaborateurs: number;
  collaborateursActifs: number;
  baux: number;
  bauxEncours: number;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [logements, collaborateurs, baux] = await Promise.all([
          fetch('/api/logements').then(r => r.json()),
          fetch('/api/collaborateurs').then(r => r.json()),
          fetch('/api/baux').then(r => r.json()).catch(() => ({ baux: [] })),
        ]);

        const bauxEncours = baux.baux?.filter((b: any) => {
          const now = new Date();
          const debut = new Date(b.date_debut);
          const fin = new Date(b.date_fin);
          return debut <= now && now <= fin;
        }).length || 0;

        setStats({
          totalLogements: logements.length || 0,
          logementActifs: logements.filter((l: any) => l.est_actif).length || 0,
          totalCollaborateurs: collaborateurs.length || 0,
          collaborateursActifs: collaborateurs.filter((c: any) => c.est_actif).length || 0,
          baux: baux.baux?.length || 0,
          bauxEncours,
        });
      } catch (err) {
        setError('Erreur lors du chargement des statistiques');
        console.error(err);
      } finally {
        setStatsLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role === 'user') {
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
            {error}
          </div>
        )}

        {statsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : stats ? (
          <>
            {/* Grille de statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Logements */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Logements</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalLogements}</p>
                    <p className="text-sm text-green-600 mt-1">
                      {stats.logementActifs} actif{stats.logementActifs > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-5xl">🏠</div>
                </div>
              </div>

              {/* Collaborateurs */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Collaborateurs</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCollaborateurs}</p>
                    <p className="text-sm text-green-600 mt-1">
                      {stats.collaborateursActifs} actif{stats.collaborateursActifs > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-5xl">👥</div>
                </div>
              </div>

              {/* Baux */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Baux</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.baux}</p>
                    <p className="text-sm text-blue-600 mt-1">
                      {stats.bauxEncours} en cours
                    </p>
                  </div>
                  <div className="text-5xl">📋</div>
                </div>
              </div>
            </div>

            {/* Liens d'action */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/logements" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition no-underline group">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">🏠 Gérer les logements</h3>
                <p className="text-gray-600 text-sm mt-2">Ajouter, modifier ou supprimer des logements</p>
              </Link>

              <Link href="/collaborateurs" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition no-underline group">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">👥 Gérer les collaborateurs</h3>
                <p className="text-gray-600 text-sm mt-2">Ajouter, modifier ou gérer les collaborateurs</p>
              </Link>

              <Link href="/recherche" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition no-underline group">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">🔍 Rechercher</h3>
                <p className="text-gray-600 text-sm mt-2">Rechercher un collaborateur ou un logement</p>
              </Link>

              <Link href="/admin/modeles" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition no-underline group">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">📄 Modèles</h3>
                <p className="text-gray-600 text-sm mt-2">Consulter les modèles de conventions</p>
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
