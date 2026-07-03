'use client';

import { useState } from 'react';

interface SendCredentialsButtonProps {
  collaborateurId: number;
  collaborateurNom: string;
  collaborateurPrenom: string;
  collaborateurEmail: string;
}

export default function SendCredentialsButton({ 
  collaborateurId, 
  collaborateurNom, 
  collaborateurPrenom, 
  collaborateurEmail 
}: SendCredentialsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!confirm(`Envoyer les identifiants à ${collaborateurPrenom} ${collaborateurNom} ?`)) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // ✅ Récupérer le token
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/collaborateurs/${collaborateurId}/send-credentials`, {
        method: 'POST',
        headers: {
          // ✅ AJOUT DU TOKEN DANS LE HEADER
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(data.error || 'Erreur lors de l\'envoi');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleSend}
        disabled={loading}
        className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm ${
          loading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {loading ? '⏳ Envoi...' : '📧 Envoyer les identifiants'}
      </button>
      {success && (
        <p className="text-sm text-green-600 mt-1">✅ Identifiants envoyés !</p>
      )}
      {error && (
        <p className="text-sm text-red-600 mt-1">❌ {error}</p>
      )}
    </div>
  );
}