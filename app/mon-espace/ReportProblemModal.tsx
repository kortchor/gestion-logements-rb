'use client';

import { useState, useEffect } from 'react';

interface Props {
  bailId: number | null;
  logementAdresse: string;
}

export default function ReportProblemModal({ bailId, logementAdresse }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    document.addEventListener('openReportModal', handleOpen);
    return () => {
      document.removeEventListener('openReportModal', handleOpen);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setDescription('');
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bailId || description.trim() === '') {
      setResult({ success: false, message: 'La description ne peut pas être vide.' });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/problemes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bail_id: bailId,
          description: description,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (response.ok) {
        setTimeout(handleClose, 3000); // Ferme la modale après 3s en cas de succès
      }
    } catch (error) {
      setResult({ success: false, message: 'Erreur de connexion au serveur.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">⚠️ Signaler un problème</h2>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
          </div>
          <p className="text-sm text-gray-600 mt-1">{logementAdresse}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description du problème
              </label>
              <textarea
                id="description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: La chasse d'eau des toilettes du premier étage ne fonctionne plus."
                required
              />
            </div>
            {result && (
              <p className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                {result.message}
              </p>
            )}
          </div>

          <div className="p-6 border-t bg-gray-50 rounded-b-xl">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer le signalement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}