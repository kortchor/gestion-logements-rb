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
          <Link href="/" className="no-underline flex items-center gap-2" title="Accueil">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 70" className="h-10 w-auto" fill="none">
              <defs>
                <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#0c4a6e'}} />
                  <stop offset="100%" style={{stopColor:'#38bdf8'}} />
                </linearGradient>
              </defs>
              <circle cx="55" cy="18" r="9" fill="#fbbf24" />
              <path d="M 20 50 L 90 50 L 90 65 Q 90 70 85 70 L 25 70 Q 20 70 20 65 Z" fill="#0284c7" />
              <rect x="35" y="40" width="10" height="10" fill="#1e40af" />
              <rect x="50" y="40" width="10" height="10" fill="#1e40af" />
              <rect x="65" y="40" width="10" height="10" fill="#1e40af" />
            </svg>
            <span className="hidden sm:inline text-sm font-semibold text-gray-700">Gestion Logements</span>
          </Link>
          
          {/* Liens de navigation pour les utilisateurs connectés */}
          {user && isAdmin && (
            <div className="hidden lg:flex items-center gap-4">
              <Link href="/logements" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                🏠 Logements
              </Link>
              <Link href="/collaborateurs" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                👥 Collaborateurs
              </Link>
              <Link href="/recherche" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                🔍 Recherche
              </Link>
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                📊 Dashboard
              </Link>
              <Link href="/admin/modeles" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                📄 Modèles
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
