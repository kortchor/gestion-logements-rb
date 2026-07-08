'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ✅ NOUVEAU : Composant réutilisable pour l'upload de fichier
interface FileInputProps {
  label: string;
  name: string;
  fileName: string | undefined;
  onFileChange: (name: string, file: File | null) => void;
  accept?: string;
  placeholder?: string;
}

function FileInput({ label, name, fileName, onFileChange, accept = '.pdf', placeholder }: FileInputProps) {
  const handleRemove = () => {
    onFileChange(name, null);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileChange(name, e.target.files?.[0] || null);
  };

  return (
    <div className="col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {fileName ? (
        <div className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-gray-50">
          <span className="text-sm text-gray-700">📎 {fileName}</span>
          <button type="button" onClick={handleRemove} className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-full hover:bg-red-50" title="Supprimer ce fichier">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>
      ) : (
        <input type="file" accept={accept} onChange={handleFileSelected} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
      )}
      {placeholder && <p className="text-xs text-gray-500 mt-1">{placeholder}</p>}
    </div>
  );
}

const villes = ['Cassis', 'La Ciotat', 'Marseille', 'Roquefort-la-Bédoule'];
const types = ['Studio', 'Appartement', 'Villa'];
const typesLit = ['simple', 'double'];

export default function NouveauLogement() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [chambres, setChambres] = useState([
    { nom: 'Chambre 1', type_lit: 'simple', nombre_lits: 1 }
  ]);

  const [formData, setFormData] = useState({
    nom_logement: '',
    adresse: '',
    ville: 'Cassis',
    type: 'Appartement',
    prix_loyer: '',
    proprietaire: '',
    contact_proprietaire: '',
    fournisseur_edf: '',
    fournisseur_eau: '',
    fournisseur_gaz: '',
    nom_assureur: '',
    assurance: '',
    assurance_pdf: '',
    assurance_nom: '',
    bail_pdf: '',
    bail_nom: '',
    etat_lieux_pdf: '',
    etat_lieux_nom: '',
    etat_lieux_photos: '',
    est_visible: true,
    mixte_autorise: false,
    description_detaillee: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleChambreChange = (index: number, field: string, value: any) => {
    const newChambres = [...chambres];
    newChambres[index] = { ...newChambres[index], [field]: value };
    setChambres(newChambres);
  };

  const ajouterChambre = () => {
    setChambres([...chambres, { 
      nom: `Chambre ${chambres.length + 1}`, 
      type_lit: 'simple', 
      nombre_lits: 1 
    }]);
  };

  const supprimerChambre = (index: number) => {
    if (chambres.length > 1) {
      const newChambres = chambres.filter((_, i) => i !== index);
      setChambres(newChambres);
    }
  };

  // 📁 Upload de fichier
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string, nameField: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Le fichier doit être au format PDF');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Le fichier ne doit pas dépasser 10 Mo');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          [field]: reader.result as string,
          [nameField]: file.name,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // 🗑️ Suppression de fichier
  const handleFileRemove = (field: string, nameField: string) => {
    setFormData({
      ...formData,
      [field]: '',
      [nameField]: '',
    });
  };

  // 📸 Upload de photos (état des lieux)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileList = Array.from(files);
      const promises = fileList.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              name: file.name,
              data: reader.result,
            });
          };
          reader.readAsDataURL(file);
        });
      });
      Promise.all(promises).then((results) => {
        setFormData({
          ...formData,
          etat_lieux_photos: JSON.stringify(results),
        });
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const dataToSend = { ...formData, chambres };
      console.log('📦 Données envoyées:', dataToSend);

      const response = await fetch('/api/logements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();
      console.log('📩 Réponse:', result);

      if (response.ok) {
        router.push('/logements');
        router.refresh();
      } else {
        setError(result.error || 'Erreur lors de la création');
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🏠 Ajouter un logement</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ============================================================ */}
          {/* SECTION 1 : IDENTIFICATION */}
          {/* ============================================================ */}
          <div className="col-span-2">
            <h2 className="text-lg font-semibold text-blue-600 mb-3">📍 Identification du logement</h2>
            <hr className="mb-4" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">🏷️ Nom du logement *</label>
            <input
              type="text"
              name="nom_logement"
              required
              value={formData.nom_logement}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Appartement Birnie, Villa des Pins..."
            />
            <p className="text-xs text-gray-500 mt-1">Donnez un nom identifiable au logement</p>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
            <input
              type="text"
              name="adresse"
              required
              value={formData.adresse}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: 12 Rue des Calanques, Cassis"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
            <select
              name="ville"
              required
              value={formData.ville}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {villes.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de logement *</label>
            <select
              name="type"
              required
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">💰 Prix loyer mensuel (€)</label>
            <input
              type="number"
              name="prix_loyer"
              step="0.01"
              value={formData.prix_loyer}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div className="col-span-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="mixte_autorise"
                checked={formData.mixte_autorise}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-700">✅ Autoriser la cohabitation mixte (filles et garçons)</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-8">Si non coché, le logement sera réservé au genre du premier occupant</p>
          </div>

          <div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="est_visible"
                checked={formData.est_visible}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">✅ Logement visible</span>
            </label>
          </div>

          {/* ============================================================ */}
          {/* SECTION 2 : PROPRIÉTAIRE */}
          {/* ============================================================ */}
          <div className="col-span-2 mt-4">
            <h2 className="text-lg font-semibold text-blue-600 mb-3">👤 Propriétaire et contacts</h2>
            <hr className="mb-4" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Propriétaire</label>
            <input
              type="text"
              name="proprietaire"
              value={formData.proprietaire}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nom du propriétaire"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact propriétaire</label>
            <input
              type="text"
              name="contact_proprietaire"
              value={formData.contact_proprietaire}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Téléphone ou email"
            />
          </div>

          {/* ============================================================ */}
          {/* SECTION 3 : FOURNISSEURS */}
          {/* ============================================================ */}
          <div className="col-span-2 mt-4">
            <h2 className="text-lg font-semibold text-blue-600 mb-3">⚡ Fournisseurs</h2>
            <hr className="mb-4" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur EDF</label>
            <input
              type="text"
              name="fournisseur_edf"
              value={formData.fournisseur_edf}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nom du fournisseur d'électricité"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur Eau</label>
            <input
              type="text"
              name="fournisseur_eau"
              value={formData.fournisseur_eau}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nom du fournisseur d'eau"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur Gaz</label>
            <input
              type="text"
              name="fournisseur_gaz"
              value={formData.fournisseur_gaz}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nom du fournisseur de gaz"
            />
          </div>

          {/* ============================================================ */}
          {/* SECTION 4 : ASSURANCE */}
          {/* ============================================================ */}
          <div className="col-span-2 mt-4">
            <h2 className="text-lg font-semibold text-blue-600 mb-3">🛡️ Assurance</h2>
            <hr className="mb-4" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'assureur</label>
            <input
              type="text"
              name="nom_assureur"
              value={formData.nom_assureur}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nom de la compagnie d'assurance"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numéro d'assurance</label>
            <input
              type="text"
              name="assurance"
              value={formData.assurance}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Numéro de police d'assurance"
            />
          </div>

          <FileInput
            label="📄 Contrat d'assurance (PDF)"
            name="assurance_pdf"
            fileName={formData.assurance_nom}
            onFileChange={handleFileChange}
            placeholder="Uploader le contrat d'assurance au format PDF (max 10 Mo)"
          />

          {/* ============================================================ */}
          {/* SECTION 5 : DOCUMENTS */}
          {/* ============================================================ */}
          <div className="col-span-2 mt-4">
            <h2 className="text-lg font-semibold text-blue-600 mb-3">📋 Documents du logement</h2>
            <hr className="mb-4" />
          </div>

          <FileInput
            label="📄 Bail (PDF)"
            name="bail_pdf"
            fileName={formData.bail_nom}
            onFileChange={handleFileChange}
            placeholder="Uploader le bail signé avec le propriétaire (PDF)"
          />

          <FileInput
            label="📄 État des lieux (PDF)"
            name="etat_lieux_pdf"
            fileName={formData.etat_lieux_nom}
            onFileChange={handleFileChange}
            placeholder="Uploader l'état des lieux signé (PDF)"
          />

          {/* Photos */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">📸 Photos de l'état des lieux</label>
            {formData.etat_lieux_photos ? (
              <div className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-gray-50">
                <span className="text-sm text-gray-700">
                  ✅ {JSON.parse(formData.etat_lieux_photos).length} photo(s) téléchargée(s)
                </span>
                <button
                  type="button"
                  onClick={() => handleFileRemove('etat_lieux_photos', 'etat_lieux_photos')}
                  className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-full hover:bg-red-50"
                  title="Supprimer toutes les photos"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.gif"
                multiple
                onChange={handlePhotoUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            <p className="text-xs text-gray-500 mt-1">Uploader les photos de l'état des lieux (JPG, PNG, GIF)</p>
          </div>

          {/* ============================================================ */}
          {/* SECTION 6 : DESCRIPTION */}
          {/* ============================================================ */}
          <div className="col-span-2 mt-4">
            <h2 className="text-lg font-semibold text-blue-600 mb-3">📝 Description</h2>
            <hr className="mb-4" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description détaillée</label>
            <textarea
              name="description_detaillee"
              value={formData.description_detaillee}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Décrivez précisément les pièces, équipements et particularités du logement"
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 7 : CHAMBRES */}
        {/* ============================================================ */}
        <div className="mt-8 border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">🛏️ Chambres</h2>
            <button
              type="button"
              onClick={ajouterChambre}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              + Ajouter une chambre
            </button>
          </div>

          {chambres.map((chambre, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">{chambre.nom}</h3>
                {chambres.length > 1 && (
                  <button
                    type="button"
                    onClick={() => supprimerChambre(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Supprimer
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nom</label>
                  <input
                    type="text"
                    value={chambre.nom}
                    onChange={(e) => handleChambreChange(index, 'nom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Type de lit</label>
                  <select
                    value={chambre.type_lit}
                    onChange={(e) => handleChambreChange(index, 'type_lit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {typesLit.map((t) => (
                      <option key={t} value={t}>
                        {t === 'simple' ? '🛏️ Simple' : '🛏️🛏️ Double'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nombre de lits</label>
                  <select
                    value={chambre.nombre_lits}
                    onChange={(e) => handleChambreChange(index, 'nombre_lits', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value={1}>1 lit</option>
                    <option value={2}>2 lits</option>
                    <option value={3}>3 lits</option>
                    <option value={4}>4 lits</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ============================================================ */}
        {/* BOUTONS */}
        {/* ============================================================ */}
        <div className="mt-6 flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Création...' : '➕ Créer le logement'}
          </button>
          <a
            href="/logements"
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors no-underline"
          >
            Annuler
          </a>
        </div>
      </form>
    </div>
  );
}