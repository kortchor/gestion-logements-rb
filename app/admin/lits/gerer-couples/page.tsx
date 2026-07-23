'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

interface Lit {
  id: number;
  numero: string;
  chambre_nom: string;
  type_lit: string;
  logement_adresse: string;
  ville: string;
}

interface LitAssigne {
  id: number;
  numero: string;
  chambre_nom: string;
  type_lit: string;
  nom_logement: string;
  adresse: string;
  ville: string;
  prix_loyer: number;
  occupants: Array<{
    id: number;
    nom: string;
    prenom: string;
    email: string;
  }>;
}

interface Collaborateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  est_actif: boolean;
}

export default function GererCouplesPage() {
  const { user, loading } = useAuth();
  const [litsLibres, setLitsLibres] = useState<Lit[]>([]);
  const [litsAssignes, setLitsAssignes] = useState<LitAssigne[]>([]);
  const [collaborateurs, setCollaborateurs] = useState<Collaborateur[]>([]);
  const [selectedLit, setSelectedLit] = useState<number | null>(null);
  const [collaborateur1, setCollaborateur1] = useState<number | null>(null);
  const [collaborateur2, setCollaborateur2] = useState<number | null>(null);
  const [loading2, setLoading2] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Récupérer les lits libres (doubles)
      const litsRes = await fetch('/api/lits/libres');
      const litsData = await litsRes.json();
      if (litsData.success) {
        setLitsLibres(litsData.data.filter((l: any) => l.type_lit === 'double'));
      }

      // Récupérer les lits assignés
      const assignesRes = await fetch('/api/lits/assignes');
      const assignesData = await assignesRes.json();
      if (assignesData.success) {
        setLitsAssignes(assignesData.data);
      }

      // Récupérer les collaborateurs actifs
      const collabRes = await fetch('/api/collaborateurs');
      const collabData = await collabRes.json();
      if (collabData.success) {
        setCollaborateurs(collabData.data.filter((c: any) => c.est_actif));
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading2(false);
    }
  };

  const handleAssignCouple = async () => {
    if (!selectedLit || !collaborateur1) {
      setMessage('⚠️ Sélectionnez au moins le collaborateur 1');
      return;
    }

    try {
      const response = await fetch(`/api/lits/${selectedLit}/assigner-couple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          collaborateur1_id: collaborateur1,
          collaborateur2_id: collaborateur2 || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ ${data.message}`);
        setSelectedLit(null);
        setCollaborateur1(null);
        setCollaborateur2(null);
        // Rafraîchir
        setTimeout(() => {
          fetchData();
          setMessage('');
        }, 1500);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMessage('❌ Erreur lors de l\'assignation');
    }
  };

  const handleRetireOccupant = async (litId: number, collabId: number, collabName: string) => {
    if (!confirm(`Retirer ${collabName} de ce lit ?`)) return;

    try {
      const response = await fetch(`/api/lits/${litId}/retirer-occupant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ collaborateur_id: collabId }),
      });

      if (response.ok) {
        setMessage('✅ Occupant retiré');
        setTimeout(() => {
          fetchData();
          setMessage('');
        }, 1500);
      } else {
        setMessage('❌ Erreur lors du retrait');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMessage('❌ Erreur de connexion');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="p-8 text-center text-red-600">
        Accès refusé. Administrateur requis.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-3xl font-bold">👥 Gérer les Couples</h1>
          </div>
          <p className="text-gray-600">Assignez deux collaborateurs à un lit double</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section: Assigner un couple */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6">➕ Assigner un couple</h2>

            {litsLibres.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lit double</label>
                  <select
                    value={selectedLit || ''}
                    onChange={(e) => setSelectedLit(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un lit...</option>
                    {litsLibres.map((lit) => (
                      <option key={lit.id} value={lit.id}>
                        {lit.logement_adresse} - Chambre {lit.chambre_nom}, Lit {lit.numero}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Collaborateur 1 *</label>
                  <select
                    value={collaborateur1 || ''}
                    onChange={(e) => setCollaborateur1(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner...</option>
                    {collaborateurs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.prenom} {c.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Collaborateur 2 (optionnel)</label>
                  <select
                    value={collaborateur2 || ''}
                    onChange={(e) => setCollaborateur2(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Aucun</option>
                    {collaborateurs.filter((c) => c.id !== collaborateur1).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.prenom} {c.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAssignCouple}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  ✅ Assigner
                </button>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center text-yellow-800">
                Aucun lit double libre pour le moment
              </div>
            )}
          </div>

          {/* Section: Lits assignés */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6">🛏️ Lits assignés ({litsAssignes.length})</h2>

            {litsAssignes.length > 0 ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {litsAssignes.map((lit) => (
                  <div key={lit.id} className="border border-gray-200 p-4 rounded-lg">
                    <p className="font-semibold text-gray-800 mb-2">{lit.nom_logement || lit.adresse}</p>
                    <p className="text-xs text-gray-500 mb-3">Chambre {lit.chambre_nom}, Lit {lit.numero}</p>

                    <div className="space-y-2">
                      {lit.occupants.length > 0 ? (
                        lit.occupants.map((occ) => (
                          <div key={occ.id} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                            <div>
                              <p className="font-medium text-blue-900">
                                {occ.prenom} {occ.nom}
                              </p>
                              <p className="text-xs text-gray-600">{occ.email}</p>
                            </div>
                            <button
                              onClick={() => handleRetireOccupant(lit.id, occ.id, `${occ.prenom} ${occ.nom}`)}
                              className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">Aucun occupant</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-600">
                Aucun lit assigné pour le moment
              </div>
            )}
          </div>
        </div>

        {/* Bouton retour */}
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-block px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
          >
            ← Retour
          </Link>
        </div>
      </div>
    </div>
  );
}
