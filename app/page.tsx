'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function HomePage() {
  const { isAuthenticated, user, isAdmin, isSuperAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🏨 Bienvenue aux Roches Blanches</h1>
        <span className="text-sm text-gray-500">
          {isSuperAdmin ? '👑 Super Admin' : isAdmin ? '👤 Admin' : '👀 Utilisateur'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a href="/logements" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-2xl font-semibold mb-4">🏠 Logements</h2>
          <p className="text-gray-600">Gérer les logements</p>
        </a>
        <a href="/collaborateurs" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-2xl font-semibold mb-4">👥 Collaborateurs</h2>
          <p className="text-gray-600">Gérer les collaborateurs</p>
        </a>
        <a href="/dashboard" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-2xl font-semibold mb-4">📊 Dashboard</h2>
          <p className="text-gray-600">Voir les statistiques</p>
        </a>
      </div>

      {isSuperAdmin && (
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h2 className="text-lg font-semibold text-yellow-800">👑 Administration</h2>
          <p className="text-sm text-yellow-700">Vous êtes Super Admin, vous avez accès à toutes les fonctionnalités.</p>
        </div>
      )}
    </div>
  );
}