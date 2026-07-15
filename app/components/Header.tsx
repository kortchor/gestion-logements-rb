'use client';

import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Ne pas afficher le header sur la page de login
  if (pathname === '/login') {
    return null;
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'admin_readonly';

  return (
    <header className="bg-white shadow-md">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/" className="no-underline flex items-center gap-3">
            <img src="/logo-hotel.svg" alt="Les Roches Blanches" className="h-9 w-auto" />
            <span className="text-lg font-bold text-blue-600">Gestion Logements</span>
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
              <Link href="/recherche" className="text-sm text-gray-600 hover:text-blue-600">
                Recherche
              </Link>
            </div>
          )}
        </div>

        <div>
          {user ? (
            <div className="flex items-center gap-3">
              <NotificationBell />
              <UserMenu />
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
