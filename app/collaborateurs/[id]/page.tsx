'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation'; // ✅ Importer useParams
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DeleteCollaborateurButton from '@/app/components/DeleteCollaborateurButton';
import CautionManager from '@/app/components/CautionManager';

interface Collaborateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  genre: string | null;
  role: string;
  est_actif: boolean;
  date_arrivee: string | null;
  date_depart: string | null;
  date_debut_contrat: string | null;
  date_fin_contrat: string | null;
  vehicule: boolean;
  animal: boolean;
  commentaire: string | null;
  centre_principal: string | null;
  centre_affectation: string | null;
  clefs: string | null;
  created_at: string;
}

interface Bail {
  id: number;
  date_debut: string;
  date_fin: string;
  participation_mensuelle: number | null;
  chambre_privée: boolean;
  signe: boolean;
  logement_id: number;
  logement_nom: string;
  logement_adresse: string;
  chambre_id: number;
  chambre_nom: string;
  lit_id: number;
  lit_numero: string;
  montant_caution: number | null;
  statut_caution: string;
  justificatif_caution_url: string | null;
}

// ✅ Définir des types précis pour les logements disponibles
interface LitDisponible {
  id: number;
  numero: string | number;
  est_occupe: boolean;
}

interface ChambreDisponible {
  id: number;
  nom: string;
  lits: LitDisponible[];
}

interface LogementDisponible {
  id: number;
  nom_logement: string;
  adresse: string;
  ville: string;
  type_occupation_effectif: string | null;
  chambres: ChambreDisponible[];
}

