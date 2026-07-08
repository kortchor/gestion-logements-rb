'use client';

import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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

      {/* ✅ ACCÈS ADMIN - Seuls les Admins et Super Admins voient ces liens */}
      {(isAdmin || isSuperAdmin) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/logements" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition no-underline">
            <h2 className="text-xl font-semibold">🏠 Logements</h2>
            <p className="text-gray-600 text-sm">Gérer les logements</p>
          </Link>
          <Link href="/collaborateurs" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition no-underline">
            <h2 className="text-xl font-semibold">👥 Collaborateurs</h2>
            <p className="text-gray-600 text-sm">Gérer les collaborateurs</p>
          </Link>
          <Link href="/dashboard" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition no-underline">
            <h2 className="text-xl font-semibold">📊 Dashboard</h2>
            <p className="text-gray-600 text-sm">Voir les statistiques</p>
          </Link>
          <Link href="/admin/modeles" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition no-underline">
            <h2 className="text-xl font-semibold">📄 Modèles</h2>
            <p className="text-gray-600 text-sm">Gérer les conventions</p>
          </Link>
        </div>
      )}

      {/* ✅ ACCÈS UTILISATEUR SIMPLE */}
      {isSimpleUser && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 text-center">
          <h2 className="text-xl font-semibold mb-4">🏠 Mon logement</h2>
          <p className="text-gray-600 mb-4">Consultez les informations sur votre logement assigné.</p>
          <Link href="/mon-logement" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors no-underline">
            Voir mon logement
          </Link>
        </div>
      )}
    </div>
  );
}