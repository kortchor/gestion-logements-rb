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
  const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.role === 'admin_readonly';
  const isReadOnly = user.role === 'admin_readonly';
  const isSimpleUser = user.role === 'user';

  return (
    <div className="min-h-screen">
      {/* Hero section avec image de fond */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/images/accueil-fond.webp" 
            alt="Les Roches Blanches" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-8 py-20">
          <div className="flex items-center gap-4 mb-4">
            <img src="/logo-hotel.svg" alt="Les Roches Blanches" className="h-14 w-auto" />
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg">Les Roches Blanches</h1>
              <p className="text-lg text-blue-200 font-medium">Gestion des logements</p>
            </div>
          </div>
          <p className="text-white/90 text-xl max-w-2xl mt-6">
            Bienvenue <strong className="text-white">{user.prenom} {user.nom}</strong> 👋
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-sm text-white/90">
              {isSuperAdmin ? '👑 Super Administrateur' : isReadOnly ? '👁️ Administrateur (Lecture)' : isAdmin ? '👤 Administrateur' : '👀 Utilisateur'}
            </span>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-8 py-10">
        {/* ✅ ACCÈS ADMIN - Tous les profils admin voient ces pages */}
        {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/logements" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition no-underline">
            <h2 className="text-xl font-semibold">🏠 Logements</h2>
            <p className="text-gray-600 text-sm">Consulter les logements</p>
          </Link>
          <Link href="/collaborateurs" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition no-underline">
            <h2 className="text-xl font-semibold">👥 Collaborateurs</h2>
            <p className="text-gray-600 text-sm">Consulter les collaborateurs</p>
          </Link>
          <Link href="/dashboard" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition no-underline">
            <h2 className="text-xl font-semibold">📊 Dashboard</h2>
            <p className="text-gray-600 text-sm">Voir les statistiques</p>
          </Link>
          <Link href="/admin/modeles" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition no-underline">
            <h2 className="text-xl font-semibold">📄 Modèles</h2>
            <p className="text-gray-600 text-sm">Consulter les conventions</p>
          </Link>
        </div>
      )}

      {/* ✅ ACCÈS UTILISATEUR SIMPLE */}
      {isSimpleUser && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 text-center">
          <h2 className="text-xl font-semibold mb-4">🏠 Mon logement</h2>
          <p className="text-gray-600 mb-4">Consultez les informations sur votre logement assigné.</p>
          <Link href="/mon-espace" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors no-underline">
            Voir mon logement
          </Link>
        </div>
      )}
      </div>
    </div>
  );
}
