import { query } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function CollaborateurDetail({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);

  const result = await query(
    `SELECT 
      c.*,
      l.id as lit_id,
      l.numero as lit_numero,
      ch.nom as chambre_nom,
      ch.type_lit,
      log.adresse as logement_adresse,
      log.ville as logement_ville,
      log.type_occupation as logement_type_occupation
    FROM collaborateurs c
    LEFT JOIN lits l ON c.id = l.collaborateur_id
    LEFT JOIN chambres ch ON l.chambre_id = ch.id
    LEFT JOIN logements log ON ch.logement_id = log.id
    WHERE c.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    notFound();
  }

  const collab = result.rows[0];

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">👤 Détail du collaborateur</h1>
        <a
          href="/collaborateurs"
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
        >
          ← Retour
        </a>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Genre</p>
            <p className="font-medium">{collab.genre === 'F' ? '👩 Femme' : '👨 Homme'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Nom complet</p>
            <p className="font-medium">{collab.nom} {collab.prenom}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{collab.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Téléphone</p>
            <p className="font-medium">{collab.telephone || 'Non renseigné'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date d'arrivée (logement)</p>
            <p className="font-medium">{collab.date_arrivee ? new Date(collab.date_arrivee).toLocaleDateString('fr-FR') : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date de départ (logement)</p>
            <p className="font-medium">{collab.date_depart ? new Date(collab.date_depart).toLocaleDateString('fr-FR') : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date début contrat</p>
            <p className="font-medium">{collab.date_debut_contrat ? new Date(collab.date_debut_contrat).toLocaleDateString('fr-FR') : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date fin contrat</p>
            <p className="font-medium">{collab.date_fin_contrat ? new Date(collab.date_fin_contrat).toLocaleDateString('fr-FR') : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Véhicule</p>
            <p className="font-medium">{collab.vehicule ? '🚗 Oui' : 'Non'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Animal de compagnie</p>
            <p className="font-medium">{collab.animal ? '🐾 Oui' : 'Non'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Commentaire</p>
            <p className="font-medium">{collab.commentaire || 'Aucun commentaire'}</p>
          </div>
        </div>

        {/* Logement assigné */}
        <div className="mt-6 border-t pt-4">
          <h2 className="text-xl font-semibold mb-3">🏠 Logement assigné</h2>
          {collab.logement_adresse ? (
            <div className="bg-green-50 p-4 rounded border border-green-200">
              <p><span className="font-medium">Adresse :</span> {collab.logement_adresse}</p>
              <p><span className="font-medium">Ville :</span> {collab.logement_ville}</p>
              <p><span className="font-medium">Chambre :</span> {collab.chambre_nom}</p>
              <p><span className="font-medium">Lit :</span> {collab.lit_numero}</p>
              <p><span className="font-medium">Type de lit :</span> {collab.type_lit === 'simple' ? '🛏️ Simple' : '🛏️🛏️ Double'}</p>
              <p><span className="font-medium">Type d'occupation :</span> {
                collab.logement_type_occupation === 'mixte' ? 'Mixte' :
                collab.logement_type_occupation === 'fille' ? '👩 Filles' : '👨 Garçons'
              }</p>
            </div>
          ) : (
            <p className="text-gray-500">Aucun logement assigné</p>
          )}
        </div>
      </div>
    </div>
  );
}