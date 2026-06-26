'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ModelesPage() {
  const router = useRouter();
  const [modeles, setModeles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    contenu: '',
  });

  useEffect(() => {
    fetchModeles();
  }, []);

  async function fetchModeles() {
    try {
      const response = await fetch('/api/admin/modeles');
      const data = await response.json();
      if (data.success) {
        setModeles(data.data);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editing ? `/api/admin/modeles?id=${editing}` : '/api/admin/modeles';
      const method = editing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setFormData({ nom: '', description: '', contenu: '' });
        setEditing(null);
        fetchModeles();
        alert(editing ? '✅ Modèle mis à jour !' : '✅ Modèle créé !');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce modèle ?')) return;
    try {
      await fetch(`/api/admin/modeles?id=${id}`, { method: 'DELETE' });
      fetchModeles();
      alert('✅ Modèle supprimé !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleEdit = (modele: any) => {
    setEditing(modele.id);
    setFormData({
      nom: modele.nom,
      description: modele.description || '',
      contenu: modele.contenu,
    });
  };

  const variables = [
    '{{NOM}}', '{{PRENOM}}', '{{EMAIL}}', '{{ADRESSE}}',
    '{{VILLE}}', '{{DATE_DEBUT}}', '{{DATE_FIN}}',
    '{{PARTICIPATION}}', '{{DESCRIPTION}}', '{{NUMERO_CONTRAT}}',
    '{{DATE_SIGNATURE}}', '{{CENTRE_PRINCIPAL}}', '{{CENTRE_AFFECTATION}}'
  ];

  if (loading) {
    return (
      <div className="container mx-auto p-8 text-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📄 Modèles de convention</h1>
        <a
          href="/"
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors no-underline"
        >
          ← Retour
        </a>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
        <p className="text-sm text-blue-700">
          💡 Utilisez les variables ci-dessous pour personnaliser vos modèles.
          Elles seront remplacées automatiquement par les données du collaborateur.
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {variables.map((v) => (
            <span key={v} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
              {v}
            </span>
          ))}
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {editing ? '✏️ Modifier le modèle' : '➕ Nouveau modèle'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du modèle *</label>
            <input
              type="text"
              required
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: CDD Saisonnier"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Modèle pour les contrats saisonniers"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Contenu du modèle *</label>
          <textarea
            required
            rows={12}
            value={formData.contenu}
            onChange={(e) => setFormData({ ...formData, contenu: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder={`Exemple :
CONVENTION DE MISE A DISPOSITION D'UN LOGEMENT

Entre LES ROCHES BLANCHES DE CASSIS et {{NOM}} {{PRENOM}}

Logement : {{ADRESSE}}, {{VILLE}}
Période : {{DATE_DEBUT}} au {{DATE_FIN}}
Participation : {{PARTICIPATION}} €/mois

Description du logement :
{{DESCRIPTION}}

Fait à Cassis, le {{DATE_SIGNATURE}}

Signature de l'Employeur : _________________
Signature de l'Occupant : _________________`}
          />
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {editing ? '💾 Mettre à jour' : '➕ Créer le modèle'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormData({ nom: '', description: '', contenu: '' });
              }}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      {/* Liste des modèles */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-xl font-semibold p-6 border-b">📋 Modèles existants</h2>
        {modeles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Aucun modèle de convention créé
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {modeles.map((modele: any) => (
                <tr key={modele.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{modele.nom}</td>
                  <td className="px-6 py-4">{modele.description || '-'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleEdit(modele)}
                      className="text-blue-600 hover:underline mr-3 no-underline"
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(modele.id)}
                      className="text-red-600 hover:underline no-underline"
                    >
                      🗑️ Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}