'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface BailActif {
  id: number;
  logement_nom: string;
  logement_adresse: string;
  chambre_nom: string;
  lit_numero: string;
  date_debut: string;
  date_fin: string;
}

interface UserData {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

export default function MonEspacePage() {
  const { data: session, status } = useSession();
  const [bail, setBail] = useState<BailActif | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      const fetchBailData = async () => {
        try {
          const response = await fetch(`/api/collaborateurs/${session.user.id}/baux/actif`);
          if (!response.ok) {
            throw new Error('Impossible de récupérer les informations du bail.');
          }
          const result = await response.json();
          if (result.success) {
            setBail(result.data);
          } else {
            // Pas d'erreur si aucun bail n'est trouvé, c'est un état normal
            setBail(null);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
        } finally {
          setLoading(false);
        }
      };

      fetchBailData();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, session]);

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <p>Vous devez être connecté pour accéder à cet espace.</p>
        <Link href="/login" className="text-blue-600 hover:underline">Se connecter</Link>
      </div>
    );
  }

  const user = session.user as UserData;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900">
          Bonjour, {user.prenom} !
        </h1>
        <p className="mt-2 text-lg text-gray-600">Bienvenue dans votre espace personnel.</p>

        <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🏠 Mon Logement Actuel</h2>
          {error && <p className="text-red-500">{error}</p>}
          {!loading && !bail && (
            <div className="text-center py-8 text-gray-500">
              <p>Vous n'avez pas de logement actuellement assigné.</p>
            </div>
          )}
          {bail && (
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-500">Adresse</span>
                <p className="font-medium text-gray-900">{bail.logement_adresse}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Détails</span>
                <p className="font-medium text-gray-900">
                  {bail.logement_nom}, {bail.chambre_nom}, Lit n°{bail.lit_numero}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

Avec ces modifications, la fonctionnalité d'envoi d'identifiants devrait maintenant fonctionner sans erreur, et vous disposez d'une nouvelle page prête à être enrichie pour l'espace collaborateur.

<!--
[PROMPT_SUGGESTION]Comment ajouter la liste des photos de l'état des lieux sur la page "Mon Espace" ?[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Peux-tu créer le formulaire pour qu'un collaborateur signale un problème dans son logement ?[/PROMPT_SUGGESTION]
-->