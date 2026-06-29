import { query } from '@/lib/db';
import DeleteCollaborateurButton from '@/app/components/DeleteCollaborateurButton';

// ✅ FORCER LE RAFRAÎCHISSEMENT DES DONNÉES À CHAQUE REQUÊTE
export const dynamic = 'force-dynamic';

function getOccupationColor(type: string) {
  const colors: { [key: string]: string } = {
    'mixte': 'bg-gray-100 text-gray-800',
    'fille': 'bg-pink-200 text-pink-800',
    'garçon': 'bg-blue-200 text-blue-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
}

function getGenreIcon(genre: string) {
  return genre === 'F' ? '👩' : '👨';
}

export default async function CollaborateursPage() {
  try {
    const result = await query(`
      SELECT 
        c.id,
        c.nom,
        c.prenom,
        c.email,
        c.telephone,
        c.genre,
        c.date_arrivee,
        c.date_depart,
        c.date_debut_contrat,
        c.date_fin_contrat,
        c.vehicule,
        c.animal,
        c.commentaire,
        c.centre_principal,
        c.centre_affectation,
        c.clefs,
        l.id as lit_id,
        l.numero as lit_numero,
        ch.nom as chambre_nom,
        log.adresse as logement_adresse,
        log.ville as logement_ville,
        log.type_occupation as logement_type_occupation,
        b.participation_mensuelle
      FROM collaborateurs c
      LEFT JOIN lits l ON c.id = l.collaborateur_id
      LEFT JOIN chambres ch ON l.chambre_id = ch.id
      LEFT JOIN logements log ON ch.logement_id = log.id
      LEFT JOIN baux b ON c.id = b.collaborateur_id AND b.logement_id = log.id AND b.date_fin >= CURRENT_DATE
      ORDER BY c.id
    `);
    
    const collaborateurs = result.rows;

    const today = new Date();
    const stats = {
      total: collaborateurs.length,
      femmes: collaborateurs.filter((c: any) => c.genre === 'F').length,
      hommes: collaborateurs.filter((c: any) => c.genre === 'M').length,
      actifs: collaborateurs.filter((c: any) => {
        const dateDepart = c.date_depart ? new Date(c.date_depart) : null;
        return !dateDepart || dateDepart >= today;
      }).length,
    };

    return (
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">👥 Gestion des Collaborateurs</h1>
          <a
            href="/collaborateurs/nouveau"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors no-underline"
          >
            + Ajouter un collaborateur
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-pink-500">
            <p className="text-sm text-gray-500">👩 Femmes</p>
            <p className="text-2xl font-bold text-pink-600">{stats.femmes}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <p className="text-sm text-gray-500">👨 Hommes</p>
            <p className="text-2xl font-bold text-blue-600">{stats.hommes}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Actifs</p>
            <p className="text-2xl font-bold text-green-600">{stats.actifs}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {collaborateurs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg">Aucun collaborateur pour le moment</p>
              <p className="text-sm">Cliquez sur "Ajouter un collaborateur" pour commencer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Genre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prénom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Début contrat</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fin contrat</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chambre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Animal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {collaborateurs.map((collab: any) => (
                    <tr key={collab.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">{collab.id}</td>
                      <td className="px-6 py-4 text-2xl">{getGenreIcon(collab.genre)}</td>
                      <td className="px-6 py-4 font-medium">{collab.nom}</td>
                      <td className="px-6 py-4">{collab.prenom}</td>
                      <td className="px-6 py-4">{collab.email}</td>
                      <td className="px-6 py-4">{collab.telephone || '-'}</td>
                      <td className="px-6 py-4">{collab.date_debut_contrat ? new Date(collab.date_debut_contrat).toLocaleDateString('fr-FR') : '-'}</td>
                      <td className="px-6 py-4">{collab.date_fin_contrat ? new Date(collab.date_fin_contrat).toLocaleDateString('fr-FR') : '-'}</td>
                      <td className="px-6 py-4">
                        {collab.logement_adresse ? (
                          <span className="text-sm">
                            {collab.logement_adresse}
                            {collab.logement_type_occupation && (
                              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getOccupationColor(collab.logement_type_occupation)}`}>
                                {collab.logement_type_occupation === 'fille' ? '👩' : 
                                 collab.logement_type_occupation === 'garçon' ? '👨' : '🔄'}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">Non assigné</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{collab.chambre_nom || '-'}</td>
                      <td className="px-6 py-4">
                        {collab.logement_ville && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            collab.logement_ville === 'Cassis' ? 'bg-pink-100 text-pink-800' :
                            collab.logement_ville === 'La Ciotat' ? 'bg-green-100 text-green-800' :
                            collab.logement_ville === 'Marseille' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {collab.logement_ville}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">{collab.animal ? '🐾 Oui' : '-'}</td>
                      <td className="px-6 py-4">
                        <a
                          href={`/collaborateurs/${collab.id}/modifier`}
                          className="text-blue-600 hover:underline no-underline mr-3"
                        >
                          ✏️ Modifier
                        </a>
                        <a
                          href={`/collaborateurs/${collab.id}`}
                          className="text-blue-600 hover:underline no-underline mr-3"
                        >
                          Voir
                        </a>
                        <DeleteCollaborateurButton 
                          collaborateurId={collab.id}
                          collaborateurNom={collab.nom}
                          collaborateurPrenom={collab.prenom}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('❌ Erreur:', error);
    return (
      <div className="container mx-auto p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h2 className="text-xl font-bold mb-2">❌ Erreur</h2>
          <p>{error instanceof Error ? error.message : 'Erreur inconnue'}</p>
        </div>
      </div>
    );
  }
}