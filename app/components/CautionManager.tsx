'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CautionData {
  id: number;
  montant_caution: number;
  date_versement_caution: string | null;
  date_restitution_caution: string | null;
  statut_caution: 'en_attente' | 'versee' | 'restituee' | 'retenue';
  justificatif_caution_url: string | null;
  justificatif_caution_public_id: string | null;
  motif_retenue: string | null;
  collaborateur_id: number;
  logement_id: number;
  date_debut: string;
  date_fin: string;
}

interface Props {
  bailId: number;
  onUpdate?: () => void;
}

const statutOptions = [
  { value: 'en_attente', label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'versee', label: 'Versée', color: 'bg-green-100 text-green-800' },
  { value: 'restituee', label: 'Restituée', color: 'bg-blue-100 text-blue-800' },
  { value: 'retenue', label: 'Retenue', color: 'bg-red-100 text-red-800' },
];

export default function CautionManager({ bailId, onUpdate }: Props) {
  const [caution, setCaution] = useState<CautionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // État du formulaire
  const [formData, setFormData] = useState({
    montant_caution: '',
    date_versement_caution: '',
    date_restitution_caution: '',
    statut_caution: 'en_attente',
    motif_retenue: '',
  });

  // Charger les données de la caution
  useEffect(() => {
    fetchCaution();
  }, [bailId]);

  const fetchCaution = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/baux/${bailId}/caution`);
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setCaution(data);
      setFormData({
        montant_caution: data.montant_caution?.toString() || '',
        date_versement_caution: data.date_versement_caution || '',
        date_restitution_caution: data.date_restitution_caution || '',
        statut_caution: data.statut_caution || 'en_attente',
        motif_retenue: data.motif_retenue || '',
      });
    } catch (err) {
      setError('Impossible de charger les informations de caution');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        montant_caution: parseFloat(formData.montant_caution) || 0,
        date_versement_caution: formData.date_versement_caution || null,
        date_restitution_caution: formData.date_restitution_caution || null,
        statut_caution: formData.statut_caution,
        motif_retenue: formData.motif_retenue || null,
      };

      const response = await fetch(`/api/baux/${bailId}/caution`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde');
      
      const updated = await response.json();
      setCaution(updated);
      setSuccess('Caution mise à jour avec succès !');
      if (onUpdate) onUpdate();
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier la taille (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Le fichier ne doit pas dépasser 10MB');
      return;
    }

    // Vérifier le type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Format non supporté. Utilisez JPG, PNG, GIF, WEBP ou PDF.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'cautions');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Erreur lors de l\'upload');
      
      const result = await response.json();
      
      // Mettre à jour la caution avec le nouveau justificatif
      const updateResponse = await fetch(`/api/baux/${bailId}/caution`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          justificatif_caution_url: result.url,
          justificatif_caution_public_id: result.public_id,
        }),
      });

      if (!updateResponse.ok) throw new Error('Erreur lors de la mise à jour');
      
      const updated = await updateResponse.json();
      setCaution(updated);
      setSuccess('Justificatif uploadé avec succès !');
      if (onUpdate) onUpdate();
    } catch (err) {
      setError('Erreur lors de l\'upload du justificatif');
      console.error(err);
    } finally {
      setUploading(false);
      // Réinitialiser l'input
      e.target.value = '';
    }
  };

  const handleDeleteJustificatif = async () => {
    if (!caution?.justificatif_caution_public_id) return;
    
    if (!confirm('Voulez-vous vraiment supprimer ce justificatif ?')) return;

    try {
      // Supprimer de Cloudinary
      const deleteResponse = await fetch(
        `/api/upload?public_id=${caution.justificatif_caution_public_id}`,
        { method: 'DELETE' }
      );

      if (!deleteResponse.ok) throw new Error('Erreur lors de la suppression');

      // Mettre à jour la caution
      const updateResponse = await fetch(`/api/baux/${bailId}/caution`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          justificatif_caution_url: null,
          justificatif_caution_public_id: null,
        }),
      });

      if (!updateResponse.ok) throw new Error('Erreur lors de la mise à jour');
      
      const updated = await updateResponse.json();
      setCaution(updated);
      setSuccess('Justificatif supprimé avec succès !');
      if (onUpdate) onUpdate();
    } catch (err) {
      setError('Erreur lors de la suppression');
      console.error(err);
    }
  };

  const getStatutBadge = (statut: string) => {
    const option = statutOptions.find(s => s.value === statut);
    return option ? (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${option.color}`}>
        {option.label}
      </span>
    ) : null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          💰 Gestion de la caution
          {caution && getStatutBadge(caution.statut_caution)}
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Montant de la caution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Montant de la caution (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.montant_caution}
              onChange={(e) => setFormData({ ...formData, montant_caution: e.target.value })}
              required
            />
          </div>

          {/* Statut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.statut_caution}
              onChange={(e) => setFormData({ ...formData, statut_caution: e.target.value })}
            >
              {statutOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date de versement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de versement
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.date_versement_caution}
              onChange={(e) => setFormData({ ...formData, date_versement_caution: e.target.value })}
            />
          </div>

          {/* Date de restitution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de restitution
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.date_restitution_caution}
              onChange={(e) => setFormData({ ...formData, date_restitution_caution: e.target.value })}
            />
          </div>
        </div>

        {/* Motif de retenue */}
        {formData.statut_caution === 'retenue' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motif de la retenue
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              value={formData.motif_retenue}
              onChange={(e) => setFormData({ ...formData, motif_retenue: e.target.value })}
              placeholder="Décrivez les motifs de la retenue..."
              required
            />
          </div>
        )}

        {/* Bouton de sauvegarde */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </button>
        </div>
      </form>

      {/* Section Justificatif */}
      <div className="mt-6 border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          📎 Justificatif de caution
        </h3>

        {caution?.justificatif_caution_url ? (
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <a
              href={caution.justificatif_caution_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-2"
            >
              📄 Voir le justificatif
            </a>
            <button
              onClick={handleDeleteJustificatif}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Supprimer
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              id="justificatif"
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <label
              htmlFor="justificatif"
              className="cursor-pointer text-blue-600 hover:text-blue-800"
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  Upload en cours...
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-2">📤</div>
                  <p className="font-medium">Cliquez pour uploader un justificatif</p>
                  <p className="text-sm text-gray-500 mt-1">
                    JPG, PNG, GIF, WEBP ou PDF (max 10MB)
                  </p>
                </div>
              )}
            </label>
          </div>
        )}
      </div>

      {/* Informations du bail */}
      {caution && (
        <div className="mt-6 border-t border-gray-200 pt-4 text-sm text-gray-500">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Période du bail :</span>{' '}
              {format(new Date(caution.date_debut), 'dd/MM/yyyy', { locale: fr })} -{' '}
              {format(new Date(caution.date_fin), 'dd/MM/yyyy', { locale: fr })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}