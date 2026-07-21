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
  const [activeTab, setActiveTab] = useState<'logement' | 'etat-lieux'>('logement');

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
      <div className="flex items-center gap-3 mb-6">
        <img src="/logo-hotel.svg" alt="Les Roches Blanches" className="h-8 w-auto" />
        <h1 className="text-2xl font-bold">🏠 Mon Espace</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('logement')}
            className={`flex-1 px-4 py-3 font-medium text-center transition-colors border-b-2 ${
              activeTab === 'logement'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            🏠 Mon Logement
          </button>
          <button
            onClick={() => setActiveTab('etat-lieux')}
            className={`flex-1 px-4 py-3 font-medium text-center transition-colors border-b-2 ${
              activeTab === 'etat-lieux'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            📷 État des lieux
          </button>
        </div>

        {/* Contenu des onglets */}
        <div className="p-6">
          {/* Onglet Mon Logement */}
          {activeTab === 'logement' && (
            <div className="space-y-4">
              {bailActif ? (
                <>
                  <div>
                    <h2 className="text-xl font-semibold">{bailActif.logement?.nom || 'Logement'}</h2>
                    <p className="text-gray-700 mt-2">
                      <span className="font-medium">📍 Adresse :</span> {bailActif.logement?.adresse || 'Adresse non spécifiée'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">📅 Période d'occupation :</span> 
                      <br /> du {format(new Date(bailActif.date_debut), 'dd MMMM yyyy', { locale: fr })} 
                      <br /> au {format(new Date(bailActif.date_fin), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  {bailActif.participation_mensuelle != null && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-gray-700">
                        💰 <span className="font-medium">Participation mensuelle :</span> <strong className="text-blue-600">{bailActif.participation_mensuelle} €</strong>
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">Vous n'avez pas de logement actuellement assigné.</p>
              )}
            </div>
          )}

          {/* Onglet État des lieux */}
          {activeTab === 'etat-lieux' && (
            <div>
              {bailActif && photos.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">📷 Photos de l'état des lieux</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {photos.length} photo{photos.length > 1 ? 's' : ''} disponible{photos.length > 1 ? 's' : ''}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {photos.map((url, i) => (
                      <a 
                        key={i} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow"
                        title={`Photo ${i + 1}`}
                      >
                        <img 
                          src={url} 
                          alt={`Photo de l'état des lieux ${i + 1}`} 
                          className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                            Voir
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">
                    {bailActif 
                      ? '📸 Aucune photo d\'état des lieux disponible pour le moment.' 
                      : '❌ Vous n\'avez pas de logement assigné.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
