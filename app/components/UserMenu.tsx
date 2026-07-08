'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import ReportIssueButton from './ReportIssueButton';

export default function UserMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
    window.location.href = '/login';
  };

  if (loading) {
    return <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>;
  }

  if (!user) {
    return (
      <a href="/login" className="text-gray-700 hover:text-blue-600 transition-colors no-underline">
        🔐 Connexion
      </a>
    );
  }

  const isSuperAdmin = user.role === 'super_admin';
  const getRoleLabel = () => {
    switch (user.role) {
      case 'super_admin': return '👑 Super Admin';
      case 'admin': return '👤 Admin';
      default: return '👀 Utilisateur';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
      >
        <span className="text-sm">
          {user.prenom} {user.nom}
        </span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">
              {user.prenom} {user.nom}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
            <p className="text-xs text-blue-600 mt-1">{getRoleLabel()}</p>
          </div>
          <div className="py-1">
            <a
              href="/change-password"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              🔑 Changer le mot de passe
            </a>
            <ReportIssueButton />
            {isSuperAdmin && (
              <>
                <a
                  href="/admin/technicien"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  🔧 Gestion du technicien
                </a>
              </>
            )}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
            >
              🚪 Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}