export default function CollaborateurPage() {
  const router = useRouter();
  const [collaborateur, setCollaborateur] = useState<Collaborateur | null>(null);
  const [bauxActifs, setBauxActifs] = useState<Bail[]>([]);
  const [bauxHistorique, setBauxHistorique] = useState<Bail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'actif' | 'historique'>('actif');
  const params = useParams(); // ✅ Utiliser le hook
  const [collaborateurId, setCollaborateurId] = useState<number | null>(null);

  // États pour la modale d'assignation
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [logementsDisponibles, setLogementsDisponibles] = useState<LogementDisponible[]>([]); // ✅ Utiliser le bon type
  const [selectedLogement, setSelectedLogement] = useState<number | null>(null);
  const [selectedChambre, setSelectedChambre] = useState<number | null>(null);
  const [selectedLit, setSelectedLit] = useState<number | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [modelesConvention, setModelesConvention] = useState<any[]>([]);
  const [selectedModele, setSelectedModele] = useState<string>('');

  // États pour les filtres
  const [filtres, setFiltres] = useState({
    ville: '',
    type_lit: '',
    type_occupation: '',
  });
  const [villesDisponibles, setVillesDisponibles] = useState<string[]>([]);
  const [participationMensuelle, setParticipationMensuelle] = useState('');
  const [chambrePrivee, setChambrePrivee] = useState(false);

  // Logements filtrés
  const logementsFiltres = logementsDisponibles.filter(logement => {
    if (filtres.ville && logement.ville !== filtres.ville) return false;
    
    if (filtres.type_occupation) {
      if (filtres.type_occupation === 'en_attente') {
        // ✅ S'assurer que logement.chambres est un tableau avant d'utiliser .some()
        const hasOccupied = Array.isArray(logement.chambres) && logement.chambres.some(c =>
          Array.isArray(c.lits) && c.lits.some(l => l.est_occupe)
        );
        if (hasOccupied) return false;
      } else {
        if (logement.type_occupation_effectif && 
            logement.type_occupation_effectif !== filtres.type_occupation &&
            logement.type_occupation_effectif !== 'mixte') {
          return false;
        }
      }
    }
    
    return true;
  });

  useEffect(() => {
    async function fetchParamsAndData() {
      // ✅ CORRECTION : Attendre que les params soient disponibles
      if (!params || !params.id) {
        console.log("⏳ En attente des paramètres de l'URL...");
        return;
      }

      try {
        const id = params.id as string; // ✅ Récupérer l'ID depuis le hook
        const idNumber = parseInt(id, 10);
        
        if (isNaN(idNumber)) {
          setError('ID de collaborateur invalide');
          setLoading(false);
          return;
        }
        
        setCollaborateurId(idNumber);
        await fetchAllData(idNumber);
        await fetchModelesConvention();
      } catch (err) {
        console.error('Erreur:', err);
        setError('Impossible de charger les informations');
        setLoading(false);
      }
    }
    
    fetchParamsAndData();
  }, [params.id]); // ✅ Dépendre de params.id

  const fetchAllData = async (id: number) => {
    await fetchCollaborateur(id);
    await fetchBaux(id);
    setLoading(false);
  };

  const fetchCollaborateur = async (id: number) => {
    try {
      const response = await fetch(`/api/collaborateurs/${id}`);
      if (!response.ok) throw new Error('Erreur lors du chargement du collaborateur');
      const data = await response.json();
      if (data.success) {
        setCollaborateur(data.data);
      } else {
        setError(data.error || 'Collaborateur non trouvé');
      }
    } catch (err) {
      setError('Impossible de charger les informations du collaborateur');
      console.error(err);
    }
  };

  const fetchBaux = async (id: number) => {
    try {
      const response = await fetch(`/api/collaborateurs/${id}/baux`);
      if (!response.ok) {
        console.log('⚠️ Baux: réponse non OK');
        setBauxActifs([]);
        setBauxHistorique([]);
        return;
      }
      const result = await response.json();

      if (result.success) {
        const aujourdhui = new Date();
        const actifs = result.data.filter((bail: Bail) => new Date(bail.date_fin) >= aujourdhui);
        const historique = result.data.filter((bail: Bail) => new Date(bail.date_fin) < aujourdhui);
        setBauxActifs(actifs);
        setBauxHistorique(historique);
      }
    } catch (err) {
      console.error('Erreur chargement baux:', err);
      setBauxActifs([]);
      setBauxHistorique([]);
    }
  };

  const fetchLogementsDisponibles = async () => {
    try {
      const response = await fetch('/api/logements/disponibles');
      if (!response.ok) {
        throw new Error('La réponse du serveur n\'est pas OK');
      }
      const logementsData = await response.json();

      // ✅ Traiter directement le tableau de logements
      if (Array.isArray(logementsData)) {
        setLogementsDisponibles(logementsData);
        
        // Extraire les villes uniques pour le filtre
        const villes = [...new Set(logementsData.map(l => l.ville).filter(v => v))];
        setVillesDisponibles(villes);
      } else {
        throw new Error('Le format des données des logements est incorrect.');
      }
    } catch (err) {
      console.error('Erreur chargement logements:', err);
      setError('Erreur lors du chargement des logements disponibles');
    }
  };

  const fetchModelesConvention = async () => {
    try {
      const response = await fetch('/api/admin/modeles');
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setModelesConvention(data.data);
        setSelectedModele(data.data[0].id.toString());
      }
    } catch (err) {
      console.error('Erreur chargement modèles:', err);
    }
  };

  const handleDesassigner = async () => {
    if (bauxActifs.length === 0) return;
    if (!confirm('Voulez-vous vraiment désassigner ce collaborateur de son logement ?')) return;

    try {
      const response = await fetch(`/api/collaborateurs/${collaborateurId}/desassigner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // Le body n'est plus nécessaire si l'API est intelligente
      });

      if (!response.ok) throw new Error('Erreur lors de la désassignation');

      router.refresh();
      if (collaborateurId) {
        await fetchAllData(collaborateurId);
      }
    } catch (err) {
      setError('Erreur lors de la désassignation');
      console.error(err);
    }
  };

  const handleAssigner = async () => {
    if (!selectedLit || !selectedChambre || !selectedLogement) {
      setError('Veuillez sélectionner un logement, une chambre et un lit');
      return;
    }

    if (!selectedModele) {
      setError('Veuillez sélectionner un modèle de convention');
      return;
    }

    setAssignLoading(true);
    setError(null);

    try {
      const payload: any = {
        lit_id: selectedLit,
        chambre_id: selectedChambre,
        logement_id: selectedLogement,
        modele_convention_id: parseInt(selectedModele),
        date_debut: collaborateur?.date_arrivee || new Date().toISOString().split('T')[0],
        date_fin: collaborateur?.date_depart || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };

      if (participationMensuelle) {
        payload.participation_mensuelle = parseFloat(participationMensuelle);
      }
      if (chambrePrivee) {
        payload.chambre_privée = true;
      }

      const response = await fetch(`/api/collaborateurs/${collaborateurId}/assigner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'assignation');
      }

      setShowAssignModal(false);
      router.refresh();
      if (collaborateurId) {
        await fetchAllData(collaborateurId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'assignation');
      console.error(err);
    } finally {
      setAssignLoading(false);
    }
  };

  const openAssignModal = () => {
    fetchLogementsDisponibles();
    setShowAssignModal(true);
    setSelectedLogement(null);
    setSelectedChambre(null);
    setSelectedLit(null);
    setParticipationMensuelle('');
    setChambrePrivee(false);
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Administrateur',
      user: 'Utilisateur',
    };
    return roles[role] || role;
  };

  const getStatusBadge = (actif: boolean) => {
    return actif ? (
      <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
        Actif
      </span>
    ) : (
      <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
        Inactif
      </span>
    );
  };

  const getCautionStatusBadge = (statut: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      versee: { label: 'Versée', color: 'bg-green-100 text-green-800' },
      restituee: { label: 'Restituée', color: 'bg-blue-100 text-blue-800' },
      retenue: { label: 'Retenue', color: 'bg-red-100 text-red-800' },
    };
    const status = statusMap[statut] || { label: statut, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
        {status.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !collaborateur) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Erreur</h2>
          <p className="text-gray-600">{error || 'Collaborateur non trouvé'}</p>
          <Link
            href="/collaborateurs"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/collaborateurs"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Retour
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                {collaborateur.prenom} {collaborateur.nom}
              </h1>
              {getStatusBadge(collaborateur.est_actif)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">👤 Informations</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Email</span>
                  <p className="font-medium text-gray-900">{collaborateur.email}</p>
                </div>
                {collaborateur.telephone && (
                  <div>
                    <span className="text-gray-500">Téléphone</span>
                    <p className="font-medium text-gray-900">{collaborateur.telephone}</p>
                  </div>
                )}
                {collaborateur.genre && (
                  <div>
                    <span className="text-gray-500">Genre</span>
                    <p className="font-medium text-gray-900">
                      {collaborateur.genre === 'homme' ? '👨 Homme' : 
                       collaborateur.genre === 'femme' ? '👩 Femme' : 
                       collaborateur.genre}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Rôle</span>
                  <p className="font-medium text-gray-900">{getRoleLabel(collaborateur.role)}</p>
                </div>
                {collaborateur.centre_principal && (
                  <div>
                    <span className="text-gray-500">Centre principal</span>
                    <p className="font-medium text-gray-900">{collaborateur.centre_principal}</p>
                  </div>
                )}
                {collaborateur.centre_affectation && (
                  <div>
                    <span className="text-gray-500">Centre d'affectation</span>
                    <p className="font-medium text-gray-900">{collaborateur.centre_affectation}</p>
                  </div>
                )}
                {collaborateur.date_arrivee && (
                  <div>
                    <span className="text-gray-500">Date d'arrivée</span>
                    <p className="font-medium text-gray-900">
                      {format(new Date(collaborateur.date_arrivee), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                  </div>
                )}
                {collaborateur.date_depart && (
                  <div>
                    <span className="text-gray-500">Date de départ</span>
                    <p className="font-medium text-gray-900">
                      {format(new Date(collaborateur.date_depart), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                  </div>
                )}
                {(collaborateur.date_debut_contrat || collaborateur.date_fin_contrat) && (
                  <div>
                    <span className="text-gray-500">Période de contrat</span>
                    <p className="font-medium text-gray-900">
                      {collaborateur.date_debut_contrat && format(new Date(collaborateur.date_debut_contrat), 'dd/MM/yyyy', { locale: fr })}
                      {collaborateur.date_fin_contrat && ` - ${format(new Date(collaborateur.date_fin_contrat), 'dd/MM/yyyy', { locale: fr })}`}
                    </p>
                  </div>
                )}
                <div className="flex gap-4">
                  <div>
                    <span className="text-gray-500">Véhicule</span>
                    <p className="font-medium text-gray-900">{collaborateur.vehicule ? '✅ Oui' : '❌ Non'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Animal</span>
                    <p className="font-medium text-gray-900">{collaborateur.animal ? '✅ Oui' : '❌ Non'}</p>
                  </div>
                </div>
                {collaborateur.clefs && (
                  <div>
                    <span className="text-gray-500">Clés</span>
                    <p className="font-medium text-gray-900">🔑 {collaborateur.clefs}</p>
                  </div>
                )}
                {collaborateur.commentaire && (
                  <div>
                    <span className="text-gray-500">Commentaire</span>
                    <p className="text-gray-900 bg-gray-50 p-2 rounded-lg mt-1 text-sm">
                      {collaborateur.commentaire}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions rapides */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">⚡ Actions rapides</h3>
              <div className="space-y-2">
                {/* ✅ CORRECTION : props avec valeurs par défaut */}
                <SendCredentialsButton 
                  collaborateurId={collaborateur.id}
                  collaborateurNom={collaborateur.nom || ''}
                  collaborateurPrenom={collaborateur.prenom || ''}
                  collaborateurEmail={collaborateur.email || ''}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">🛏️ Logement actuel</h2>
                <div className="flex gap-2">
                  {bauxActifs.length > 0 ? (
                    <button
                      onClick={handleDesassigner}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                    >
                      Désassigner
                    </button>
                  ) : (
                    <button
                      onClick={openAssignModal}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      + Assigner
                    </button>
                  )}
                </div>
              </div>
              {bauxActifs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 text-sm">Logement</span>
                    <p className="font-medium text-gray-900">{bauxActifs[0].logement_nom}</p>
                    <p className="text-sm text-gray-600">{bauxActifs[0].logement_adresse}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">Chambre</span>
                    <p className="font-medium text-gray-900">{bauxActifs[0].chambre_nom}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">Lit</span>
                    <p className="font-medium text-gray-900">Lit n°{bauxActifs[0].lit_numero}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">Statut</span>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Occupé
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Aucun logement assigné
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">📄 Baux</h2>
                <Link
                  href={`/collaborateurs/${collaborateur.id}/nouveau-bail`}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Nouveau bail
                </Link>
              </div>

              <div className="px-6 pt-4">
                <div className="flex gap-2 border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('actif')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'actif'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Baux actifs ({bauxActifs.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('historique')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'historique'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Historique ({bauxHistorique.length})
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'actif' && bauxActifs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Aucun bail actif pour ce collaborateur
                  </div>
                )}

                {activeTab === 'historique' && bauxHistorique.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Aucun bail dans l'historique
                  </div>
                )}

                {(activeTab === 'actif' ? bauxActifs : bauxHistorique).map((bail) => (
                  <div key={bail.id} className="border border-gray-200 rounded-lg p-4 mb-4 last:mb-0 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{bail.logement_nom}</h3>
                          <span className="text-sm text-gray-500">{bail.logement_adresse}</span>
                          {bail.chambre_privée && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                              Chambre privée
                            </span>
                          )}
                          {bail.signe && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                              ✅ Signé
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-0.5">
                          <p>
                            {bail.chambre_nom} - Lit n°{bail.lit_numero}
                          </p>
                          <p>
                            📅 {format(new Date(bail.date_debut), 'dd/MM/yyyy', { locale: fr })} →{' '}
                            {format(new Date(bail.date_fin), 'dd/MM/yyyy', { locale: fr })}
                          </p>
                          {bail.participation_mensuelle && (
                            <p>
                              💰 Participation : {bail.participation_mensuelle} € / mois
                            </p>
                          )}
                          {bail.montant_caution !== null && bail.montant_caution !== undefined && (
                            <p className="flex items-center gap-2">
                              💰 Caution : {bail.montant_caution} €
                              {bail.statut_caution && getCautionStatusBadge(bail.statut_caution)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/baux/${bail.id}`}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Détails
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {bauxActifs.length > 0 && (
              <CautionManager 
                bailId={bauxActifs[0].id} 
                onUpdate={() => {
                  if (collaborateurId) {
                    fetchBaux(collaborateurId);
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal d'assignation */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Assigner un logement</h2>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedLogement(null);
                    setSelectedChambre(null);
                    setSelectedLit(null);
                    setFiltres({ ville: '', type_lit: '', type_occupation: '' });
                    setParticipationMensuelle('');
                    setChambrePrivee(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {logementsDisponibles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucun logement disponible</p>
                  <button
                    onClick={fetchLogementsDisponibles}
                    className="mt-2 text-blue-600 hover:underline"
                  >
                    Réessayer
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">🔍 Filtrer les lits disponibles</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Ville</label>
                        <select
                          value={filtres.ville}
                          onChange={(e) => {
                            setFiltres({ ...filtres, ville: e.target.value });
                            setSelectedLogement(null);
                            setSelectedChambre(null);
                            setSelectedLit(null);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">Toutes</option>
                          {villesDisponibles.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Type de lit</label>
                        <select
                          value={filtres.type_lit}
                          onChange={(e) => {
                            setFiltres({ ...filtres, type_lit: e.target.value });
                            setSelectedLogement(null);
                            setSelectedChambre(null);
                            setSelectedLit(null);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">Tous</option>
                          <option value="simple">🛏️ Simple</option>
                          <option value="double">🛏️🛏️ Double</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Occupation</label>
                        <select
                          value={filtres.type_occupation}
                          onChange={(e) => {
                            setFiltres({ ...filtres, type_occupation: e.target.value });
                            setSelectedLogement(null);
                            setSelectedChambre(null);
                            setSelectedLit(null);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">Tous</option>
                          <option value="mixte">🔄 Mixte</option>
                          <option value="F">👩 Femmes</option>
                          <option value="M">👨 Hommes</option>
                          <option value="en_attente">⏳ En attente</option>
                        </select>
                      </div>
                    </div>
                    {(filtres.ville || filtres.type_lit || filtres.type_occupation) && (
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {logementsFiltres.length} logement(s) trouvé(s)
                        </span>
                        <button
                          onClick={() => {
                            setFiltres({ ville: '', type_lit: '', type_occupation: '' });
                            setSelectedLogement(null);
                            setSelectedChambre(null);
                            setSelectedLit(null);
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Réinitialiser les filtres
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Logement
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={selectedLogement || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setSelectedLogement(isNaN(val) ? null : val);
                        setSelectedChambre(null);
                        setSelectedLit(null);
                      }}
                    >
                      <option value="">Sélectionner un logement</option>
                      {logementsFiltres.map((logement) => {
                        const displayName = logement.nom_logement && logement.nom_logement !== 'Logement sans nom'
                          ? logement.nom_logement
                          : logement.adresse || `Logement #${logement.id}`;
                        
                        return (
                          <option key={logement.id} value={logement.id}>
                            {displayName} - {logement.adresse} ({logement.ville})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedLogement && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chambre
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={selectedChambre || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setSelectedChambre(isNaN(val) ? null : val);
                          setSelectedLit(null);
                        }}
                      >
                        <option value="">Sélectionner une chambre</option>
                        {logementsFiltres
                          .find(l => l.id === selectedLogement)
                          ?.chambres
                          ?.filter(c => c && c.id)
                          .map((chambre) => (
                            <option key={chambre.id} value={chambre.id}>
                              {chambre.nom || `Chambre ${chambre.id}`} ({chambre.type_lit === 'simple' ? '🛏️ Simple' : '🛏️🛏️ Double'}) - {chambre.lits?.filter((l: any) => !l.est_occupe).length || 0} lit(s) libre(s)
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {selectedChambre && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lit
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={selectedLit || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setSelectedLit(isNaN(val) ? null : val);
                        }}
                      >
                        <option value="">Sélectionner un lit</option>
                        {logementsFiltres
                          .find(l => l.id === selectedLogement)
                          ?.chambres
                          ?.find(c => c.id === selectedChambre)
                          ?.lits
                          ?.filter((lit: any) => lit && !lit.est_occupe)
                          .map((lit: any) => (
                            <option key={lit.id} value={lit.id}>
                              Lit n°{lit.numero || lit.id} ✅ Libre
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      💰 Participation mensuelle (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={participationMensuelle}
                      onChange={(e) => setParticipationMensuelle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="150.00"
                    />
                  </div>

                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chambrePrivee}
                        onChange={(e) => setChambrePrivee(e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 font-medium">🛏️ Chambre privée</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-8">Si coché, tous les lits de la chambre seront assignés</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      📄 Modèle de convention
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={selectedModele}
                      onChange={(e) => setSelectedModele(e.target.value)}
                    >
                      {modelesConvention.length === 0 ? (
                        <option value="">⚠️ Aucun modèle disponible</option>
                      ) : (
                        modelesConvention.map((modele) => (
                          <option key={modele.id} value={modele.id}>
                            {modele.nom}
                          </option>
                        ))
                      )}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">La convention sera générée automatiquement</p>
                  </div>

                  <button
                    onClick={handleAssigner}
                    disabled={assignLoading || !selectedLit || !selectedModele}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {assignLoading ? 'Assignation en cours...' : 'Confirmer l\'assignation'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}