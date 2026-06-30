'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminTechnicienPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchTechnicien();
  }, [token]);

  const fetchTechnicien = async () => {
    try {
      const params = ['technicien_nom', 'technicien_email', 'technicien_telephone'];
      const promises = params.map((cle) =>
        fetch(`/api/admin/parametres?cle=${cle}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }).then((res) => res.json())
      );

      const results = await Promise.all(promises);
      const data: Record<string, string> = {};
      results.forEach((result) => {
        if (result.success && result.data) {
          data[result.data.cle] = result.data.valeur;
        }
      });

      setFormData({
        nom: data['technicien_nom'] || '',
        email: data['technicien_email'] || '',
        telephone: data['technicien_telephone'] || '',
      });
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur de chargement');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const updates = [
        { cle: 'technicien_nom', valeur: formData.nom },
        { cle: 'technicien_email', valeur: formData.email },
        { cle: 'technicien_telephone', valeur: formData.telephone },
      ];

      for (const update of updates) {
        const response = await fetch('/api/admin/parametres', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(update),
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la mise à jour');
        }
      }

      setSuccess(true);
    } catch (err) {
      setError('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">🔧 Gestion du technicien</h1>
      <p className="text-gray-600 mb-6">
        Ces informations seront utilisées pour les signalements techniques.
      </p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          ✅ Informations mises à jour avec succès !
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom du technicien *</label>
          <input
            type="text"
            required
            value={formData.nom}
            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Jean Dupont"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email du technicien *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="technique@roches-blanches-cassis.com"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone du technicien</label>
          <input
            type="text"
            value={formData.telephone}
            onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="06 12 34 56 78"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Enregistrement...' : '💾 Enregistrer'}
        </button>
      </form>
    </div>
  );
}