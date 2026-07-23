'use client';

import { useState, useEffect } from 'react';

interface LitLibre {
  id: number;
  num_lit: string;
  type_lit: string;
  chambre_id: number;
  num_chambre: string;
  logement_id: number;
  nom_logement: string;
  adresse: string;
  ville: string;
  prix_loyer: number;
}

interface CollaborateurSansLogement {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  est_actif: boolean;
  date_arrivee: string;
  nombre_baux: number;
}

interface LitDisponible {
  id: number;
  numero: string;
  chambre_nom: string;
  chambre_id: number;
  logement_id: number;
  nom_logement: string;
  logement_adresse: string;
  ville: string;
  type_lit: string;
  nombre_lits: number;
  type_occupation: string;
  est_visible: boolean;
}

export default function RecherchePage() {
  const [activeTab, setActiveTab] = useState<'lits' | 'collaborateurs' | 'recherche'>('lits');
  const [loading, setLoading] = useState(false);
  const [litsLibres, setLitsLibres] = useState<LitLibre[]>([]);
  const [collaborateursSans, setCollaborateursSans] = useState<CollaborateurSansLogement[]>([]);
  const [resultats, setResultats] = useState<LitDisponible[]>([]);
  const [villes, setVilles] = useState<string[]>([]);
  const [searchEffected, setSearchEffected] = useState(false);
  const [formData, setFormData] = useState({
    ville: '',
    type_lit: '',
    type_occupation: '',
  });

  // Charger les lits libres
  useEffect(() => {
    async function fetchLitsLibres() {
      try {
        const response = await fetch('/api/lits/libres');
        const data = await response.json();
        if (data.success) {
          setLitsLibres(data.data);
        }
      } catch (error) {
        console.error('Erreur:', error);
      }
    }
    fetchLitsLibres();
  }, []);

  // Charger les collaborateurs sans logement
  useEffect(() => {
    async function fetchCollaborateursSans() {
      try {
        const response = await fetch('/api/collaborateurs/sans-logement');
        const data = await response.json();
        if (data.success) {
          setCollaborateursSans(data.data);
        }
      } catch (error) {
        console.error('Erreur:', error);
      }
    }
    fetchCollaborateursSans();
  }, []);

  useEffect(() => {
    async function fetchVilles() {
      try {
        const response = await fetch('/api/villes');
        const data = await response.json();
        if (data.success) {
          setVilles(data.data);
        }
      } catch (error) {
        console.error('Erreur:', error);
      }
    }
    fetchVilles();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearchEffected(true);

    try {
      const params = new URLSearchParams();
      if (formData.ville) params.append('ville', formData.ville);
      if (formData.type_lit) params.append('type_lit', formData.type_lit);
      if (formData.type_occupation) params.append('type_occupation', formData.type_occupation);

      const response = await fetch(`/api/lits/recherche?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setResultats(data.data);
        if (data.data.length === 0) {
          alert('Aucun lit disponible pour ces critères');
        }
      } else {
        alert(data.error || 'Erreur lors de la recherche');
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const getVilleColor = (ville: string) => {
    const colors: { [key: string]: string } = {
      'Cassis': 'bg-pink-100 text-pink-800',
      'La Ciotat': 'bg-green-100 text-green-800',
      'Marseille': 'bg-yellow-100 text-yellow-800',
      'Roquefort-la-Bédoule': 'bg-blue-100 text-blue-800',
    };
    return colors[ville] || 'bg-gray-100 text-gray-800';
  };

  // Grouper les lits par logement/chambre
  const groupLitsByLogement = () => {
    const grouped: { [key: string]: typeof litsLibres[0] & { 
      lits: Array<{id: number, num_lit: string}>,
      chambres: { [key: string]: {num_chambre: string, type_lit: string, lits: Array<{id: number, num_lit: string}>}}
    } } = {};

    litsLibres.forEach((lit) => {
      const logKey = `${lit.logement_id}`;
      const chambKey = `${lit.chambre_id}`;
      
      if (!grouped[logKey]) {
        grouped[logKey] = {
          ...lit,
          lits: [],
          chambres: {}
        };
      }

      if (!grouped[logKey].chambres[chambKey]) {
        grouped[logKey].chambres[chambKey] = {
          num_chambre: lit.num_chambre,
          type_lit: lit.type_lit,
          lits: []
        };
      }

      grouped[logKey].chambres[chambKey].lits.push({
        id: lit.id,
        num_lit: lit.num_lit
      });
    });

    return Object.values(grouped);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">🔍 Recherche & Analyse</h1>

      {/* Onglets */}
      <div className="mb-6 border-b border-gray-200 flex space-x-8">
        <button
          onClick={() => setActiveTab('lits')}
          className={`pb-2 px-1 font-medium transition-colors ${
            activeTab === 'lits'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          🛏️ Lits libres ({litsLibres.length})
        </button>
        <button
          onClick={() => setActiveTab('collaborateurs')}
          className={`pb-2 px-1 font-medium transition-colors ${
            activeTab === 'collaborateurs'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          👥 Sans logement ({collaborateursSans.length})
        </button>
        <button
          onClick={() => setActiveTab('recherche')}
          className={`pb-2 px-1 font-medium transition-colors ${
            activeTab === 'recherche'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          🔎 Recherche avancée
        </button>
      </div>

      {/* Onglet 1: Lits libres */}
      {activeTab === 'lits' && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Lits disponibles</h2>
          {litsLibres.length > 0 ? (
            <div className="space-y-4">
              {groupLitsByLogement().map((logement) => (
                <div key={logement.logement_id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-800">{logement.nom_logement || logement.adresse}</h3>
                      <p className="text-sm text-gray-600">{logement.adresse}</p>
                      <div className="mt-2 flex gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVilleColor(logement.ville)}`}>
                          {logement.ville}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Loyer: {logement.prix_loyer?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                      </div>
                    </div>
                    <span className="text-2xl">🛏️</span>
                  </div>

                  {/* Chambres et lits */}
                  <div className="border-t pt-4">
                    {Object.entries(logement.chambres).map(([chambKey, chambre]) => (
                      <div key={chambKey} className="mb-3 pb-3 border-b last:border-b-0">
                        <p className="font-medium text-gray-700 mb-2">
                          🚪 {chambre.num_chambre} ({chambre.type_lit})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {chambre.lits.map((lit) => (
                            <span 
                              key={lit.id} 
                              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                            >
                              Lit {lit.num_lit}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <p className="text-yellow-800">⚠️ Aucun lit libre pour le moment</p>
            </div>
          )}
        </div>
      )}

      {/* Onglet 2: Collaborateurs sans logement */}
      {activeTab === 'collaborateurs' && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Collaborateurs sans logement</h2>
          {collaborateursSans.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date arrivée</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Baux actifs</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {collaborateursSans.map((collab) => (
                    <tr key={collab.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-800">{collab.prenom} {collab.nom}</td>
                      <td className="px-6 py-4 text-gray-600">{collab.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(collab.date_arrivee).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {collab.nombre_baux}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{collab.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <p className="text-green-800">✅ Tous les collaborateurs ont un logement !</p>
            </div>
          )}
        </div>
      )}

      {/* Onglet 3: Recherche avancée */}
      {activeTab === 'recherche' && (
        <>
          <h2 className="text-2xl font-bold mb-4">Recherche avancée</h2>
          
          {/* Formulaire de recherche */}
          <form onSubmit={handleSearch} className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <select
                  name="ville"
                  value={formData.ville}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Toutes les villes</option>
                  {villes.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de lit</label>
                <select
                  name="type_lit"
                  value={formData.type_lit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous</option>
                  <option value="simple">Simple</option>
                  <option value="double">Double</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type d'occupation</label>
                <select
                  name="type_occupation"
                  value={formData.type_occupation}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous</option>
                  <option value="mixte">Mixte</option>
                  <option value="fille">👩 Filles</option>
                  <option value="garçon">👨 Garçons</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Recherche...' : '🔍 Rechercher'}
            </button>
          </form>

          {/* Résultats */}
          {searchEffected ? (
            <>
              {resultats.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b">
                    <p className="text-sm text-gray-600">
                      {resultats.length} lit(s) disponible(s) trouvé(s)
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logement</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adresse</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Occupation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {resultats.map((lit) => (
                          <tr key={lit.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-800">
                              {lit.nom_logement || lit.logement_adresse}
                            </td>
                            <td className="px-6 py-4">{lit.logement_adresse}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVilleColor(lit.ville)}`}>
                                {lit.ville}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {lit.type_lit === 'simple' ? '🛏️ Simple' : '🛏️🛏️ Double'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                lit.type_occupation === 'fille' ? 'bg-pink-200 text-pink-800' :
                                lit.type_occupation === 'garçon' ? 'bg-blue-200 text-blue-800' :
                                'bg-gray-200 text-gray-800'
                              }`}>
                                {lit.type_occupation === 'mixte' ? 'Mixte' :
                                 lit.type_occupation === 'fille' ? '👩 Filles' : '👨 Garçons'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {resultats.length === 0 && (formData.ville || formData.type_lit || formData.type_occupation) && (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-lg">Aucun lit disponible pour ces critères</p>
                  <p className="text-sm">Modifiez vos critères de recherche</p>
                </div>
              )}

              {resultats.length === 0 && !formData.ville && !formData.type_lit && !formData.type_occupation && (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-lg">Cliquez sur 🔍 Rechercher pour afficher tous les lits disponibles</p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
              <p className="text-blue-900 text-lg font-medium">
                Utilisez les filtres ci-dessus pour trouver des lits disponibles
              </p>
              <p className="text-blue-700 text-sm mt-2">
                Laissez les champs vides pour voir tous les lits disponibles
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
