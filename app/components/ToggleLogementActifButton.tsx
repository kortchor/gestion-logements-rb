'use client';

import { useState } from 'react';

interface Props {
  logementId: number;
  logementAdresse: string;
  estActif: boolean;
}

export default function ToggleLogementActifButton({ logementId, logementAdresse, estActif }: Props) {
  const [loading, setLoading] = useState(false);
  const [actif, setActif] = useState(estActif);

  const handleToggle = async () => {
    const action = actif ? 'désactiver' : 'réactiver';
    if (!confirm(`Voulez-vous vraiment ${action} le logement "${logementAdresse}" ?\n\nUn logement désactivé n'est pas compté dans les loyers mensuels.`)) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/logements/${logementId}/toggle-actif`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setActif(!actif);
        alert(data.message);
      } else {
        alert(data.error || 'Erreur');
      }
    } catch {
      alert('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`text-sm transition-all ${loading ? 'opacity-50' : ''} ${actif ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'}`}
      title={actif ? 'Désactiver (loyer non compté)' : 'Réactiver le logement'}
    >
      {loading ? '...' : actif ? '⏸️' : '▶️'}
    </button>
  );
}
