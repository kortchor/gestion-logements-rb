'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ModifierLogement({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logement, setLogement] = useState<any>(null);
  const [chambres, setChambres] = useState<any[]>([]);
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

  const [newChambres, setNewChambres] = useState([
    { nom: 'Chambre 1', type_lit: 'simple', nombre_lits: 1 }
  ]);

  const villes = ['Cassis', 'La Ciotat', 'Marseille', 'Roquefort-la-Bédoule'];
  const types = ['Studio', 'Appartement', 'Villa'];
  const typesLit = ['simple', 'double'];

  useEffect(() => {
    async function fetchLogement() {
      try {
        const response = await fetch(`/api/logements/${params.id}`);
        const data = await response.json();
        if (data.success) {
          setLogement(data.data);
          setFormData({
            nom_logement: data.data.nom_logement || '',
            adresse: data.data.adresse,
            ville: data.data.ville,
            type: data.data.type,
            prix_loyer: data.data.prix_loyer || '',
            proprietaire: data.data.proprietaire || '',
            contact_proprietaire: data.data.contact_proprietaire || '',
            fournisseur_edf: data.data.fournisseur_edf || '',
            fournisseur_eau: data.data.fournisseur_eau || '',
            fournisseur_gaz: data.data.fournisseur_gaz || '',
            nom_assureur: data.data.nom_assureur || '',
            assurance: data.data.assurance || '',
            assurance_pdf: data.data.assurance_pdf || '',
            assurance_nom: data.data.assurance_nom || '',
            bail_pdf: data.data.bail_pdf || '',
            bail_nom: data.data.bail_nom || '',
            etat_lieux_pdf: data.data.etat_lieux_pdf || '',
            etat_lieux_nom: data.data.etat_lieux_nom || '',
            etat_lieux_photos: data.data.etat_lieux_photos || '',
            est_visible: data.data.est_visible !== undefined ? data.data.est_visible : true,
            mixte_autorise: data.data.mixte_autorise || false,
            description_detaillee: data.data.description_detaillee || '',
          });

          // Récupérer les chambres
          const chambresResponse = await fetch(`/api/logements/${params.id}/chambres`);
          const chambresData = await chambresResponse.json();
          if (chambresData.success && chambresData.data.length > 0) {
            setNewChambres(chambresData.data);
          }
        } else {
          setError('Logement non trouvé');
        }
      } catch (err) {
        setError('Erreur de chargement');
      }
    }
    fetchLogement();
  }, [params.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleChambreChange = (index: number, field: string, value: any) => {
    const newChambresCopy = [...newChambres];
    newChambresCopy[index] = { ...newChambresCopy[index], [field]: value };
    setNewChambres(newChambresCopy);
  };

  const ajouterChambre = () => {
    setNewChambres([...newChambres, { 
      nom: `Chambre ${newChambres.length + 1}`, 
      type_lit: 'simple', 
      nombre_lits: 1 
    }]);
  };

  const supprimerChambre = (index: number) => {
    if (newChambres.length > 1) {
      const filtered = newChambres.filter((_, i) => i !== index);
      setNewChambres(filtered);
    }
  };

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
      const dataToSend = { ...formData, chambres: newChambres };
      console.log('📦 Données envoyées:', dataToSend);

      const response = await fetch(`/api/logements/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();

      if (response.ok) {
        alert('✅ Logement modifié avec succès !');
        router.push('/logements');
        router.refresh();
      } else {
        setError(result.error || 'Erreur lors de la modification');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  if (!logement && !error) {
    return (
      <div className="container mx-auto p-8 text-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          ❌ {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">✏️ Modifier le logement</h1>
        <a
          href="/logements"
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors no-underline"
        >
          ← Retour
        </a>
      </div>

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
              placeholder="Ex: Appartement Birnie"
            />
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
              <span className="ml-3 text-sm text-gray-700">
                ✅ Autoriser la cohabitation mixte (filles et garçons)
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-8">
              Si non coché, le logement sera réservé au genre du premier occupant
            </p>
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
          {/* SECTION 2 : PROPRIÉTAIRE ET CONTACTS */}
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

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">📄 Contrat d'assurance (PDF)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileUpload(e, 'assurance_pdf', 'assurance_nom')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {formData.assurance_nom && (
              <p className="text-sm text-green-600 mt-1">✅ {formData.assurance_nom}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Uploader le contrat d'assurance au format PDF (max 10 Mo)</p>
          </div>

          {/* ============================================================ */}
          {/* SECTION 5 : DOCUMENTS */}
          {/* ============================================================ */}
          <div className="col-span-2 mt-4">
            <h2 className="text-lg font-semibold text-blue-600 mb-3">📋 Documents du logement</h2>
            <hr className="mb-4" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">📄 Bail (PDF)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileUpload(e, 'bail_pdf', 'bail_nom')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {formData.bail_nom && (
              <p className="text-sm text-green-600 mt-1">✅ {formData.bail_nom}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Uploader le bail signé avec le propriétaire (PDF)</p>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">📄 État des lieux (PDF)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileUpload(e, 'etat_lieux_pdf', 'etat_lieux_nom')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {formData.etat_lieux_nom && (
              <p className="text-sm text-green-600 mt-1">✅ {formData.etat_lieux_nom}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Uploader l'état des lieux signé (PDF)</p>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">📸 Photos de l'état des lieux</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.gif"
              multiple
              onChange={handlePhotoUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {formData.etat_lieux_photos && (
              <p className="text-sm text-green-600 mt-1">
                ✅ {JSON.parse(formData.etat_lieux_photos).length} photo(s) téléchargée(s)
              </p>
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

          {newChambres.map((chambre, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">{chambre.nom}</h3>
                {newChambres.length > 1 && (
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
            {loading ? 'Modification...' : '💾 Enregistrer les modifications'}
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