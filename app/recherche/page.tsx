'use client';

import { useState, useEffect } from 'react';

interface LitDisponible {
  id: number;
  numero: string;
  chambre_nom: string;
  chambre_id: number;
  logement_id: number;
  logement_adresse: string;
  ville: string;
  type_lit: string;
  nombre_lits: number;
  type_occupation: string;
  est_visible: boolean;
}

export default function RecherchePage() {
  const [loading, setLoading] = useState(false);
  const [resultats, setResultats] = useState<LitDisponible[]>([]);
  const [villes, setVilles] = useState<string[]>([]);
  const [collaborateurs, setCollaborateurs] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    ville: '',
    type_lit: '',
    nombre_lits: 1,
    date_debut: '',
    date_fin: '',
    type_occupation: '',
  });
  const [assignForm, setAssignForm] = useState({
    lit_id: 0,
    collaborateur_id: '',
  });

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

  useEffect(() => {
    async function fetchCollaborateurs() {
      try {
        const response = await fetch('/api/collaborateurs');
        const data = await response.json();
        if (data.success) {
          setCollaborateurs(data.data);
        }
      } catch (error) {
        console.error('Erreur:', error);
      }
    }
    fetchCollaborateurs();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAssignChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAssignForm({ ...assignForm, [name]: value });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (formData.ville) params.append('ville', formData.ville);
      if (formData.type_lit) params.append('type_lit', formData.type_lit);
      if (formData.nombre_lits) params.append('nombre_lits', formData.nombre_lits.toString());
      if (formData.date_debut) params.append('date_debut', formData.date_debut);
      if (formData.date_fin) params.append('date_fin', formData.date_fin);
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

  const handleAssigner = async (litId: number) => {
    if (!assignForm.collaborateur_id) {
      alert('Veuillez sélectionner un collaborateur');
      return;
    }

    if (!confirm('Voulez-vous assigner ce lit au collaborateur sélectionné ?')) return;

    try {
      const response = await fetch('/api/lits/assigner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lit_id: litId,
          collaborateur_id: parseInt(assignForm.collaborateur_id),
          date_debut: formData.date_debut,
          date_fin: formData.date_fin,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Lit assigné avec succès !');
        // Rafraîchir les résultats
        handleSearch(new Event('submit') as any);
      } else {
        alert(data.error || 'Erreur lors de l\'assignation');
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('Erreur de connexion');
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

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">🔍 Recherche de logements disponibles</h1>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de lits par chambre</label>
            <select
              name="nombre_lits"
              value={formData.nombre_lits}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 lit</option>
              <option value={2}>2 lits</option>
              <option value={3}>3 lits</option>
              <option value={4}>4 lits</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date d'arrivée</label>
            <input
              type="date"
              name="date_debut"
              value={formData.date_debut}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de départ</label>
            <input
              type="date"
              name="date_fin"
              value={formData.date_fin}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
          className={`mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Recherche...' : '🔍 Rechercher'}
        </button>
      </form>

      {/* Résultats */}
      {resultats.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {resultats.length} lit(s) disponible(s) trouvé(s)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chambre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Occupation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {resultats.map((lit) => (
                  <tr key={lit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVilleColor(lit.ville)}`}>
                        {lit.ville}
                      </span>
                    </td>
                    <td className="px-6 py-4">{lit.logement_adresse}</td>
                    <td className="px-6 py-4">{lit.chambre_nom}</td>
                    <td className="px-6 py-4">Lit {lit.numero}</td>
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
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          onChange={(e) => {
                            setAssignForm({ ...assignForm, collaborateur_id: e.target.value, lit_id: lit.id });
                          }}
                          value={assignForm.lit_id === lit.id ? assignForm.collaborateur_id : ''}
                        >
                          <option value="">Choisir...</option>
                          {collaborateurs
                            .filter((c: any) => !c.logement_adresse || c.id === 0)
                            .map((c: any) => (
                              <option key={c.id} value={c.id}>
                                {c.nom} {c.prenom}
                              </option>
                            ))
                          }
                        </select>
                        <button
                          onClick={() => handleAssigner(lit.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm whitespace-nowrap"
                        >
                          ✅ Assigner
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {resultats.length === 0 && (formData.ville || formData.type_lit) && (
        <div className="text-center text-gray-500 py-8">
          <p className="text-lg">Aucun lit disponible pour ces critères</p>
          <p className="text-sm">Modifiez vos critères de recherche</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">📖 Comment utiliser la recherche ?</h2>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li><strong>1. Sélectionnez</strong> une ville, un type de lit et des dates</li>
          <li><strong>2. Cliquez sur "Rechercher"</strong> pour voir les lits disponibles</li>
          <li><strong>3. Choisissez un collaborateur</strong> dans la liste déroulante</li>
          <li><strong>4. Cliquez sur "Assigner"</strong> pour attribuer le lit au collaborateur</li>
          <li><strong>💡 Astuce :</strong> Seuls les collaborateurs sans logement sont affichés</li>
        </ul>
      </div>
    </div>
  );
}