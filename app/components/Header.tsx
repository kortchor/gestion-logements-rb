'use client';

import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-md">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-blue-600 no-underline">
          🏨 Gestion Logements
        </Link>

        <div>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Bonjour, {user.prenom}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <Link href="/login" className="text-sm text-blue-600 hover:underline">
              Se connecter
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}