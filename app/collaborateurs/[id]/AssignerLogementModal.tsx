'use client';

import { useState, useEffect, useMemo } from 'react';

interface LitDisponible {
  id: number;
  numero: string | number;
  est_occupe: boolean;
}

interface ChambreDisponible {
  id: number;
  nom: string;
  lits: LitDisponible[];
  type_lit: string;
}

interface LogementDisponible {
  id: number;
  nom_logement: string;
  adresse: string;
  ville: string;
  type_occupation_effectif: string | null;
  chambres: ChambreDisponible[];
}

interface ModeleConvention {
  id: number;
  nom: string;
}

interface Collaborateur {
  id: number;
  date_arrivee: string | null;
  date_depart: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  collaborateur: Collaborateur | null;
}

export default function AssignerLogementModal({ isOpen, onClose, onSuccess, collaborateur }: Props) {
  if (!isOpen) return null;

  const [logementsDisponibles, setLogementsDisponibles] = useState<LogementDisponible[]>([]);
  const [modelesConvention, setModelesConvention] = useState<ModeleConvention[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [selectedLogement, setSelectedLogement] = useState<number | null>(null);
  const [selectedChambre, setSelectedChambre] = useState<number | null>(null);
  const [selectedLit, setSelectedLit] = useState<number | null>(null);
  const [selectedModele, setSelectedModele] = useState<string>('');
  const [participationMensuelle, setParticipationMensuelle] = useState('');
  const [chambrePrivee, setChambrePrivee] = useState(false);

  const [filtres, setFiltres] = useState({ ville: '', type_lit: '', type_occupation: '' });
  const [villesDisponibles, setVillesDisponibles] = useState<string[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setInitialLoading(true);
      setError(null);
      try {
        const [logementsRes, modelesRes] = await Promise.all([
          fetch('/api/logements/disponibles'),
          fetch('/api/admin/modeles'),
        ]);

        if (!logementsRes.ok) throw new Error('Erreur chargement logements');
        const logementsData = await logementsRes.json();
        if (Array.isArray(logementsData)) {
          setLogementsDisponibles(logementsData);
          const villes = [...new Set(logementsData.map(l => l.ville).filter(Boolean))];
          setVillesDisponibles(villes);
        }

        if (modelesRes.ok) {
          const modelesData = await modelesRes.json();
          if (modelesData.success && modelesData.data.length > 0) {
            setModelesConvention(modelesData.data);
            setSelectedModele(modelesData.data[0].id.toString());
          }
        }
      } catch (err) {
        setError('Impossible de charger les données pour l\'assignation.');
        console.error(err);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const logementsFiltres = useMemo(() => {
    return logementsDisponibles.filter(logement => {
      if (filtres.ville && logement.ville !== filtres.ville) return false;
      if (filtres.type_occupation) {
        if (filtres.type_occupation === 'en_attente') {
          if (logement.chambres?.some(c => c.lits?.some(l => l.est_occupe))) return false;
        } else if (logement.type_occupation_effectif && logement.type_occupation_effectif !== filtres.type_occupation && logement.type_occupation_effectif !== 'mixte') {
          return false;
        }
      }
      if (filtres.type_lit) {
        if (!logement.chambres?.some(c => c.type_lit === filtres.type_lit && c.lits?.some(l => !l.est_occupe))) return false;
      }
      return true;
    });
  }, [logementsDisponibles, filtres]);

  const handleAssigner = async () => {
    if (!selectedLit || !selectedModele || !collaborateur) {
      setError('Veuillez sélectionner un lit et un modèle de convention.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload: any = {
        lit_id: selectedLit,
        modele_convention_id: parseInt(selectedModele),
        chambre_privée: chambrePrivee,
      };
      if (participationMensuelle) {
        payload.participation_mensuelle = parseFloat(participationMensuelle);
      }

      const response = await fetch(`/api/collaborateurs/${collaborateur.id}/assigner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'assignation');
      }

      setSuccessMessage('Assignation réussie ! La page va se rafraîchir.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000); // Attendre 2s avant de fermer
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Assigner un logement</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg">{error}</div>}
          {successMessage && <div className="bg-green-100 text-green-700 p-3 rounded-lg">{successMessage}</div>}

          {initialLoading ? (
            <div className="text-center py-8">Chargement des logements disponibles...</div>
          ) : (
            <>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="text-sm font-medium text-gray-700 mb-2">🔍 Filtrer</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select value={filtres.ville} onChange={e => setFiltres({ ...filtres, ville: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option value="">Toutes les villes</option>
                    {villesDisponibles.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select value={filtres.type_lit} onChange={e => setFiltres({ ...filtres, type_lit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option value="">Tous types de lit</option>
                    <option value="simple">🛏️ Simple</option>
                    <option value="double">🛏️🛏️ Double</option>
                  </select>
                  <select value={filtres.type_occupation} onChange={e => setFiltres({ ...filtres, type_occupation: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option value="">Toutes occupations</option>
                    <option value="mixte">🔄 Mixte</option>
                    <option value="F">👩 Femmes</option>
                    <option value="M">👨 Hommes</option>
                    <option value="en_attente">⏳ En attente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logement</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-0 max-w-full"
                  value={selectedLogement || ''}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setSelectedLogement(isNaN(val) ? null : val);
                    setSelectedChambre(null);
                    setSelectedLit(null);
                  }}
                  style={{ width: '100%' }}
                >
                  <option value="">Sélectionner un logement</option>
                  {logementsFiltres.map(logement => (
                    <option key={logement.id} value={logement.id} title={`${logement.adresse}, ${logement.ville}${logement.nom_logement ? ` (${logement.nom_logement})` : ''}`}>
                      {logement.nom_logement
                        ? `${logement.nom_logement} — ${logement.adresse}, ${logement.ville}`
                        : `${logement.adresse}, ${logement.ville}`
                      }
                    </option>
                  ))}
                </select>
              </div>

              {selectedLogement && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chambre</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={selectedChambre || ''}
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setSelectedChambre(isNaN(val) ? null : val);
                      setSelectedLit(null);
                    }}
                  >
                    <option value="">Sélectionner une chambre</option>
                    {logementsFiltres.find(l => l.id === selectedLogement)?.chambres
                      ?.filter(c => c?.lits?.some(l => !l.est_occupe))
                      .map(chambre => (
                        <option key={chambre.id} value={chambre.id}>
                          {chambre.nom} ({chambre.lits?.filter(l => !l.est_occupe).length || 0} lit(s) libre(s))
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {selectedChambre && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lit</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={selectedLit || ''}
                    onChange={e => setSelectedLit(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Sélectionner un lit</option>
                    {logementsFiltres.find(l => l.id === selectedLogement)?.chambres
                      ?.find(c => c.id === selectedChambre)?.lits
                      ?.filter(lit => !lit.est_occupe)
                      .map(lit => (
                        <option key={lit.id} value={lit.id}>Lit n°{lit.numero} ✅ Libre</option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">💰 Participation mensuelle (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={participationMensuelle}
                  onChange={e => setParticipationMensuelle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Ex: 150.00"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded border">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chambrePrivee}
                    onChange={e => setChambrePrivee(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="ml-3 text-sm font-medium">🛏️ Chambre privée</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-8">Si coché, tous les lits libres de la chambre seront assignés au collaborateur.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📄 Modèle de convention</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={selectedModele}
                  onChange={e => setSelectedModele(e.target.value)}
                >
                  {modelesConvention.length === 0 ? (
                    <option>Aucun modèle disponible</option>
                  ) : (
                    modelesConvention.map(modele => (
                      <option key={modele.id} value={modele.id}>{modele.nom}</option>
                    ))
                  )}
                </select>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t mt-auto">
          <button
            onClick={handleAssigner}
            disabled={initialLoading || isSubmitting || !selectedLit || !selectedModele}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Assignation en cours...' : 'Confirmer l\'assignation'}
          </button>
        </div>
      </div>
    </div>
  );
}
