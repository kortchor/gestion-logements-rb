'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { verifyToken, TokenPayload } from '@/lib/auth';
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

  useEffect(() => {
    async function loadUserFromCookies() {
      const token = Cookies.get('token');
      if (token) {
        try {
          const payload = await verifyToken(token);
          if (payload) {
            setUser(payload);
          }
        } catch (e) {
          console.error("Failed to verify token", e);
        }
      }
      setLoading(false);
    }
    loadUserFromCookies();
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout'); // Appelle l'API pour supprimer le cookie
    setUser(null);
    Cookies.remove('token');
    router.push('/login');
  };

  const value = { user, loading, logout };

  return (
    <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
  );
}