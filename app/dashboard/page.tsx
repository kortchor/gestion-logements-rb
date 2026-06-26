import { query } from '@/lib/db';

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

  // Statistiques par ville
  const villesResult = await query(`
    SELECT 
      ville,
      COUNT(DISTINCT l.id) as nb_logements,
      COUNT(DISTINCT ch.id) as nb_chambres,
      COUNT(DISTINCT li.id) as nb_lits,
      SUM(CASE WHEN li.est_occupe = true THEN 1 ELSE 0 END) as nb_occupes
    FROM logements l
    LEFT JOIN chambres ch ON l.id = ch.logement_id
    LEFT JOIN lits li ON ch.id = li.chambre_id
    GROUP BY ville
    ORDER BY ville
  `);
  const villes = villesResult.rows;

  // Statistiques par centre (collaborateurs)
  const centresResult = await query(`
    SELECT 
      centre_principal,
      COUNT(*) as nb_collaborateurs,
      SUM(participation_mensuelle) as total_participation
    FROM collaborateurs c
    LEFT JOIN baux b ON c.id = b.collaborateur_id AND b.date_fin >= CURRENT_DATE
    WHERE centre_principal IS NOT NULL
    GROUP BY centre_principal
    ORDER BY centre_principal
  `);
  const centres = centresResult.rows;

  // Budget total des participations mensuelles
  const budgetResult = await query(`
    SELECT 
      SUM(participation_mensuelle) as total_mensuel,
      COUNT(*) as nb_baux_actifs
    FROM baux
    WHERE date_fin >= CURRENT_DATE
  `);
  const budget = budgetResult.rows[0];

  // Nombre de collaborateurs logés
  const logesResult = await query(`
    SELECT COUNT(DISTINCT collaborateur_id) as nb_loges
    FROM lits
    WHERE est_occupe = true
  `);
  const nbLoges = logesResult.rows[0]?.nb_loges || 0;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">📊 Dashboard</h1>

      {/* Cartes de statistiques globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
      </div>

      {/* Statistiques par ville */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">📍 Répartition par ville</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Ville</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">Logements</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">Chambres</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">Lits</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">Occupés</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">Taux</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {villes.map((ville) => {
                const taux = ville.nb_lits > 0 ? Math.round((ville.nb_occupes / ville.nb_lits) * 100) : 0;
                return (
                  <tr key={ville.ville}>
                    <td className="px-4 py-2 font-medium">{ville.ville}</td>
                    <td className="px-4 py-2 text-center">{ville.nb_logements}</td>
                    <td className="px-4 py-2 text-center">{ville.nb_chambres}</td>
                    <td className="px-4 py-2 text-center">{ville.nb_lits}</td>
                    <td className="px-4 py-2 text-center">{ville.nb_occupes}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        taux > 80 ? 'bg-green-100 text-green-800' :
                        taux > 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {taux}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistiques par centre */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">🏢 Répartition par centre analytique</h2>
        {centres.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Aucun centre renseigné</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Centre</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">Collaborateurs</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">Participation totale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {centres.map((centre) => (
                  <tr key={centre.centre_principal}>
                    <td className="px-4 py-2 font-medium">{centre.centre_principal}</td>
                    <td className="px-4 py-2 text-center">{centre.nb_collaborateurs}</td>
                    <td className="px-4 py-2 text-center font-medium">
                      {centre.total_participation ? `${parseFloat(centre.total_participation).toFixed(2)} €` : '0 €'}
                    </td>
                  </tr>
                ))}
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
    </div>
  );
}