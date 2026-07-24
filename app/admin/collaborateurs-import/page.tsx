'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import * as XLSX from 'xlsx';

interface ImportSummary {
  total: number;
  created: number;
  updated: number;
  failed: number;
}

interface ImportError {
  row: number;
  error: string;
}

export default function CollaborateursImportPage() {
  const { user, loading } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [error, setError] = useState('');

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return (
      <div className="p-8 text-center text-red-600">
        ❌ Accès refusé. Administrateur requis.
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError('Format non valide. Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        'Nom': 'DUPONT',
        'Prénom': 'Jean',
        'Email': 'jean.dupont@example.com',
        'Téléphone': '06 12 34 56 78',
        'Genre': 'M',
        'Civilité': 'M.',
        'Centre principal': 'Cassis',
        'Centre affectation': 'Marseille',
        'Début contrat': '2024-01-15',
        'Fin contrat': '2025-01-15',
        'Logement': 'Villa sur la Mer',
        'Participation logement': '150',
      },
      {
        'Nom': 'MARTIN',
        'Prénom': 'Marie',
        'Email': 'marie.martin@example.com',
        'Téléphone': '06 98 76 54 32',
        'Genre': 'F',
        'Civilité': 'Mme',
        'Centre principal': 'La Ciotat',
        'Centre affectation': 'Cassis',
        'Début contrat': '2024-02-01',
        'Fin contrat': '2025-02-01',
        'Logement': 'Appartement Centre',
        'Participation logement': '200',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Collaborateurs');

    // Ajuster les largeurs
    const colWidths = [
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 18 },
      { wch: 10 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 18 },
    ];
    ws['!cols'] = colWidths;

    XLSX.write(wb, { bookType: 'xlsx', type: 'binary', filename: 'modele_collaborateurs.xlsx' });
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modele_collaborateurs.xlsx';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    setUploading(true);
    setError('');
    setSummary(null);
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/collaborateurs/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Erreur lors de l\'import');
        return;
      }

      setSummary(result.summary);
      if (result.errors) {
        setErrors(result.errors);
      }
      setFile(null);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de connexion');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold">📥 Import Collaborateurs</h1>
          <p className="text-gray-600 mt-2">Importer une liste de collaborateurs via fichier Excel</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-blue-900 mb-4">📋 Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Téléchargez le modèle Excel ci-dessous</li>
            <li>Remplissez les colonnes obligatoires: <strong>Nom, Prénom, Email</strong></li>
            <li>Les colonnes optionnelles: Téléphone, Genre, Civilité, Centres, Dates, Logement, Participation</li>
            <li>Téléchargez le fichier rempli</li>
            <li>Les collaborateurs existants seront mis à jour, les nouveaux seront créés</li>
          </ol>
        </div>

        {/* Section Template */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">📥 Modèle Excel</h2>
          <p className="text-gray-600 mb-4">Cliquez sur le bouton ci-dessous pour télécharger un modèle rempli avec des exemples :</p>
          <button
            onClick={handleDownloadTemplate}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            📄 Télécharger le modèle
          </button>
        </div>

        {/* Section Upload */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">📤 Importer votre fichier</h2>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="fileInput"
            />
            <label htmlFor="fileInput" className="cursor-pointer">
              <div className="text-4xl mb-2">📁</div>
              <p className="text-gray-700 font-medium">
                {file ? `✅ ${file.name}` : 'Cliquez pour sélectionner un fichier'}
              </p>
              <p className="text-sm text-gray-500 mt-2">Formats acceptés: .xlsx, .xls</p>
            </label>
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            {uploading ? '⏳ Import en cours...' : '🚀 Importer le fichier'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-red-900 mb-2">❌ Erreur</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-lg font-bold mb-6">✅ Résumé de l'import</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total traité</p>
                <p className="text-3xl font-bold text-gray-900">{summary.total}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600">Créés</p>
                <p className="text-3xl font-bold text-green-600">{summary.created}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600">Mis à jour</p>
                <p className="text-3xl font-bold text-blue-600">{summary.updated}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-600">Erreurs</p>
                <p className="text-3xl font-bold text-red-600">{summary.failed}</p>
              </div>
            </div>

            {/* Erreurs détaillées */}
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-bold text-red-900 mb-3">Erreurs rencontrées:</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {errors.map((err, idx) => (
                    <div key={idx} className="text-sm text-red-700">
                      <strong>Ligne {err.row}:</strong> {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-4">
          <Link
            href="/collaborateurs"
            className="flex-1 px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors text-center"
          >
            ← Retour aux collaborateurs
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors text-center"
          >
            Retour au dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
