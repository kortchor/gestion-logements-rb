'use client';

import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Ne pas afficher le header sur la page de login
  if (pathname === '/login') {
    return null;
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <header className="bg-white shadow-md">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-blue-600 no-underline">
            🏨 Gestion Logements
          </Link>
          {/* Liens de navigation pour les utilisateurs connectés */}
          {user && (
            <div className="hidden md:flex items-center gap-4">
              <Link href="/logements" className="text-sm text-gray-600 hover:text-blue-600">
                Logements
              </Link>
              <Link href="/collaborateurs" className="text-sm text-gray-600 hover:text-blue-600">
                Collaborateurs
              </Link>
            </div>
          )}
        </div>

        <div>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Bonjour, {user.prenom}
              </span>

              {/* Menu Admin */}
              {isAdmin && (
                <div className="relative group">
                  <Link 
                    href="/admin/modeles" 
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300 transition-colors"
                  >
                    ⚙️ Gestion
                  </Link>
                </div>
              )}

              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
              >
                Déconnexion
              </button>
            </div>
          ) : (
            !pathname.startsWith('/login') && (
              <Link href="/login" className="text-sm text-blue-600 hover:underline">
                Se connecter
              </Link>
            )
          )}
        </div>
      </nav>
    </header>
  );
}