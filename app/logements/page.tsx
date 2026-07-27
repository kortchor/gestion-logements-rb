import { query } from '@/lib/db';
import DeleteLogementButton from '@/app/components/DeleteLogementButton';
import AddLogementButton from '@/app/components/AddLogementButton';
import ExportButtons from '@/app/components/ExportButtons';
import ToggleLogementActifButton from '@/app/components/ToggleLogementActifButton';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface LogementRow {
  id: number;
  nom_logement: string | null;
  adresse: string;
  ville: string;
  type: string | null;
  nombre_chambres: number;
  total_lits: number;
  prix_loyer?: number | null;
  proprietaire?: string | null;
  date_debut_contrat?: string | null;
  date_fin_contrat?: string | null;
  mixte_autorise: boolean;
  type_occupation_effectif?: 'F' | 'M' | null;
  est_actif?: boolean | null;
}

interface LogementsPageProps {
  searchParams?: Promise<{
    contrat?: string;
  }>;
}

const COULEURS_VILLES: { [key: string]: string } = {
  'Cassis': 'bg-pink-100 text-pink-800',
  'La Ciotat': 'bg-green-100 text-green-800',
  'Marseille': 'bg-yellow-100 text-yellow-800',
  'Roquefort-la-Bédoule': 'bg-blue-100 text-blue-800',
};

function getVilleColor(ville: string) {
  return COULEURS_VILLES[ville] || 'bg-gray-100 text-gray-800';
}

function getTypeIcon(type: string) {
  const icons: { [key: string]: string } = {
    'Studio': '🏠',
    'Appartement': '🏢',
    'Villa': '🏡',
  };
  return icons[type] || '🏠';
}

function getOccupationLabel(logement: LogementRow) {
  if (logement.mixte_autorise) {
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-200 text-purple-800">🔄 Mixte autorisé</span>;
  }
  
  if (logement.type_occupation_effectif === 'F') {
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-pink-200 text-pink-800">👩 Filles</span>;
  }
  
  if (logement.type_occupation_effectif === 'M') {
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-200 text-blue-800">👨 Garçons</span>;
  }
  
  return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800">🔄 En attente</span>;
}

