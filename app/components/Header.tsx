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
  const canUseNotifications = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'admin_readonly';

  const navItems = [
    { href: '/logements', label: '🏠 Logements' },
    { href: '/collaborateurs', label: '👥 Collaborateurs' },
    { href: '/recherche', label: '🔍 Recherche' },
    { href: '/dashboard', label: '📊 Dashboard' },
    ...(user?.role !== 'admin_readonly' ? [{ href: '/admin/anomalies', label: '⚠️ Anomalies' }] : []),
    ...(user?.role === 'super_admin' ? [{ href: '/admin/audit-trail', label: '📋 Suivi des actions' }] : []),
    { href: '/admin/modeles', label: '📄 Modèles' },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <nav className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="flex items-center gap-3 rounded-2xl px-2 py-1 transition-colors hover:bg-slate-100" title="Accueil">
            <img src="/images/les-roches-blanches-logo-gold-5et.png" alt="Les Roches Blanches" className="h-11 w-auto" />
            <div className="hidden sm:block">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Gestion</div>
              <div className="text-sm font-bold text-slate-900">Logements</div>
            </div>
          </Link>

          {user && isAdmin && (
            <div className="hidden xl:flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${user.role === 'super_admin' ? 'bg-amber-500' : user.role === 'admin' ? 'bg-emerald-500' : user.role === 'admin_readonly' ? 'bg-sky-500' : 'bg-slate-400'}`} />
              <span>
                {user.role === 'super_admin' ? 'Super admin' : user.role === 'admin' ? 'Admin' : user.role === 'admin_readonly' ? 'Lecture' : 'Utilisateur'}
              </span>
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              {canUseNotifications && <NotificationBell />}
              <UserMenu />
            </div>
          ) : (
            !pathname.startsWith('/login') && (
              <Link href="/login" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50">
                Se connecter
              </Link>
            )
          )}
        </div>
      </nav>
    </header>
  );
}
