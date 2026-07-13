'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Définir les types pour les données que nous allons utiliser
interface Collaborateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

interface Bail {
  id: number;
  date_debut: string;
  date_fin: string;
  logement: {
    id: number;
    nom: string;
    adresse: string;
    photos_etat_lieux_entree: string[] | null;
  };
  chambre: {
    id: number;
    nom: string;
  };
  lit: {
    id: number;
    numero: string;
  };
}

export default function MonEspacePage() {
  const { data: session, status } = useSession();
  const [bailActif, setBailActif] = useState<Bail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      const fetchMyData = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/collaborateurs/${session.user.id}/baux`);
          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error || 'Impossible de charger vos informations de logement.');
          }

          // Filtrer pour ne garder que le bail actif
          const aujourdhui = new Date();
          aujourdhui.setHours(0, 0, 0, 0); // Pour une comparaison juste
          const actif = result.data.find(
            (bail: Bail) => bail.date_fin && new Date(bail.date_fin) >= aujourdhui
          );
          setBailActif(actif || null);

        } catch (err) {
          setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
        } finally {
          setLoading(false);
        }
      };

      fetchMyData();
    } else if (status === 'unauthenticated') {
      setLoading(false);
      setError("Vous devez être connecté pour accéder à cet espace.");
    }
  }, [session, status]);

  if (loading || status === 'loading') {
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">🏠 Mon Logement</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        {bailActif ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{bailActif.logement?.nom || 'Logement non spécifié'}</h2>
              <p className="text-gray-600">{bailActif.logement?.adresse || 'Adresse non spécifiée'}</p>
            </div>
            <p className="text-sm text-gray-500">
              Période d'occupation : du {format(new Date(bailActif.date_debut), 'dd MMMM yyyy', { locale: fr })} au {format(new Date(bailActif.date_fin), 'dd MMMM yyyy', { locale: fr })}
            </p>
            
            {/* Affichage des photos de l'état des lieux */}
            {bailActif.logement?.photos_etat_lieux_entree && bailActif.logement.photos_etat_lieux_entree.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-700 mb-3">📷 Photos de l'état des lieux d'entrée</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {bailActif.logement.photos_etat_lieux_entree.map((photoUrl, index) => (
                    <a key={index} href={photoUrl} target="_blank" rel="noopener noreferrer">
                      <img src={photoUrl} alt={`État des lieux ${index + 1}`} className="w-full h-24 object-cover rounded-lg hover:opacity-80 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p>Vous n'avez pas de logement actuellement assigné.</p>
        )}
      </div>
    </div>
  );
}