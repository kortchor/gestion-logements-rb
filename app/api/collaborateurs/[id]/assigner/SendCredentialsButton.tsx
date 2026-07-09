'use client';

import { useState } from 'react';

interface Props {
  collaborateurId: number;
  collaborateurNom: string;
  collaborateurPrenom: string;
  collaborateurEmail: string;
}

export default function SendCredentialsButton({
  collaborateurId,
  collaborateurNom,
  collaborateurPrenom,
  collaborateurEmail,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleClick = async () => {
    if (!confirm(`Voulez-vous vraiment envoyer les identifiants à ${collaborateurPrenom} ${collaborateurNom} ?`)) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/collaborateurs/${collaborateurId}/send-credentials`, {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, message: 'Erreur de connexion.' });
    } finally {
      setLoading(false);
      setTimeout(() => setResult(null), 5000); // Cache le message après 5s
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full px-3 py-2 text-sm text-left bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-wait"
      >
        {loading ? 'Envoi en cours...' : '📧 Envoyer les identifiants de connexion'}
      </button>
      {result && (
        <p className={`text-xs mt-2 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}