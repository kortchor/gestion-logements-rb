'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ✅ Définir une interface pour la structure des lits disponibles
interface LitDisponible {
  id: number;
  ville: string;
  logement_adresse: string;
  chambre_nom: string;
  numero: string | number;
}

export default function NouveauCollaborateur() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [litsDisponibles, setLitsDisponibles] = useState<LitDisponible[]>([]); // ✅ Typer l'état
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    civilite: '',
    telephone: '',
    genre: 'F',
    date_arrivee: '',
    date_depart: '',
    date_debut_contrat: '',
    date_fin_contrat: '',
    vehicule: false,
    animal: false,
    commentaire: '',
    centre_principal: '',
    centre_affectation: '',
    lit_id: '',
  });

  useEffect(() => {
    async function fetchLits() {
      try {
        // ✅ Utiliser la bonne route API
        const response = await fetch('/api/logements/disponibles');
        if (!response.ok) {
          throw new Error('Erreur serveur lors de la récupération des lits');
        }
        const logementsData = await response.json();
        
        // ✅ AMÉLIORATION : Utiliser la structure de données hiérarchique de l'API
        const lits = logementsData.flatMap((logement: any) => 
          (logement.chambres || []).flatMap((chambre: any) => 
            (chambre.lits || []).map((lit: any) => ({ 
              ...lit, 
              logement_adresse: logement.adresse, ville: logement.ville, chambre_nom: chambre.nom 
            }))
          )
        );
        setLitsDisponibles(lits.filter((lit: any) => !lit.est_occupe));
      } catch (error) {
        console.error('Erreur:', error);
      }
    }
    fetchLits();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/collaborateurs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        router.push('/collaborateurs');
        router.refresh();
      } else {
        setError(result.error || 'Erreur lors de la création');
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">👤 Ajouter un collaborateur</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Genre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Genre *</label>
            <select
              name="genre"
              required
              value={formData.genre}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="F">👩 Femme</option>
              <option value="M">👨 Homme</option>
            </select>
          </div>

          {/* Civilité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Civilité</label>
            <select
              name="civilite"
              value={formData.civilite}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">--- Sélectionner ---</option>
              <option value="Mme">Mme</option>
              <option value="M.">M.</option>
              <option value="Dr">Dr</option>
              <option value="Me">Me</option>
            </select>
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input
              type="text"
              name="nom"
              required
              value={formData.nom}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Prénom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
            <input
              type="text"
              name="prenom"
              required
              value={formData.prenom}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Centre principal - ADAPTÉ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🏢 Centre principal</label>
            <input
              type="text"
              name="centre_principal"
              value={formData.centre_principal}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: AGRH - Direction des Ressources Humaines"
            />
            <p className="text-xs text-gray-400 mt-1">Exemples : AGRH, AGFI, Direction Technique</p>
          </div>

          {/* Centre affectation - ADAPTÉ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📍 Centre affectation physique</label>
            <input
              type="text"
              name="centre_affectation"
              value={formData.centre_affectation}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: AGFI - Direction Administrative et Financière"
            />
            <p className="text-xs text-gray-400 mt-1">Exemples : AGFI, Hébergement, Restauration</p>
          </div>

          {/* Date d'arrivée */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date d'arrivée (logement) *</label>
            <input
              type="date"
              name="date_arrivee"
              required
              value={formData.date_arrivee}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date de départ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de départ (logement)</label>
            <input
              type="date"
              name="date_depart"
              value={formData.date_depart}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date début contrat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date début contrat *</label>
            <input
              type="date"
              name="date_debut_contrat"
              required
              value={formData.date_debut_contrat}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date fin contrat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date fin contrat</label>
            <input
              type="date"
              name="date_fin_contrat"
              value={formData.date_fin_contrat}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Lit assigné */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigner un lit (optionnel)
            </label>
            <select
              name="lit_id"
              value={formData.lit_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Non assigné</option>
              {litsDisponibles.map((lit) => ( // ✅ Plus besoin de 'any'
                <option key={lit.id} value={lit.id}>
                  {lit.logement_adresse}, {lit.ville} (Chambre: {lit.chambre_nom} - Lit n°{lit.numero})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Seuls les lits disponibles sont affichés
            </p>
          </div>

          {/* Options */}
          <div className="col-span-2 flex gap-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="vehicule"
                checked={formData.vehicule}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">🚗 A un véhicule</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="animal"
                checked={formData.animal}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">🐾 A un animal de compagnie</span>
            </label>
          </div>

          {/* Commentaire */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
            <textarea
              name="commentaire"
              value={formData.commentaire}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Informations supplémentaires sur le collaborateur..."
            />
            <p className="text-xs text-gray-500 mt-1">Ex: ne veut pas cohabiter avec une personne qui a un animal</p>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Création...' : '➕ Créer le collaborateur'}
          </button>
          <Link
            href="/collaborateurs"
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}