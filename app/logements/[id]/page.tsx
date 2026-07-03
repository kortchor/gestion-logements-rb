import { query } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function LogementDetail({ params }: { params: Promise<{ id: string }> }) {
  // ✅ DÉBALLER LA PROMESSE AVEC await
  const { id } = await params;
  const logementId = parseInt(id);

  if (isNaN(logementId)) {
    notFound();
  }

  const result = await query(
    `SELECT l.*, 
            COUNT(c.id) as nombre_chambres,
            COALESCE(SUM(c.nombre_lits), 0) as total_lits
     FROM logements l
     LEFT JOIN chambres c ON l.id = c.logement_id
     WHERE l.id = $1
     GROUP BY l.id`,
    [logementId]
  );

  if (result.rows.length === 0) {
    notFound();
  }

  const logement = result.rows[0];

  const chambresResult = await query(
    'SELECT * FROM chambres WHERE logement_id = $1 ORDER BY id',
    [logementId]
  );
  const chambres = chambresResult.rows;

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🏠 Détail du logement</h1>
        <a
          href="/logements"
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors no-underline"
        >
          ← Retour
        </a>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Adresse</p>
            <p className="font-medium">{logement.adresse}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Ville</p>
            <p className="font-medium">{logement.ville}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Type</p>
            <p className="font-medium">{logement.type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Prix loyer</p>
            <p className="font-medium">{logement.prix_loyer ? `${logement.prix_loyer} €` : 'Non défini'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Propriétaire</p>
            <p className="font-medium">{logement.proprietaire || 'Non renseigné'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Contact propriétaire</p>
            <p className="font-medium">{logement.contact_proprietaire || 'Non renseigné'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Fournisseur EDF</p>
            <p className="font-medium">{logement.fournisseur_edf || 'Non renseigné'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Fournisseur Eau</p>
            <p className="font-medium">{logement.fournisseur_eau || 'Non renseigné'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Assurance</p>
            <p className="font-medium">{logement.assurance || 'Non renseigné'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Type d'occupation</p>
            <p className="font-medium">
              {logement.type_occupation_effectif === 'mixte' ? 'Mixte' :
               logement.type_occupation_effectif === 'F' ? '👩 Filles' : '👨 Garçons'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Visibilité</p>
            <p className="font-medium">{logement.est_visible ? '✅ Visible' : '❌ Masqué'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Nombre de chambres</p>
            <p className="font-medium">{logement.nombre_chambres}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total lits</p>
            <p className="font-medium">{logement.total_lits}</p>
          </div>
        </div>

        {logement.assurance_nom && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-700">
              📄 Contrat d'assurance : {logement.assurance_nom}
            </p>
          </div>
        )}

        <div className="mt-6 border-t pt-4">
          <h2 className="text-xl font-semibold mb-3">🛏️ Chambres</h2>
          {chambres.length === 0 ? (
            <p className="text-gray-500">Aucune chambre</p>
          ) : (
            <ul className="space-y-2">
              {chambres.map((chambre: any) => (
                <li key={chambre.id} className="bg-gray-50 p-3 rounded flex justify-between">
                  <span>{chambre.nom}</span>
                  <span>{chambre.type_lit === 'simple' ? '🛏️ Simple' : '🛏️🛏️ Double'} - {chambre.nombre_lits} lit(s)</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}