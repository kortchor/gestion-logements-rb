import Link from 'next/link';
import { query } from '@/lib/db';

interface BailDetail {
  id: number;
  logement_id: number | null;
  collaborateur_id: number | null;
  date_debut: string;
  date_fin: string;
  participation_mensuelle: number | null;
  signe?: boolean | null;
  yousign_request_id?: string | null;
  signature_link: string | null;
  created_at: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  nom_logement: string | null;
  adresse: string | null;
  ville: string | null;
}

export const dynamic = 'force-dynamic';

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fr-FR');
}

function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return `${Number(value).toFixed(2)} EUR`;
}

export default async function BailDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bailId = Number.parseInt(id, 10);

  if (Number.isNaN(bailId)) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
          ID de bail invalide.
        </div>
      </div>
    );
  }

  let result;
  try {
    result = await query(
      `SELECT
        b.id,
        b.logement_id,
        b.collaborateur_id,
        b.date_debut,
        b.date_fin,
        b.participation_mensuelle,
        b.signe,
        b.yousign_request_id,
        b.signature_link,
        b.created_at,
        c.nom,
        c.prenom,
        c.email,
        l.nom_logement,
        l.adresse,
        l.ville
      FROM baux b
      LEFT JOIN collaborateurs c ON c.id = b.collaborateur_id
      LEFT JOIN logements l ON l.id = b.logement_id
      WHERE b.id = $1
      LIMIT 1`,
      [bailId]
    );
  } catch {
    result = await query(
      `SELECT
        b.id,
        b.logement_id,
        b.collaborateur_id,
        b.date_debut,
        b.date_fin,
        b.participation_mensuelle,
        NULL::boolean AS signe,
        NULL::varchar AS yousign_request_id,
        NULL::varchar AS signature_link,
        b.created_at,
        c.nom,
        c.prenom,
        c.email,
        COALESCE(l.nom_logement, l.adresse) AS nom_logement,
        l.adresse,
        l.ville
      FROM baux b
      LEFT JOIN collaborateurs c ON c.id = b.collaborateur_id
      LEFT JOIN logements l ON l.id = b.logement_id
      WHERE b.id = $1
      LIMIT 1`,
      [bailId]
    );
  }

  if (result.rows.length === 0) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
          Bail introuvable.
        </div>
        <div className="mt-4">
          <Link href="/collaborateurs" className="text-blue-600 hover:underline">
            Retour aux collaborateurs
          </Link>
        </div>
      </div>
    );
  }

  const bail = result.rows[0] as BailDetail;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Detail du bail #{bail.id}</h1>
          <div className="flex gap-4 text-sm">
            {bail.collaborateur_id ? (
              <Link href={`/collaborateurs/${bail.collaborateur_id}`} className="text-blue-600 hover:underline">
                Voir le collaborateur
              </Link>
            ) : null}
            <Link href="/collaborateurs" className="text-gray-600 hover:underline">
              Retour
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Collaborateur</h2>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <p><span className="text-gray-500">Nom:</span> {bail.prenom || '-'} {bail.nom || '-'}</p>
            <p><span className="text-gray-500">Email:</span> {bail.email || '-'}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Logement</h2>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <p><span className="text-gray-500">Nom:</span> {bail.nom_logement || '-'}</p>
            <p><span className="text-gray-500">Ville:</span> {bail.ville || '-'}</p>
            <p className="md:col-span-2"><span className="text-gray-500">Adresse:</span> {bail.adresse || '-'}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Contrat</h2>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <p><span className="text-gray-500">Date debut:</span> {formatDate(bail.date_debut)}</p>
            <p><span className="text-gray-500">Date fin:</span> {formatDate(bail.date_fin)}</p>
            <p><span className="text-gray-500">Participation mensuelle:</span> {formatAmount(bail.participation_mensuelle)}</p>
            <p><span className="text-gray-500">Signe:</span> {bail.signe ? 'Oui' : 'Non'}</p>
            <p><span className="text-gray-500">Cree le:</span> {formatDate(bail.created_at)}</p>
          </div>

          {bail.signature_link && (
            <div className="mt-4 border-t border-gray-100 pt-4 text-sm">
              {bail.signature_link ? (
                <p>
                  <span className="text-gray-500">Lien signature:</span>{' '}
                  <a href={bail.signature_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    Ouvrir
                  </a>
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
