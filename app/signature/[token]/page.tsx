'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignaturePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [signatureData, setSignatureData] = useState<any>(null);
  const [error, setError] = useState('');
  const [signe, setSigne] = useState(false);

  useEffect(() => {
    async function fetchContrat() {
      try {
        const response = await fetch(`/api/signature/${params.token}`);
        const data = await response.json();
        if (data.success) {
          setSignatureData(data.data);
        } else {
          setError(data.error || 'Contrat non trouvé');
        }
      } catch (err) {
        setError('Erreur de chargement');
      }
    }
    fetchContrat();
  }, [params.token]);

  const handleSignature = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/signature/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signe: true }),
      });
      const data = await response.json();
      if (data.success) {
        setSigne(true);
        alert('✅ Convention signée avec succès !');
        setTimeout(() => router.push('/'), 3000);
      } else {
        alert(data.error || 'Erreur lors de la signature');
      }
    } catch (err) {
      alert('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-8 max-w-2xl">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          ❌ {error}
        </div>
      </div>
    );
  }

  if (!signatureData) {
    return (
      <div className="container mx-auto p-8 text-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6">✍️ Signature de la convention</h1>

        {signe ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            ✅ Convention signée avec succès !
          </div>
        ) : (
          <>
            <div className="bg-gray-50 p-4 rounded mb-6">
              <p><strong>Collaborateur :</strong> {signatureData.prenom} {signatureData.nom}</p>
              <p><strong>Logement :</strong> {signatureData.adresse}</p>
              <p><strong>Période :</strong> {signatureData.date_debut} - {signatureData.date_fin || 'Non définie'}</p>
            </div>

            <p className="text-gray-600 mb-4">
              En cliquant sur "Signer", vous acceptez les conditions de la convention locative.
            </p>

            <button
              onClick={handleSignature}
              disabled={loading}
              className={`w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Traitement...' : '✍️ Signer la convention'}
            </button>

            <p className="text-xs text-gray-500 mt-4">
              Cette signature est juridiquement engageante.
            </p>
          </>
        )}
      </div>
    </div>
  );
}