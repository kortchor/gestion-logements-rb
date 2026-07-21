'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';

interface DeleteCollaborateurButtonProps {
  collaborateurId: number;
  collaborateurNom: string;
  collaborateurPrenom: string;
}

export default function DeleteCollaborateurButton({ 
  collaborateurId, 
  collaborateurNom, 
  collaborateurPrenom 
}: DeleteCollaborateurButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const isReadOnly = user?.role === 'admin_readonly';

  // Masquer le bouton si utilisateur est admin_readonly
  if (isReadOnly) {
    return null;
  }

  const handleDelete = async () => {
    if (!confirm(`Êtes-vous certain de vouloir supprimer définitivement ${collaborateurPrenom} ${collaborateurNom} ? Cette action ne peut pas être annulée.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/collaborateurs?id=${collaborateurId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ ${data.message || 'Collaborateur supprimé avec succès'}`);
        window.location.reload();
      } else {
        alert(`❌ ${data.error || 'Erreur lors de la suppression'}`);
      }
    } catch (error) {
      console.error(error);
      alert('❌ Erreur de connexion lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-red-600 hover:text-red-900 hover:underline bg-transparent border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Supprimer ce collaborateur"
    >
      {loading ? '⏳' : '🗑️'}
    </button>
  );
}