'use client';

import { useState, useEffect } from 'react';
import SendCredentialsButton from '@/app/components/SendCredentialsButton';

export default function CollaborateurDetail({ params }: { params: { id: string } }) {
  const [collab, setCollab] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [litsDisponibles, setLitsDisponibles] = useState([]);
  const [litsFiltres, setLitsFiltres] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedLit, setSelectedLit] = useState('');
  const [participationMensuelle, setParticipationMensuelle] = useState('');
  const [chambrePrivee, setChambrePrivee] = useState(false);
  const [villes, setVilles] = useState<string[]>([]);
  const [rechercheEffectuee, setRechercheEffectuee] = useState(false);
  const [filtres, setFiltres] = useState({
    ville: '',
    type_lit: '',
    type_occupation: '',
  });
  const [modeles, setModeles] = useState([]);
  const [modeleSelectionne, setModeleSelectionne] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/collaborateurs?id=${params.id}`);
        const data = await response.json();
        if (data.success) {
          setCollab(data.data);
          if (data.data.participation_mensuelle) {
            setParticipationMensuelle(data.data.participation_mensuelle.toString());
          }
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
  }, [params.id]);

  useEffect(() => {
    async function fetchLits() {
      try {
        const response = await fetch('/api/lits/disponibles');
        const data = await response.json();
        if (data.success) {
          setLitsDisponibles(data.data);
          setLitsFiltres(data.data);
          const villesUniques = [...new Set(data.data.map((lit: any) => lit.ville))];
          setVilles(villesUniques);
        }
      } catch (error) {
        console.error('Erreur:', error);
      }
    }
    fetchLits();
  }, []);

  useEffect(() => {
    async function fetchModeles() {
      try {
        const response = await fetch('/api/admin/modeles');
        const data = await response.json();
        if (data.success) {
          setModeles(data.data);
          if (data.data.length > 0) {
            setModeleSelectionne(data.data[0].id.toString());
          }
        }
      } catch (error) {
        console.error('Erreur:', error);
      }
    }
    fetchModeles();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleFiltrer = () => {
    let resultats = [...litsDisponibles];
    
    if (filtres.ville) {
      resultats = resultats.filter((lit: any) => lit.ville === filtres.ville);
    }
    if (filtres.type_lit) {
      resultats = resultats.filter((lit: any) => lit.type_lit === filtres.type_lit);
    }
    if (filtres.type_occupation) {
      if (filtres.type_occupation === 'en_attente') {
        resultats = resultats.filter((lit: any) => 
          !lit.logement_type_occupation || 
          lit.logement_type_occupation === 'mixte' || 
          lit.logement_type_occupation === 'en_attente'
        );
      } else {
        resultats = resultats.filter((lit: any) => 
          lit.logement_type_occupation === filtres.type_occupation
        );
      }
    }
    
    setLitsFiltres(resultats);
    setRechercheEffectuee(true);
  };

  const handleAssigner = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLit) {
      alert('Veuillez sélectionner un lit');
      return;
    }

    if (!modeleSelectionne) {
      alert('Veuillez sélectionner un modèle de convention');
      return;
    }

    const litId = parseInt(selectedLit);

    if (!confirm(chambrePrivee ? 'Voulez-vous assigner cette chambre privée ?' : 'Voulez-vous assigner ce lit ?')) return;

    setAssignLoading(true);
    try {
      const response = await fetch(`/api/collaborateurs/${params.id}/assigner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lit_id: litId,
          participation_mensuelle: participationMensuelle ? parseFloat(participationMensuelle) : null,
          chambre_privée: chambrePrivee,
          modele_convention_id: parseInt(modeleSelectionne),
        }),
      });
      const data = await response.json();

      if (data.success) {
        const msg = chambrePrivee 
          ? `✅ Chambre privée assignée avec succès !` 
          : `✅ Lit assigné avec succès !`;
        alert(msg);
        window.location.reload();
      } else {
        alert(data.error || 'Erreur lors de l\'assignation');
      }
    } catch (err) {
      alert('Erreur de connexion');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDesassigner = async () => {
    if (!confirm('Voulez-vous vraiment désassigner ce collaborateur de son logement ?')) return;

    try {
      const response = await fetch(`/api/collaborateurs/${params.id}/desassigner`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        alert('✅ Désassignation effectuée !');
        window.location.reload();
      } else {
        alert(data.error || 'Erreur lors de la désassignation');
      }
    } catch (error) {
      alert('Erreur de connexion');
    }
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
        {/* Informations du collaborateur */}
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

        {/* ✅ BOUTON ENVOYER LES IDENTIFIANTS */}
        <div className="mt-4 flex justify-end">
          <SendCredentialsButton 
            collaborateurId={collab.id}
            collaborateurNom={collab.nom}
            collaborateurPrenom={collab.prenom}
            collaborateurEmail={collab.email}
          />
        </div>

        {/* Logement assigné */}
        <div className="mt-4 border-t pt-4">
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
              <button
                onClick={handleDesassigner}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                🚫 Désassigner
              </button>
            </div>
          ) : (
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <p className="text-yellow-700">⚠️ Aucun logement assigné</p>
              
              {/* Filtres */}
              <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">🔍 Filtrer les lits disponibles</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Ville</label>
                    <select
                      value={filtres.ville}
                      onChange={(e) => setFiltres({ ...filtres, ville: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Toutes</option>
                      {villes.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Type de lit</label>
                    <select
                      value={filtres.type_lit}
                      onChange={(e) => setFiltres({ ...filtres, type_lit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Tous</option>
                      <option value="simple">Simple</option>
                      <option value="double">Double</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Occupation</label>
                    <select
                      value={filtres.type_occupation}
                      onChange={(e) => setFiltres({ ...filtres, type_occupation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Tous</option>
                      <option value="mixte">🔄 Mixte (libre)</option>
                      <option value="fille">👩 Filles</option>
                      <option value="garçon">👨 Garçons</option>
                      <option value="en_attente">⏳ En attente (vide)</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleFiltrer}
                  className="mt-2 px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  🔍 Filtrer
                </button>
                {rechercheEffectuee && (
                  <p className="text-xs text-gray-500 mt-2">{litsFiltres.length} lit(s) trouvé(s)</p>
                )}
              </div>

              {/* Formulaire d'assignation */}
              <form onSubmit={handleAssigner} className="mt-3">
                <div className="flex flex-col gap-3">
                  {/* Sélection du lit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">🛏️ Sélectionner un lit</label>
                    <select
                      value={selectedLit}
                      onChange={(e) => setSelectedLit(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">-- Choisir un lit disponible --</option>
                      {litsFiltres.length === 0 && rechercheEffectuee ? (
                        <option value="" disabled>Aucun lit trouvé</option>
                      ) : (
                        litsFiltres.map((lit: any) => (
                          <option key={lit.id} value={lit.id}>
                            {lit.ville} - {lit.logement_adresse} - {lit.chambre_nom} - Lit {lit.numero}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Modèle de convention */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📄 Modèle de convention</label>
                    <select
                      value={modeleSelectionne}
                      onChange={(e) => setModeleSelectionne(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {modeles.length === 0 ? (
                        <option value="">⚠️ Aucun modèle disponible</option>
                      ) : (
                        modeles.map((modele: any) => (
                          <option key={modele.id} value={modele.id}>
                            {modele.nom}
                          </option>
                        ))
                      )}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">La convention sera générée automatiquement</p>
                  </div>

                  {/* Participation mensuelle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">💰 Participation mensuelle (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={participationMensuelle}
                      onChange={(e) => setParticipationMensuelle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="150.00"
                    />
                  </div>

                  {/* Chambre privée */}
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chambrePrivee}
                        onChange={(e) => setChambrePrivee(e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 font-medium">🛏️ Chambre privée</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-8">Si coché, tous les lits de la chambre seront assignés</p>
                  </div>

                  <button
                    type="submit"
                    disabled={assignLoading || !selectedLit || !modeleSelectionne}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {assignLoading ? '⏳ Assignation...' : `✅ Assigner ${chambrePrivee ? 'la chambre privée' : 'ce lit'}`}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}