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
    <div className="min-h-screen flex flex-col">
      {/* Hero section fullscreen avec image de fond */}
      <div className="relative w-full flex-1 overflow-hidden min-h-[calc(100vh-80px)]">
        {/* Image de fond fullscreen */}
        <div className="absolute inset-0">
          <img 
            src="/images/page accueil.webp" 
            alt="Les Roches Blanches" 
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay pour améliorer la lisibilité */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-transparent" />
        </div>

        {/* Contenu en overlay */}
        <div className="relative z-10 flex flex-col justify-center items-start h-full max-w-7xl mx-auto px-8">
          {/* Titre de bienvenue */}
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-2">
              Bienvenue, {user.prenom} 👋
            </h1>
            <p className="text-xl md:text-2xl text-white/90">
              Gestion des logements - Les Roches Blanches
            </p>
          </div>

          {/* Badge rôle utilisateur */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 mb-12">
            <span className="text-lg text-white font-medium">
              {isSuperAdmin ? '👑 Super Administrateur' : isReadOnly ? '👁️ Administrateur (Lecture)' : isAdmin ? '👤 Administrateur' : '👀 Utilisateur'}
            </span>
          </div>

          {/* Navigation cards en overlay */}
          {isAdmin && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl">
              <Link 
                href="/logements" 
                className="bg-white/95 hover:bg-white backdrop-blur-sm p-6 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 no-underline group"
              >
                <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">🏠</span>
                <h2 className="text-lg font-semibold text-gray-900">Logements</h2>
                <p className="text-sm text-gray-600 mt-1">Gérer les logements</p>
              </Link>

              <Link 
                href="/collaborateurs" 
                className="bg-white/95 hover:bg-white backdrop-blur-sm p-6 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 no-underline group"
              >
                <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">👥</span>
                <h2 className="text-lg font-semibold text-gray-900">Collaborateurs</h2>
                <p className="text-sm text-gray-600 mt-1">Gérer les collaborateurs</p>
              </Link>

              <Link 
                href="/dashboard" 
                className="bg-white/95 hover:bg-white backdrop-blur-sm p-6 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 no-underline group"
              >
                <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">📊</span>
                <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
                <p className="text-sm text-gray-600 mt-1">Voir les statistiques</p>
              </Link>

              <Link 
                href="/admin/modeles" 
                className="bg-white/95 hover:bg-white backdrop-blur-sm p-6 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 no-underline group"
              >
                <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">📄</span>
                <h2 className="text-lg font-semibold text-gray-900">Modèles</h2>
                <p className="text-sm text-gray-600 mt-1">Conventions locatives</p>
              </Link>
            </div>
          )}

          {/* Section utilisateur simple */}
          {isSimpleUser && (
            <Link 
              href="/mon-espace"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all text-lg font-semibold no-underline"
            >
              🏠 Consulter mon logement
            </Link>
          )}
        </div>
      </div>

      {/* Section supplémentaire avec du contenu (optionnel) */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">📋 Gestion facile</h3>
              <p className="text-gray-600">Gérez vos logements et collaborateurs de manière simple et efficace.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">🔒 Sécurisé</h3>
              <p className="text-gray-600">Vos données sont sécurisées avec une authentification robuste.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">📊 Statistiques</h3>
              <p className="text-gray-600">Visualisez vos statistiques en temps réel sur le dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
