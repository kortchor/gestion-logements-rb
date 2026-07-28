'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'logement' | 'etat-lieux'>('logement');

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user?.id) {
      return;
    }

    const fetchMonLogement = async () => {
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
    };

    void fetchMonLogement();
  }, [authLoading, user]);

  // Afficher les photos
  const getPhotos = (etatLieuxPhotos: string | null): string[] => {
    if (!etatLieuxPhotos) return [];
    try {
      const parsed = JSON.parse(etatLieuxPhotos);
      return Array.isArray(parsed)
        ? parsed
            .map((p: unknown) => {
              if (typeof p === 'string') {
                return p;
              }

              if (p && typeof p === 'object' && 'data' in p) {
                const value = (p as { data?: unknown }).data;
                return typeof value === 'string' ? value : null;
              }

              return null;
            })
            .filter((p): p is string => p !== null)
        : [];
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

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          ❌ Vous devez être connecté pour accéder à cet espace.
        </div>
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
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-lg md:p-8">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-400/20 blur-2xl" />
        <div className="absolute -bottom-12 left-10 h-36 w-36 rounded-full bg-blue-400/20 blur-2xl" />
        <div className="relative z-10">
          <div className="mb-3 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-100">
            ESPACE COLLABORATEUR
          </div>
          <h1 className="text-2xl font-bold md:text-3xl">🏠 Mon Espace</h1>
          <p className="mt-2 text-sm text-slate-200 md:text-base">
            Bonjour {user.prenom || user.nom || 'collaborateur'}, voici un aperçu de votre logement et de votre état des lieux.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-cyan-100">
              {bailActif ? 'Logement actif' : 'Aucun logement actif'}
            </span>
            {bailActif?.date_fin && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-cyan-100">
                Jusqu&apos;au {format(new Date(bailActif.date_fin), 'dd MMM yyyy', { locale: fr })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/80">
          <button
            onClick={() => setActiveTab('logement')}
            className={`flex-1 px-4 py-3 text-center font-medium transition-colors border-b-2 ${
              activeTab === 'logement'
                ? 'border-cyan-600 bg-cyan-50 text-cyan-700'
                : 'border-transparent text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            🏠 Mon Logement
          </button>
          <button
            onClick={() => setActiveTab('etat-lieux')}
            className={`flex-1 px-4 py-3 text-center font-medium transition-colors border-b-2 ${
              activeTab === 'etat-lieux'
                ? 'border-cyan-600 bg-cyan-50 text-cyan-700'
                : 'border-transparent text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            📷 État des lieux
          </button>
        </div>

        {/* Contenu des onglets */}
        <div className="p-6 md:p-7">
          {/* Onglet Mon Logement */}
          {activeTab === 'logement' && (
            <div className="space-y-4">
              {bailActif ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Logement</p>
                      <p className="mt-1 text-base font-semibold text-slate-900">{bailActif.logement?.nom || 'Logement'}</p>
                      <p className="mt-1 text-sm text-slate-600">{bailActif.logement?.adresse || 'Adresse non spécifiée'}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Période</p>
                      <p className="mt-1 text-sm text-slate-700">
                        Du {format(new Date(bailActif.date_debut), 'dd MMM yyyy', { locale: fr })}
                      </p>
                      <p className="text-sm text-slate-700">
                        Au {format(new Date(bailActif.date_fin), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>

                    <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm sm:col-span-2 lg:col-span-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Participation</p>
                      <p className="mt-1 text-2xl font-bold text-cyan-800">
                        {bailActif.participation_mensuelle != null ? `${bailActif.participation_mensuelle} €` : 'Non définie'}
                      </p>
                      <p className="text-xs text-cyan-700/80">Montant mensuel actuel</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">Informations complémentaires</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Vos données de logement sont mises à jour à partir de votre bail actif. En cas d&apos;erreur,
                      contactez l&apos;administration pour vérification.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Référence bail #{bailActif.id}
                    </p>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <p className="text-lg font-semibold text-slate-700">Aucun logement actif</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Vous n&apos;avez pas de logement actuellement assigné. L&apos;équipe RH peut vous informer dès qu&apos;une affectation est réalisée.
                  </p>
                  <div className="mt-4 inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                    Statut: en attente d&apos;affectation
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Onglet État des lieux */}
          {activeTab === 'etat-lieux' && (
            <div>
              {bailActif && photos.length > 0 ? (
                <div>
                  <h3 className="mb-4 text-lg font-semibold text-slate-800">📷 Photos de l&apos;état des lieux</h3>
                  <p className="mb-4 text-sm text-slate-600">
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
                        <Image
                          src={url}
                          alt={`Photo de l'état des lieux ${i + 1}`}
                          width={256}
                          height={128}
                          className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-300"
                          unoptimized
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
                <div className="py-12 text-center">
                  <p className="text-lg text-slate-500">
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
