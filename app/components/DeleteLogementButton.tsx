'use client';

import { useState } from 'react';

interface DeleteLogementButtonProps {
  logementId: number;
  logementAdresse: string;
}

export default function DeleteLogementButton({ logementId, logementAdresse }: DeleteLogementButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Voulez-vous vraiment supprimer ce logement ?\n${logementAdresse}`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/logements?id=${logementId}`, {
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