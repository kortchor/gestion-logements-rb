'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [logement, setLogement] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      window.location.href = '/login';
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchLogement(parsedUser.id, token);
    } catch (error) {
      console.error('Erreur:', error);
      window.location.href = '/login';
    }
    setLoading(false);
  }, []);

  const fetchLogement = async (userId: number, token: string) => {
    try {
      const response = await fetch(`/api/collaborateurs?id=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.data) {
        setLogement(data.data);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isSuperAdmin = user.role === 'super_admin';
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  const isSimpleUser = user.role === 'user';

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🏨 Les Roches Blanches</h1>
        <span className="text-sm text-gray-500">
          {isSuperAdmin ? '👑 Super Admin' : isAdmin ? '👤 Admin' : '👀 Utilisateur'}
        </span>
      </div>

      <p className="text-gray-600 mb-6">
        Bienvenue <strong>{user.prenom} {user.nom}</strong> 👋
      </p>

      {/* ✅ AFFICHAGE DU LOGEMENT - UNIQUEMENT POUR LES UTILISATEURS SIMPLES */}
      {isSimpleUser && (
        <>
          {logement && logement.logement_adresse ? (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h2 className="text-xl font-semibold mb-4">🏠 Mon logement</h2>
              <p><strong>Adresse :</strong> {logement.logement_adresse}</p>
              <p><strong>Ville :</strong> {logement.logement_ville}</p>
              <p><strong>Chambre :</strong> {logement.chambre_nom || '-'}</p>
              <p><strong>Lit :</strong> {logement.lit_numero || '-'}</p>
              {logement.participation_mensuelle && (
                <p><strong>💰 Participation :</strong> {parseFloat(logement.participation_mensuelle).toFixed(2)} €</p>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
              <p className="text-yellow-700">⚠️ Aucun logement assigné</p>
              <p className="text-sm text-yellow-600">Contactez la direction des ressources humaines.</p>
            </div>
          )}
        </>
      )}

      {/* ✅ ACCÈS ADMIN - Seuls les Admins et Super Admins voient ces liens */}
      {(isAdmin || isSuperAdmin) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a href="/logements" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold">🏠 Logements</h2>
            <p className="text-gray-600 text-sm">Gérer les logements</p>
          </a>
          <a href="/collaborateurs" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold">👥 Collaborateurs</h2>
            <p className="text-gray-600 text-sm">Gérer les collaborateurs</p>
          </a>
          <a href="/dashboard" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold">📊 Dashboard</h2>
            <p className="text-gray-600 text-sm">Voir les statistiques</p>
          </a>
        </div>
      )}

      {/* ✅ SECTION ADMIN - Uniquement pour Super Admin */}
      {isSuperAdmin && (
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h2 className="text-lg font-semibold text-yellow-800">👑 Administration</h2>
          <p className="text-sm text-yellow-700">Vous êtes Super Admin, vous avez accès à toutes les fonctionnalités.</p>
          <div className="mt-2 flex gap-4">
            <a href="/admin/users" className="text-sm text-blue-600 hover:underline">👥 Gestion des utilisateurs</a>
            <a href="/admin/technicien" className="text-sm text-blue-600 hover:underline">🔧 Gestion du technicien</a>
          </div>
        </div>
      )}
    </div>
  );
}