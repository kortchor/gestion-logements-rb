'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ModifierLogement({ params }: { params: Promise<{ id: string }> }) {
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
    date_debut_contrat: '',
    date_fin_contrat: '',
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
        // ✅ DÉBALLER LA PROMESSE AVEC await
        const { id } = await params;
        
        const response = await fetch(`/api/logements/${id}`);
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
            date_debut_contrat: data.data.date_debut_contrat ? data.data.date_debut_contrat.split('T')[0] : '',
            date_fin_contrat: data.data.date_fin_contrat ? data.data.date_fin_contrat.split('T')[0] : '',
            est_visible: data.data.est_visible !== undefined ? data.data.est_visible : true,
            mixte_autorise: data.data.mixte_autorise || false,
            description_detaillee: data.data.description_detaillee || '',
          });

          const chambresResponse = await fetch(`/api/logements/${id}/chambres`);
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
  }, [params]);

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

  const handleFileRemove = (field: string, nameField: string) => {
    setFormData({
      ...formData,
      [field]: '',
      [nameField]: '',
    });
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
      const { id } = await params;
      
      const response = await fetch(`/api/logements/${id}`, {
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

  const renderFileField = (label: string, field: string, nameField: string, placeholder: string) => {
    const hasFile = formData[nameField as keyof typeof formData];
    return (
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {hasFile ? (
          <div className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-gray-50">
            <span className="text-sm text-gray-700">📎 {formData[nameField as keyof typeof formData]}</span>
            <button
              type="button"
              onClick={() => handleFileRemove(field, nameField)}
              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
              title="Supprimer ce fichier"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => handleFileUpload(e, field, nameField)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        )}
        <p className="text-xs text-gray-500 mt-1">{placeholder}</p>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">✏️ Modifier le logement</h1>
        <a href="/logements" className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 no-underline">
          ← Retour
        </a>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Identification */}
          <div className="col-span-2">
            <h2 className="text-lg font-semibold text-blue-600 mb-3">📍 Identification du logement</h2>
            <hr className="mb-4" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du logement *</label>
            <input
              type="text"
              name="nom_logement"
              required
              value={formData.nom_logement}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
            <select name="ville" required value={formData.ville} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md">
              {villes.map((v) => (<option key={v} value={v}>{v}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de logement *</label>
            <select name="type" required value={formData.type} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md">
              {types.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prix loyer mensuel (€)</label>
            <input type="number" name="prix_loyer" step="0.01" value={formData.prix_loyer} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📅 Début du contrat</label>
            <input
              type="date"
              name="date_debut_contrat"
              value={formData.date_debut_contrat}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📅 Fin du contrat</label>
            <input
              type="date"
              name="date_fin_contrat"
              value={formData.date_fin_contrat}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="col-span-2">
            <label className="flex items-center cursor-pointer">
              <input type="checkbox" name="mixte_autorise" checked={formData.mixte_autorise} onChange={handleChange} className="w-5 h-5 text-blue-600 border-gray-300 rounded" />
              <span className="ml-3 text-sm text-gray-700">✅ Autoriser la cohabitation mixte</span>
            </label>
          </div>

          <div>
            <label className="flex items-center cursor-pointer">
              <input type="checkbox" name="est_visible" checked={formData.est_visible} onChange={handleChange} className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700">✅ Logement visible</span>
            </label>
          </div>

          {/* Propriétaire */}
          <div className="col-span-2 mt-4">
            <h2 className="text-lg font-semibold text-blue-600 mb-3">👤 Propriétaire et contacts</h2>
            <hr className="mb-4" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Propriétaire</label>
            <input type="text" name="proprietaire" value={formData.proprietaire} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact propriétaire</label>
            <input type="text" name="contact_proprietaire" value={formData.contact_proprietaire} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>

          {/* Fournisseurs */}
          <div className="col-span-2 mt-4">
            <h2 className="text-lg font-semibold text-blue-600 mb-3">⚡ Fournisseurs</h2>
            <hr className="mb-4" />
          </div>

          <div><label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur EDF</label><input type="text" name="fournisseur_edf" value={formData.fournisseur_edf} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur Eau</label><input type="text" name="fournisseur_eau" value={formData.fournisseur_eau} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur Gaz</label><input type="text" name="fournisseur_gaz" value={formData.fournisseur_gaz} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>

          {/* Assurance */}
          <div className="col-span-2 mt-4">
            <h2 className="text-lg font-semibold text-blue-600 mb-3">🛡️ Assurance</h2>
            <hr className="mb-4" />
          </div>

          <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'assureur</label><input type="text" name="nom_assureur" value={formData.nom_assureur} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Numéro d'assurance</label><input type="text" name="assurance" value={formData.assurance} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
          {renderFileField('📄 Contrat d\'assurance (PDF)', 'assurance_pdf', 'assurance_nom', 'Uploader le contrat d\'assurance (PDF)')}

          {/* Documents */}
          <div className="col-span-2 mt-4">
            <h2 className="text-lg font-semibold text-blue-600 mb-3">📋 Documents du logement</h2>
            <hr className="mb-4" />
          </div>

          {renderFileField('📄 Bail (PDF)', 'bail_pdf', 'bail_nom', 'Uploader le bail (PDF)')}
          {renderFileField('📄 État des lieux (PDF)', 'etat_lieux_pdf', 'etat_lieux_nom', 'Uploader l\'état des lieux (PDF)')}

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">📸 Photos de l'état des lieux</label>
            {formData.etat_lieux_photos ? (
              <div className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-gray-50">
                <span className="text-sm text-gray-700">✅ {JSON.parse(formData.etat_lieux_photos).length} photo(s)</span>
                <button type="button" onClick={() => handleFileRemove('etat_lieux_photos', 'etat_lieux_photos')} className="text-red-500 hover:text-red-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ) : (
              <input type="file" accept=".jpg,.jpeg,.png,.gif" multiple onChange={handlePhotoUpload} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            )}
            <p className="text-xs text-gray-500 mt-1">Uploader les photos (JPG, PNG, GIF)</p>
          </div>

          {/* Description */}
          <div className="col-span-2 mt-4">
            <h2 className="text-lg font-semibold text-blue-600 mb-3">📝 Description</h2>
            <hr className="mb-4" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description détaillée</label>
            <textarea name="description_detaillee" value={formData.description_detaillee} onChange={handleChange} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
        </div>

        {/* Chambres */}
        <div className="mt-8 border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">🛏️ Chambres</h2>
            <button type="button" onClick={ajouterChambre} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">+ Ajouter une chambre</button>
          </div>

          {newChambres.map((chambre, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">{chambre.nom}</h3>
                {newChambres.length > 1 && (
                  <button type="button" onClick={() => supprimerChambre(index)} className="text-red-600 hover:text-red-800 text-sm">Supprimer</button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nom</label>
                  <input type="text" value={chambre.nom} onChange={(e) => handleChambreChange(index, 'nom', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Type de lit</label>
                  <select value={chambre.type_lit} onChange={(e) => handleChambreChange(index, 'type_lit', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    {typesLit.map((t) => (<option key={t} value={t}>{t === 'simple' ? '🛏️ Simple' : '🛏️🛏️ Double'}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nombre de lits</label>
                  <select value={chambre.nombre_lits} onChange={(e) => handleChambreChange(index, 'nombre_lits', parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value={1}>1 lit</option><option value={2}>2 lits</option><option value={3}>3 lits</option><option value={4}>4 lits</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-4">
          <button type="submit" disabled={loading} className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {loading ? 'Modification...' : '💾 Enregistrer'}
          </button>
          <a href="/logements" className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">Annuler</a>
        </div>
      </form>
    </div>
  );
}