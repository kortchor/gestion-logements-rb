'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Bail {
  id: number;
  date_debut: string;
  date_fin: string;
  participation_mensuelle: number | null;
  logement: {
    id: number;
    nom: string;
    adresse: string;
    etat_lieux_photos: string | null;
  };
}

export default function MonEspacePage() {
  const { user, loading: authLoading } = useAuth();
  const [bailActif, setBailActif] = useState<Bail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonLogement = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/collaborateurs/${user.id}/baux`);
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors du chargement');
      }

      // Filtrer le bail actif (date_fin >= aujourd'hui)
      const today = new Date().toISOString().split('T')[0];
      const actif = result.data.find((b: Bail) => b.date_fin && b.date_fin.split('T')[0] >= today);
      setBailActif(actif || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchMonLogement();
    } else if (!authLoading && !user) {
      setLoading(false);
      setError("Vous devez être connecté pour accéder à cet espace.");
    }
  }, [authLoading, user, fetchMonLogement]);

  // Afficher les photos
  const getPhotos = (etatLieuxPhotos: string | null): string[] => {
    if (!etatLieuxPhotos) return [];
    try {
      const parsed = JSON.parse(etatLieuxPhotos);
      return Array.isArray(parsed) ? parsed.map((p: any) => typeof p === 'string' ? p : p.data) : [];
    } catch {
      return [];
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-gray-500">Chargement de votre espace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          ❌ {error}
        </div>
      </div>
    );
  }

  const photos = bailActif ? getPhotos(bailActif.logement?.etat_lieux_photos) : [];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">🏠 Mon Logement</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        {bailActif ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{bailActif.logement?.nom || 'Logement'}</h2>
              <p className="text-gray-700">{bailActif.logement?.adresse || 'Adresse non spécifiée'}</p>
            </div>
            <p className="text-sm text-gray-500">
              Période d'occupation : du {format(new Date(bailActif.date_debut), 'dd MMMM yyyy', { locale: fr })} au {format(new Date(bailActif.date_fin), 'dd MMMM yyyy', { locale: fr })}
            </p>
            {bailActif.participation_mensuelle != null && (
              <p className="text-sm text-gray-500">
                💰 Participation mensuelle : <strong>{bailActif.participation_mensuelle} €</strong>
              </p>
            )}

            {photos.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-700 mb-3">📷 Photos de l'état des lieux</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover rounded-lg hover:opacity-80 transition-opacity border" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Vous n'avez pas de logement actuellement assigné.</p>
        )}
      </div>
    </div>
  );
}
