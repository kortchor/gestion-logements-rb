'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ReportProblemModal from '@/app/components/ReportProblemModal';
import Link from 'next/link';

interface BailActif {
  id: number;
  logement_id: number;
  nom_logement: string;
  adresse: string;
  ville: string;
  description_detaillee: string | null;
  etat_lieux_photos: string | null;
  chambre_nom: string;
  lit_numero: string;
}

export default function MonEspacePage() {
  const { data: session, status } = useSession();
  const [bail, setBail] = useState<BailActif | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      const fetchBailData = async () => {
        try {
          const response = await fetch(`/api/collaborateurs/${session.user.id}/baux/actif`);
          const data = await response.json();

          if (response.ok && data.success) {
            setBail(data.data);
            
            if (data.data?.etat_lieux_photos) {
              try {
                const photosData = typeof data.data.etat_lieux_photos === 'string'
                  ? JSON.parse(data.data.etat_lieux_photos)
                  : data.data.etat_lieux_photos;

                if (Array.isArray(photosData)) {
                  setPhotos(photosData.map((p: any) => p.data || p).filter(Boolean));
                }
              } catch (e) {
                console.error('Erreur parsing photos:', e);
                setPhotos([]);
              }
            }
          } else {
            setError(data.error || 'Aucun logement assigné pour le moment.');
          }
        } catch (err) {
          setError('Erreur de connexion au serveur.');
        } finally {
          setLoading(false);
        }
      };
      fetchBailData();
    } else if (status === 'unauthenticated') {
      setLoading(false);
      setError("Vous devez être connecté pour voir cette page.");
    }
  }, [status, session]);

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !bail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="text-4xl mb-4">🏠</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Aucun logement assigné</h2>
          <p className="text-gray-600">{error}</p>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900">
          Bonjour, {session?.user?.prenom} !
        </h1>
        <p className="mt-2 text-lg text-gray-600">Bienvenue dans votre espace personnel.</p>

        <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🏠 Mon Logement Actuel</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Logement</p>
              <p className="font-medium">{bail.nom_logement || 'Sans nom'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Adresse</p>
              <p className="font-medium">{bail.adresse}, {bail.ville}</p>
            </div>
            {bail.chambre_nom && (
              <div>
                <p className="text-sm text-gray-500">Chambre</p>
                <p className="font-medium">{bail.chambre_nom}</p>
              </div>
            )}
            {bail.lit_numero && (
              <div>
                <p className="text-sm text-gray-500">Lit</p>
                <p className="font-medium">Lit n°{bail.lit_numero}</p>
              </div>
            )}
          </div>
          {bail.description_detaillee && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">Description</p>
              <p className="text-gray-700">{bail.description_detaillee}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📸 Photos de l'état des lieux</h2>
          
          {photos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-4xl mb-2">🖼️</p>
              <p>Aucune photo disponible</p>
            </div>
          )}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <Link href={photo} target="_blank" rel="noopener noreferrer">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              const event = new CustomEvent('openReportModal');
              document.dispatchEvent(event);
            }}
            className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            ⚠️ Signaler un problème technique
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Un email sera envoyé à l'agent technique et à la RH
          </p>
        </div>
      </div>
      {/* ✅ Intégrer la modale ici, elle s'ouvrira via l'événement personnalisé */}
      <ReportProblemModal 
        bailId={bail?.id || null}
        logementAdresse={bail ? `${bail.adresse}, ${bail.ville}` : ''}
      />
    </div>
  );
}