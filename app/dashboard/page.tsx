import { query } from '@/lib/db';
import Charts from '@/app/components/Charts';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Statistiques globales
  const statsResult = await query(`
    SELECT 
      COUNT(DISTINCT l.id) as total_logements,
      COUNT(DISTINCT ch.id) as total_chambres,
      COUNT(DISTINCT li.id) as total_lits,
      SUM(CASE WHEN li.est_occupe = true THEN 1 ELSE 0 END) as lits_occupes
    FROM logements l
    LEFT JOIN chambres ch ON l.id = ch.logement_id
    LEFT JOIN lits li ON ch.id = li.chambre_id
  `);
  const stats = statsResult.rows[0];

  // Nombre de collaborateurs
  const collabResult = await query(`
    SELECT COUNT(*) as total_collaborateurs
    FROM collaborateurs
  `);
  const totalCollaborateurs = collabResult.rows[0]?.total_collaborateurs || 0;

  // 1. Logements par ville
  const villesResult = await query(`
    SELECT 
      ville,
      COUNT(*) as count
    FROM logements
    GROUP BY ville
    ORDER BY count DESC
  `);
  const logementsParVille = villesResult.rows;

  // 2. Lits par ville
  const litsVilleResult = await query(`
    SELECT 
      log.ville,
      COUNT(li.id) as total,
      SUM(CASE WHEN li.est_occupe = true THEN 1 ELSE 0 END) as occupes
    FROM logements log
    LEFT JOIN chambres ch ON log.id = ch.logement_id
    LEFT JOIN lits li ON ch.id = li.chambre_id
    GROUP BY log.ville
    ORDER BY log.ville
  `);
  const litsParVille = litsVilleResult.rows.map((row: any) => ({
    ville: row.ville,
    occupes: parseInt(row.occupes || 0),
    disponibles: parseInt(row.total || 0) - parseInt(row.occupes || 0),
  }));

  // 3. Assignations par mois
  const assignationsResult = await query(`
    SELECT 
      TO_CHAR(date_debut, 'YYYY-MM') as mois,
      COUNT(*) as count
    FROM baux
    WHERE date_debut IS NOT NULL
    GROUP BY TO_CHAR(date_debut, 'YYYY-MM')
    ORDER BY mois
    LIMIT 12
  `);
  const assignationsParMois = assignationsResult.rows.map((row: any) => ({
    mois: row.mois,
    count: parseInt(row.count),
  }));

  // 4. Collaborateurs par centre
  const centresResult = await query(`
    SELECT 
      centre_principal as centre,
      COUNT(*) as count
    FROM collaborateurs
    WHERE centre_principal IS NOT NULL AND centre_principal != ''
    GROUP BY centre_principal
    ORDER BY count DESC
  `);
  const collaborateursParCentre = centresResult.rows;

  // 5. Occupation par type
  const typeResult = await query(`
    SELECT 
      CASE 
        WHEN mixte_autorise = true THEN 'Mixte autorisé'
        WHEN type_occupation_effectif = 'F' THEN 'Filles'
        WHEN type_occupation_effectif = 'M' THEN 'Garçons'
        ELSE 'En attente'
      END as type,
      COUNT(*) as count
    FROM logements
    GROUP BY 
      CASE 
        WHEN mixte_autorise = true THEN 'Mixte autorisé'
        WHEN type_occupation_effectif = 'F' THEN 'Filles'
        WHEN type_occupation_effectif = 'M' THEN 'Garçons'
        ELSE 'En attente'
      END
    ORDER BY count DESC
  `);
  const occupationParType = typeResult.rows;

  // Budget total
  const budgetResult = await query(`
    SELECT 
      SUM(participation_mensuelle) as total_mensuel,
      COUNT(*) as nb_baux_actifs
    FROM baux
    WHERE date_fin >= CURRENT_DATE
  `);
  const budget = budgetResult.rows[0];

  // 6. Coût par centre analytique
  const coutCentreResult = await query(`
    SELECT 
      c.centre_principal,
      COUNT(DISTINCT c.id) as nb_collaborateurs,
      SUM(b.participation_mensuelle) as cout_total_mensuel,
      ROUND(AVG(b.participation_mensuelle), 2) as cout_moyen
    FROM collaborateurs c
    JOIN baux b ON c.id = b.collaborateur_id AND b.date_fin >= CURRENT_DATE
    WHERE c.centre_principal IS NOT NULL AND c.centre_principal != ''
    GROUP BY c.centre_principal
    ORDER BY cout_total_mensuel DESC
  `);
  const coutParCentre = coutCentreResult.rows;

  // Nombre de collaborateurs logés
  const logesResult = await query(`
    SELECT COUNT(DISTINCT collaborateur_id) as nb_loges
    FROM lits
    WHERE est_occupe = true
  `);
  const nbLoges = logesResult.rows[0]?.nb_loges || 0;

  // 📋 Baux expirant dans les 30 jours
  const bauxExpirantResult = await query(`
    SELECT 
      b.id as bail_id,
      c.id as collaborateur_id,
      c.nom,
      c.prenom,
      c.email,
      log.adresse as logement_adresse,
      log.ville as logement_ville,
      b.date_fin,
      b.alerte_envoyee,
      b.date_alerte_envoyee
    FROM baux b
    LEFT JOIN collaborateurs c ON b.collaborateur_id = c.id
    LEFT JOIN logements log ON b.logement_id = log.id
    WHERE b.date_fin > CURRENT_DATE
      AND b.date_fin <= CURRENT_DATE + INTERVAL '30 days'
    ORDER BY b.date_fin ASC
    LIMIT 10
  `);
  const bauxExpirant = bauxExpirantResult.rows;

  const chartsData = {
    logementsParVille,
    litsParVille,
    assignationsParMois,
    collaborateursParCentre,
    occupationParType,
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">📊 Dashboard</h1>

      {/* Cartes de statistiques globales */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">🏠 Logements</p>
          <p className="text-2xl font-bold">{stats?.total_logements || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-sm text-gray-500">🛏️ Lits</p>
          <p className="text-2xl font-bold">{stats?.total_lits || 0}</p>
          <p className="text-xs text-gray-500">{stats?.lits_occupes || 0} occupés</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <p className="text-sm text-gray-500">👥 Collaborateurs</p>
          <p className="text-2xl font-bold">{totalCollaborateurs}</p>
          <p className="text-xs text-gray-500">{nbLoges} logés</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <p className="text-sm text-gray-500">💰 Budget mensuel</p>
          <p className="text-2xl font-bold">{budget?.total_mensuel ? `${parseFloat(budget.total_mensuel).toFixed(2)} €` : '0 €'}</p>
          <p className="text-xs text-gray-500">{budget?.nb_baux_actifs || 0} baux actifs</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <p className="text-sm text-gray-500">📊 Taux d'occupation</p>
          <p className="text-2xl font-bold">
            {stats?.total_lits > 0 ? Math.round((stats?.lits_occupes / stats?.total_lits) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-500">des lits occupés</p>
        </div>
      </div>

      {/* Graphiques */}
      <Charts data={chartsData} />

      {/* ⏰ Baux arrivant à échéance */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">⏰ Baux arrivant à échéance</h2>
        {bauxExpirant.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun bail n'arrive à échéance dans les 30 prochains jours</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Collaborateur</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Logement</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date de fin</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jours restants</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bauxExpirant.map((bail: any) => {
                  const joursRestants = Math.ceil((new Date(bail.date_fin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={bail.bail_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <a href={`/collaborateurs/${bail.collaborateur_id}`} className="text-blue-600 hover:underline">
                          {bail.prenom} {bail.nom}
                        </a>
                      </td>
                      <td className="px-4 py-2">{bail.logement_adresse}</td>
                      <td className="px-4 py-2">{new Date(bail.date_fin).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-2 font-medium">
                        <span className={
                          joursRestants <= 7 ? 'text-red-600 font-bold' :
                          joursRestants <= 14 ? 'text-orange-600' :
                          'text-gray-600'
                        }>
                          {joursRestants} jours
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {bail.alerte_envoyee ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✅ Alerté
                          </span>
                        ) : joursRestants <= 7 ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            🔴 Urgent
                          </span>
                        ) : joursRestants <= 14 ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⚠️ Attention
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            En attente
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Budget total */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          💰 <strong>Budget total mensuel :</strong> {budget?.total_mensuel ? `${parseFloat(budget.total_mensuel).toFixed(2)} €` : '0 €'}
          &nbsp;({budget?.nb_baux_actifs || 0} baux actifs)
        </p>
      </div>

      {/* 💰 Coûts par centre analytique */}
      <div className="card mt-6">
        <div className="p-6">
          <h2 className="section-title">💰 Coûts par centre analytique</h2>
          {coutParCentre.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun bail actif avec centre analytique renseigné</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-brutalist">
                <thead>
                  <tr>
                    <th>Centre</th>
                    <th>👥 Collaborateurs</th>
                    <th>💰 Coût total / mois</th>
                    <th>📊 Coût moyen / collab</th>
                  </tr>
                </thead>
                <tbody>
                  {coutParCentre.map((centre: any) => (
                    <tr key={centre.centre_principal}>
                      <td className="font-bold">{centre.centre_principal}</td>
                      <td>{centre.nb_collaborateurs}</td>
                      <td className="font-mono font-bold">{parseFloat(centre.cout_total_mensuel).toFixed(2)} €</td>
                      <td className="font-mono">{parseFloat(centre.cout_moyen).toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                  <tr>
                    <td>TOTAL</td>
                    <td>{coutParCentre.reduce((sum: number, c: any) => sum + parseInt(c.nb_collaborateurs), 0)}</td>
                    <td className="font-mono">
                      {coutParCentre.reduce((sum: number, c: any) => sum + parseFloat(c.cout_total_mensuel), 0).toFixed(2)} €
                    </td>
                    <td className="font-mono">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
