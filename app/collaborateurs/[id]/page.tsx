'use client';

import { useState, useEffect } from 'react';

export default function CollaborateurDetail({ params }: { params: Promise<{ id: string }> }) {
  const [collab, setCollab] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        // ✅ DÉBALLER LA PROMESSE AVEC await
        const { id } = await params;
        
        const response = await fetch(`/api/collaborateurs?id=${id}`);
        const data = await response.json();
        
        if (data.success) {
          setCollab(data.data);
        } else {
          setError(data.error || 'Erreur');
        }
      } catch (err) {
        console.error('Erreur:', err);
        setError('Erreur de connexion');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 text-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          ❌ {error}
        </div>
      </div>
    );
  }

  if (!collab) {
    return (
      <div className="container mx-auto p-8 text-center">
        <p className="text-gray-500">Aucun collaborateur trouvé</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">👤 Détail du collaborateur</h1>
        <a
          href="/collaborateurs"
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors no-underline"
        >
          ← Retour
        </a>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Genre</p>
            <p className="font-medium text-lg">{collab.genre === 'F' ? '👩 Femme' : '👨 Homme'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Nom complet</p>
            <p className="font-medium text-lg">{collab.prenom} {collab.nom}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{collab.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Téléphone</p>
            <p className="font-medium">{collab.telephone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Centre principal</p>
            <p className="font-medium">{collab.centre_principal || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Centre affectation physique</p>
            <p className="font-medium">{collab.centre_affectation || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date d'arrivée (logement)</p>
            <p className="font-medium">{formatDate(collab.date_arrivee)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date de départ (logement)</p>
            <p className="font-medium">{formatDate(collab.date_depart)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date début contrat</p>
            <p className="font-medium">{formatDate(collab.date_debut_contrat)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date fin contrat</p>
            <p className="font-medium">{formatDate(collab.date_fin_contrat)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Véhicule</p>
            <p className="font-medium">{collab.vehicule ? '🚗 Oui' : 'Non'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Animal de compagnie</p>
            <p className="font-medium">{collab.animal ? '🐾 Oui' : 'Non'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Commentaire</p>
            <p className="font-medium bg-gray-50 p-2 rounded">{collab.commentaire || 'Aucun commentaire'}</p>
          </div>
        </div>

        <div className="mt-6 border-t pt-4">
          <h2 className="text-xl font-semibold mb-3">🏠 Logement assigné</h2>
          
          {collab.logement_adresse ? (
            <div className="bg-green-50 p-4 rounded border border-green-200">
              <p><span className="font-medium">Adresse :</span> {collab.logement_adresse}</p>
              <p><span className="font-medium">Ville :</span> {collab.logement_ville}</p>
              <p><span className="font-medium">Chambre :</span> {collab.chambre_nom || '-'}</p>
              <p><span className="font-medium">Lit :</span> {collab.lit_numero || '-'}</p>
              {collab.participation_mensuelle && (
                <p><span className="font-medium">💰 Participation mensuelle :</span> {parseFloat(collab.participation_mensuelle).toFixed(2)} €</p>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <p className="text-yellow-700">⚠️ Aucun logement assigné</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}