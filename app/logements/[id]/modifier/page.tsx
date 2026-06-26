'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ModifierLogement({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logement, setLogement] = useState<any>(null);
  const [formData, setFormData] = useState({
    nom_logement: '',
    adresse: '',
    ville: 'Cassis',
    type: 'Appartement',
    prix_loyer: '',
    proprietaire: '',
    contact_proprietaire: '',
    est_visible: true,
    mixte_autorise: false,
    description_detaillee: '',
  });

  useEffect(() => {
    async function fetchLogement() {
      try {
        const response = await fetch(`/api/logements/${params.id}`);
        const data = await response.json();
        if (data.success) {
          setLogement(data.data);
          setFormData({
            nom_logement: data.data.nom_logement || '',
            adresse: data.data.adresse,
            ville: data.data.ville,
            type: data.data.type,
            prix_loyer: data.data.prix_loyer || '',
            proprietaire: data.data.proprietaire || '',
            contact_proprietaire: data.data.contact_proprietaire || '',
            est_visible: data.data.est_visible !== undefined ? data.data.est_visible : true,
            mixte_autorise: data.data.mixte_autorise || false,
            description_detaillee: data.data.description_detaillee || '',
          });
        } else {
          setError('Logement non trouvé');
        }
      } catch (err) {
        setError('Erreur de chargement');
      }
    }
    fetchLogement();
  }, [params.id]);

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
      const response = await fetch(`/api/logements/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        alert('✅ Logement modifié avec succès !');
        router.push('/logements');
        router.refresh();
      } else {
        setError(result.error || 'Erreur lors de la modification');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  if (!logement && !error) {
    return <div className="container mx-auto p-8 text-center">Chargement...</div>;
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

  const villes = ['Cassis', 'La Ciotat', 'Marseille', 'Roquefort-la-Bédoule'];
  const types = ['Studio', 'Appartement', 'Villa'];

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">✏️ Modifier le logement</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">🏷️ Nom du logement *</label>
            <input
              type="text"
              name="nom_logement"
              required
              value={formData.nom_logement}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
            <input
              type="text"
              name="adresse"
              required
              value={formData.adresse}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
            <select
              name="ville"
              required
              value={formData.ville}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {villes.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de logement *</label>
            <select
              name="type"
              required
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prix loyer mensuel (€)</label>
            <input
              type="number"
              name="prix_loyer"
              step="0.01"
              value={formData.prix_loyer}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Propriétaire</label>
            <input
              type="text"
              name="proprietaire"
              value={formData.proprietaire}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact propriétaire</label>
            <input
              type="text"
              name="contact_proprietaire"
              value={formData.contact_proprietaire}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="mixte_autorise"
                checked={formData.mixte_autorise}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Autoriser la cohabitation mixte</span>
            </label>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="est_visible"
                checked={formData.est_visible}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Logement visible</span>
            </label>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description détaillée</label>
            <textarea
              name="description_detaillee"
              value={formData.description_detaillee}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Modification...' : '💾 Enregistrer les modifications'}
          </button>
          <a
            href="/logements"
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Annuler
          </a>
        </div>
      </form>
    </div>
  );
}