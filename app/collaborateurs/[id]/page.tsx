'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation'; // ✅ Importer useParams
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DeleteCollaborateurButton from '@/app/components/DeleteCollaborateurButton';
import CautionManager from '@/app/components/CautionManager'; // ✅ CORRECTION: Import manquant
import SendCredentialsButton from '@/app/components/SendCredentialsButton';
import AssignerLogementModal from './AssignerLogementModal';

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

  // États pour la modale d'assignation
  const [showAssignModal, setShowAssignModal] = useState(false);
  const collaborateurId = params?.id ? parseInt(params.id as string, 10) : null;

  // ✅ Utiliser useCallback pour que la fonction puisse être appelée depuis les effets et les gestionnaires d'événements
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null); // Réinitialiser les erreurs précédentes

      // --- DÉSACTIVATION TEMPORAIRE ---
      // On ne charge que les informations du collaborateur pour isoler le problème.
      const collaborateurResponse = await fetch(`/api/collaborateurs/${collaborateurId}`);

      // Traiter la réponse du collaborateur
      const collaborateurResult = await collaborateurResponse.json();
      if (!collaborateurResponse.ok || !collaborateurResult.success) {
        throw new Error(collaborateurResult.error || 'Impossible de charger les informations du collaborateur.');
      }
      setCollaborateur(collaborateurResult.data);
      
      // On initialise les baux à un tableau vide.
      setBauxActifs([]);
      setBauxHistorique([]);
      // --- FIN DE LA DÉSACTIVATION ---

    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  }, [collaborateurId]); // ✅ Mettre à jour la fonction si l'ID change

  useEffect(() => {
    if (!params?.id) {
      console.log("⏳ En attente des paramètres de l'URL...");
      return;
    }

    // ✅ CORRECTION: Récupérer et valider l'ID à l'intérieur du useEffect
    const idNumber = parseInt(params.id as string, 10);

    if (isNaN(idNumber)) {
      setError('ID de collaborateur invalide');
      setLoading(false);
      return;
    }
    
    // Appeler la fonction de récupération des données
    fetchAllData();
  }, [params?.id, fetchAllData]); // Le hook se redéclenchera si l'ID ou la fonction change

  const handleDesassigner = async () => {
    if (bauxActifs.length === 0 || !collaborateurId) return;
    if (!confirm('Voulez-vous vraiment désassigner ce collaborateur de son logement ?')) return;

    try {
      const response = await fetch(`/api/collaborateurs/${collaborateurId}/desassigner`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Erreur lors de la désassignation');

      // Recharger toutes les données pour refléter le changement
      await fetchAllData();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la désassignation');
      console.error(err);
    }
  };

  const handleAssignSuccess = () => {
    if (collaborateurId) {
      fetchAllData();
    }
    // Optionnel: afficher un message de succès global
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
                {/* ✅ Afficher le bouton uniquement si le collaborateur est chargé */}
                {collaborateur && (
                  <SendCredentialsButton 
                    collaborateurId={collaborateur.id}
                    collaborateurNom={collaborateur.nom || ''}
                    collaborateurPrenom={collaborateur.prenom || ''}
                    collaborateurEmail={collaborateur.email || ''}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* ✅ Décommenter et réactiver toute la section des baux */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200" >
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
                      onClick={() => setShowAssignModal(true)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      + Assigner
                    </button>
                  )}
                </div>
              </div>
              {bauxActifs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bauxActifs[0] && (
                    <>
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
                    </>
                  )}
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
                      <div>
                        <p className="font-bold">{bail.logement_nom}</p>
                        <p className="text-sm text-gray-600">{bail.logement_adresse}</p>
                        <p className="text-sm text-gray-500">
                          Du {format(new Date(bail.date_debut), 'dd/MM/yyyy', { locale: fr })} au {format(new Date(bail.date_fin), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      </div>
                      <Link href={`/baux/${bail.id}`} className="text-sm text-blue-600 hover:underline">Voir détails</Link>
                    </div>
                    {/* D'autres détails du bail peuvent être ajoutés ici */}
                  </div>
                ))}
              </div>
            </div>

            {bauxActifs.length > 0 && (
              <CautionManager 
                bailId={bauxActifs[0].id} 
                onUpdate={() => {
                  if (collaborateurId) {
                    fetchAllData();
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal d'assignation */}
      <AssignerLogementModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onSuccess={handleAssignSuccess}
        collaborateur={collaborateur}
      />
    </div>
  );
}