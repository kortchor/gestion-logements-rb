'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { TokenPayload } from '@/lib/auth';
import Cookies from 'js-cookie';

interface AuthContextType {
  user: TokenPayload | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TokenPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function loadUserFromCookies() {
      // Pas besoin de vérifier si on est sur la page de login
      if (pathname === '/login') {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to fetch user", error);
        setUser(null);
      }

      setLoading(false);
    }
    loadUserFromCookies();
  }, [pathname]); // ✅ Ré-exécuter si le chemin change

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }); // Appelle l'API pour supprimer le cookie
    setUser(null);
    router.push('/login');
  };

  const value = { user, loading, logout };

  return (
    <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
  );
}