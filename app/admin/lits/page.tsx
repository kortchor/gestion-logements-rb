'use client';

import { useState, useEffect } from 'react';

export default function AdminLitsPage() {
  const [lits, setLits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ total: 0, occupes: 0, disponibles: 0 });

  useEffect(() => {
    fetchLits();
  }, []);

  async function fetchLits() {
    try {
      const response = await fetch('/api/admin/lits');
      const data = await response.json();
      if (data.success) {
        setLits(data.data);
        const total = data.data.length;
        const occupes = data.data.filter((l: any) => l.est_occupe).length;
        setStats({ total, occupes, disponibles: total - occupes });
      } else {
        setError(data.error || 'Erreur');
      }
    } catch (err) {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  async function libererLit(litId: number) {
    if (!confirm('Voulez-vous vraiment libérer ce lit ?')) return;

    try {
      const response = await fetch(`/api/admin/lits/${litId}/liberer`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        alert('✅ Lit libéré avec succès !');
        fetchLits();
      } else {
        alert(data.error || 'Erreur');
      }
    } catch (err) {
      alert('Erreur de connexion');
    }
  }

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

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🛏️ Gestion des lits</h1>
        <div className="flex gap-4">
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            ✅ {stats.disponibles} disponibles
          </span>
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
            ❌ {stats.occupes} occupés
          </span>
          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
            📊 {stats.total} total
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numéro</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chambre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logement</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collaborateur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Aucun lit trouvé
                  </td>
                </tr>
              ) : (
                lits.map((lit: any) => (
                  <tr key={lit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{lit.id}</td>
                    <td className="px-6 py-4">Lit {lit.numero}</td>
                    <td className="px-6 py-4">{lit.chambre_nom || '-'}</td>
                    <td className="px-6 py-4">{lit.logement_adresse || '-'}</td>
                    <td className="px-6 py-4">
                      {lit.ville && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          lit.ville === 'Cassis' ? 'bg-pink-100 text-pink-800' :
                          lit.ville === 'La Ciotat' ? 'bg-green-100 text-green-800' :
                          lit.ville === 'Marseille' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {lit.ville}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        lit.est_occupe 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {lit.est_occupe ? '🟡 Occupé' : '🟢 Disponible'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {lit.collaborateur_nom ? `${lit.collaborateur_prenom} ${lit.collaborateur_nom}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {lit.est_occupe && (
                        <button
                          onClick={() => libererLit(lit.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm transition-colors"
                        >
                          🚫 Libérer
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
        <p className="text-sm text-blue-700">
          💡 <strong>Astuce :</strong> Utilisez le bouton "Libérer" pour rendre un lit disponible 
          si un collaborateur a quitté son logement.
        </p>
      </div>
    </div>
  );
}