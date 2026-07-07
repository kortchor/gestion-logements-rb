'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Logement {
  id: number;
  nom_logement: string;
  adresse: string;
  ville: string;
  description_detaillee: string;
  etat_lieux_photos: string;
  chambre_nom: string;
  lit_numero: string;
}

export default function MonLogementPage() {
  const [logement, setLogement] = useState<Logement | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchLogement() {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/collaborateur/logement', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        const data = await response.json();
        if (response.ok && data.success) {
          setLogement(data.data);
          
          if (data.data.etat_lieux_photos) {
            try {
              const photosData = JSON.parse(data.data.etat_lieux_photos);
              if (Array.isArray(photosData)) {
                setPhotos(photosData.map((p: any) => p.data || p));
              }
            } catch (e) {
              console.error('Erreur parsing photos:', e);
            }
          }
        } else {
          setError(data.error || 'Aucun logement assigné');
        }
      } catch (err) {
        setError('Erreur de chargement');
      } finally {
        setLoading(false);
      }
    }
    
    fetchLogement();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !logement) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="text-4xl mb-4">🏠</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Aucun logement assigné</h2>
          <p className="text-gray-600">{error || 'Vous n\'avez pas encore de logement assigné.'}</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">🏠 Mon logement</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Retour
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📋 Informations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Logement</p>
              <p className="font-medium">{logement.nom_logement || 'Sans nom'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Adresse</p>
              <p className="font-medium">{logement.adresse}, {logement.ville}</p>
            </div>
            {logement.chambre_nom && (
              <div>
                <p className="text-sm text-gray-500">Chambre</p>
                <p className="font-medium">{logement.chambre_nom}</p>
              </div>
            )}
            {logement.lit_numero && (
              <div>
                <p className="text-sm text-gray-500">Lit</p>
                <p className="font-medium">Lit n°{logement.lit_numero}</p>
              </div>
            )}
          </div>
          {logement.description_detaillee && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">Description</p>
              <p className="text-gray-700">{logement.description_detaillee}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📸 Photos de l'état des lieux</h2>
          
          {photos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-4xl mb-2">🖼️</p>
              <p>Aucune photo disponible</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
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
    </div>
  );
}