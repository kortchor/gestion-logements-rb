'use client';

import { useState } from 'react';

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
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Voulez-vous vraiment supprimer ${collaborateurPrenom} ${collaborateurNom} ?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/collaborateurs?id=${collaborateurId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      alert('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-red-600 hover:underline bg-transparent border-none cursor-pointer no-underline disabled:opacity-50"
    >
      {loading ? '...' : '🗑️'}
    </button>
  );
}