export default async function LogementsPage({ searchParams }: LogementsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const contratFilter = resolvedSearchParams?.contrat || 'actifs';

  let logements: LogementRow[] = [];
  let loadError: string | null = null;

  try {
    const result = await query(`
      SELECT 
        l.*,
        COUNT(c.id) as nombre_chambres,
        COALESCE(SUM(c.nombre_lits), 0) as total_lits
      FROM logements l
      LEFT JOIN chambres c ON l.id = c.logement_id
      GROUP BY l.id
      ORDER BY l.id
    `);
    logements = result.rows as LogementRow[];
  } catch (error) {
    console.error('❌ Erreur:', error);
    loadError = error instanceof Error ? error.message : 'Erreur inconnue';
  }

  const today = new Date();
  const parseDate = (value: string | null | undefined) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const getContratStatus = (logement: LogementRow) => {
    const debut = parseDate(logement.date_debut_contrat || null);
    const fin = parseDate(logement.date_fin_contrat || null);

    if (!debut) {
      return 'sans_debut';
    }
    if (!fin) {
      return 'actif_indefini';
    }
    if (fin < today) {
      return 'expire';
    }
    return 'actif';
  };

  const logementsFiltres = logements.filter((logement) => {
    const status = getContratStatus(logement);
    if (contratFilter === 'expires') {
      return status === 'expire';
    }
    if (contratFilter === 'all') {
      return true;
    }
    return status === 'actif' || status === 'actif_indefini';
  });

  const stats = {
    total: logementsFiltres.length,
    Cassis: logementsFiltres.filter((l) => l.ville === 'Cassis').length,
    'La Ciotat': logementsFiltres.filter((l) => l.ville === 'La Ciotat').length,
    Marseille: logementsFiltres.filter((l) => l.ville === 'Marseille').length,
    'Roquefort-la-Bédoule': logementsFiltres.filter((l) => l.ville === 'Roquefort-la-Bédoule').length,
  };

  const exportColumns = [
    { key: 'id', label: 'ID' },
    { key: 'nom_logement', label: 'Nom' },
    { key: 'adresse', label: 'Adresse' },
    { key: 'ville', label: 'Ville' },
    { key: 'type', label: 'Type' },
    { key: 'nombre_chambres', label: 'Chambres' },
    { key: 'total_lits', label: 'Lits' },
    { key: 'prix_loyer', label: 'Loyer (€)' },
    { key: 'proprietaire', label: 'Propriétaire' },
    { key: 'date_debut_contrat', label: 'Début contrat' },
    { key: 'date_fin_contrat', label: 'Fin contrat' },
    { key: 'mixte_autorise', label: 'Mixte autorisé' },
  ];

  return (
    <div className="container mx-auto p-8">
      {loadError ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <h2 className="text-xl font-bold mb-2">❌ Erreur</h2>
          <p>{loadError}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">🏠 Gestion des Logements</h1>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/logements/renouvellements"
            className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 no-underline"
          >
            🔄 Renouvellements
          </Link>
          <ExportButtons
            type="logements"
            data={logementsFiltres}
            columns={exportColumns}
            filename="liste_logements"
          />
          <AddLogementButton />
        </div>
      </div>

      <div className="mb-6 bg-white p-4 rounded-lg shadow flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Filtre baux:</span>
        <Link
          href="/logements?contrat=actifs"
          className={`px-3 py-1 rounded-full text-sm no-underline ${contratFilter === 'actifs' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800'}`}
        >
          Actifs
        </Link>
        <Link
          href="/logements?contrat=expires"
          className={`px-3 py-1 rounded-full text-sm no-underline ${contratFilter === 'expires' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800'}`}
        >
          Expirés
        </Link>
        <Link
          href="/logements?contrat=all"
          className={`px-3 py-1 rounded-full text-sm no-underline ${contratFilter === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'}`}
        >
          Tous
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-pink-500">
          <p className="text-sm text-gray-500">Cassis</p>
          <p className="text-2xl font-bold text-pink-600">{stats.Cassis}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-sm text-gray-500">La Ciotat</p>
          <p className="text-2xl font-bold text-green-600">{stats['La Ciotat']}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <p className="text-sm text-gray-500">Marseille</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.Marseille}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">Roquefort</p>
          <p className="text-2xl font-bold text-blue-600">{stats['Roquefort-la-Bédoule']}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {logementsFiltres.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">Aucun logement pour le moment</p>
            <p className="text-sm">Cliquez sur &quot;Ajouter un logement&quot; pour commencer</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adresse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chambres</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Occupation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logementsFiltres.map((logement) => (
                  <tr key={logement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{logement.id}</td>
                    <td className="px-6 py-4 text-2xl">{getTypeIcon(logement.type || '')}</td>
                    <td className="px-6 py-4 max-w-xs truncate">{logement.nom_logement || 'Sans nom'}</td>
                    <td className="px-6 py-4 max-w-xs truncate">{logement.adresse}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVilleColor(logement.ville)}`}>
                        {logement.ville}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">{logement.nombre_chambres || 0}</td>
                    <td className="px-6 py-4 text-center">{logement.total_lits || 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getOccupationLabel(logement)}
                        {logement.est_actif === false && (
                          <span className="badge badge-red">⏸️ Inactif</span>
                        )}
                        {(() => {
                          const status = getContratStatus(logement);
                          if (status === 'expire') {
                            return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">📅 Bail expiré</span>;
                          }
                          if (status === 'actif_indefini') {
                            return <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">♾️ Indéfini</span>;
                          }
                          if (status === 'sans_debut') {
                            return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">⚠️ Début manquant</span>;
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <ToggleLogementActifButton
                          logementId={logement.id}
                          logementAdresse={logement.adresse}
                          estActif={logement.est_actif !== false}
                        />
                        <a
                          href={`/logements/${logement.id}/modifier`}
                          className="text-blue-600 hover:underline no-underline mr-1 text-sm"
                        >
                          ✏️
                        </a>
                        {getContratStatus(logement) === 'expire' && (
                          <a
                            href={`/logements/${logement.id}/modifier`}
                            className="text-red-600 hover:underline no-underline mr-1 text-sm"
                            title="Renouveler le bail"
                          >
                            🔄
                          </a>
                        )}
                        <a
                          href={`/logements/${logement.id}`}
                          className="text-blue-600 hover:underline no-underline mr-1 text-sm"
                        >
                          👁️
                        </a>
                        <DeleteLogementButton
                          logementId={logement.id}
                          logementAdresse={logement.adresse}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">📌 Légende des occupations :</h3>
        <div className="flex flex-wrap gap-4">
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-200 text-purple-800">
            🔄 Mixte autorisé
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-pink-200 text-pink-800">
            👩 Filles
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
            👨 Garçons
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
            🔄 En attente
          </span>
        </div>
      </div>
    </div>
  );
}
