import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withReadAuth, withWriteAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { verifyCsrfMiddleware } from '@/lib/csrf';
import { logError } from '@/lib/logger';
import { logAudit } from '@/lib/audit';

interface RenouvellementRow {
  id: number;
  nom_logement: string;
  adresse: string;
  ville: string;
  prix_loyer: number;
  est_actif: boolean;
  date_debut_contrat: string | null;
  date_fin_contrat: string | null;
  statut_contrat: 'expire' | 'actif' | 'indefini' | 'sans_debut';
}

let renouvellementsSchemaChecked = false;

async function ensureRenouvellementsSchema() {
  if (renouvellementsSchemaChecked) {
    return;
  }

  await query(`
    ALTER TABLE logements
    ADD COLUMN IF NOT EXISTS nom_logement VARCHAR(255),
    ADD COLUMN IF NOT EXISTS est_actif BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS date_debut_contrat DATE,
    ADD COLUMN IF NOT EXISTS date_fin_contrat DATE
  `);

  renouvellementsSchemaChecked = true;
}

const getHandler = async (request: NextRequest, payload: TokenPayload) => {
  void payload;
  try {
    await ensureRenouvellementsSchema();

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'expired').toLowerCase();

    const result = await query(`
      WITH normalized AS (
        SELECT
          l.id,
          COALESCE(NULLIF(TRIM(l.nom_logement), ''), l.adresse) AS nom_logement,
          l.adresse,
          COALESCE(l.ville, 'Non renseignee') AS ville,
          COALESCE(l.prix_loyer, 0)::numeric AS prix_loyer,
          COALESCE(l.est_actif, true) AS est_actif,
          CASE
            WHEN l.date_debut_contrat IS NULL THEN NULL
            WHEN l.date_debut_contrat::text ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN l.date_debut_contrat::DATE
            ELSE NULL
          END AS date_debut_calc,
          CASE
            WHEN l.date_fin_contrat IS NULL THEN NULL
            WHEN NULLIF(TRIM(l.date_fin_contrat::text), '') IS NULL THEN NULL
            WHEN l.date_fin_contrat::text ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN l.date_fin_contrat::DATE
            ELSE NULL
          END AS date_fin_calc
        FROM logements l
      )
      SELECT
        n.id,
        n.nom_logement,
        n.adresse,
        n.ville,
        n.prix_loyer,
        n.est_actif,
        n.date_debut_calc AS date_debut_contrat,
        n.date_fin_calc AS date_fin_contrat,
        CASE
          WHEN n.date_debut_calc IS NULL THEN 'sans_debut'
          WHEN n.date_fin_calc IS NULL THEN 'indefini'
          WHEN n.date_fin_calc < CURRENT_DATE THEN 'expire'
          ELSE 'actif'
        END AS statut_contrat
      FROM normalized n
      WHERE n.est_actif = true
      ORDER BY n.ville, n.nom_logement
    `);

    const allRows = result.rows as RenouvellementRow[];
    const filteredRows = allRows.filter((row) => {
      if (status === 'all') return true;
      if (status === 'active') return row.statut_contrat === 'actif' || row.statut_contrat === 'indefini';
      if (status === 'indefini') return row.statut_contrat === 'indefini';
      if (status === 'missing-start') return row.statut_contrat === 'sans_debut';
      return row.statut_contrat === 'expire';
    });

    return NextResponse.json({
      success: true,
      data: filteredRows,
      counts: {
        total: allRows.length,
        expire: allRows.filter((r) => r.statut_contrat === 'expire').length,
        actif: allRows.filter((r) => r.statut_contrat === 'actif').length,
        indefini: allRows.filter((r) => r.statut_contrat === 'indefini').length,
        sans_debut: allRows.filter((r) => r.statut_contrat === 'sans_debut').length,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/logements/renouvellements', method: 'GET' });
    }
    return NextResponse.json({ error: 'Erreur lors de la lecture des renouvellements' }, { status: 500 });
  }
};

function isValidDateFormat(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const patchHandler = async (request: NextRequest, payload: TokenPayload) => {
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json({ error: 'CSRF token invalide' }, { status: 403 });
    }

    await ensureRenouvellementsSchema();

    const body = await request.json();
    const singleLogementId = parseInt(String(body.logementId || ''), 10);
    const bulkIds: number[] = Array.isArray(body.logementIds)
      ? body.logementIds
          .map((id: unknown) => parseInt(String(id), 10))
          .filter((id: number) => !isNaN(id))
      : [];

    const logementIds: number[] = bulkIds.length > 0
      ? [...new Set<number>(bulkIds)]
      : (isNaN(singleLogementId) ? [] : [singleLogementId]);

    const dateDebut = typeof body.date_debut_contrat === 'string' ? body.date_debut_contrat.trim() : '';
    const dateFinRaw = typeof body.date_fin_contrat === 'string' ? body.date_fin_contrat.trim() : '';
    const dateFin = dateFinRaw.length > 0 ? dateFinRaw : null;

    if (logementIds.length === 0) {
      return NextResponse.json({ error: 'Aucun logement valide fourni' }, { status: 400 });
    }

    if (!dateDebut || !isValidDateFormat(dateDebut)) {
      return NextResponse.json({ error: 'La date de debut est requise au format YYYY-MM-DD' }, { status: 400 });
    }

    if (dateFin && !isValidDateFormat(dateFin)) {
      return NextResponse.json({ error: 'La date de fin doit etre au format YYYY-MM-DD' }, { status: 400 });
    }

    if (dateFin && new Date(dateFin) < new Date(dateDebut)) {
      return NextResponse.json({ error: 'La date de fin doit etre superieure ou egale a la date de debut' }, { status: 400 });
    }

    const existing = await query(
      `SELECT id FROM logements WHERE id = ANY($1::int[])`,
      [logementIds]
    );

    if (existing.rows.length !== logementIds.length) {
      return NextResponse.json({ error: 'Un ou plusieurs logements sont introuvables' }, { status: 404 });
    }

    const updateResult = await query(
      `UPDATE logements
       SET date_debut_contrat = $1,
           date_fin_contrat = $2
       WHERE id = ANY($3::int[])
       RETURNING id`,
      [dateDebut, dateFin, logementIds]
    );

    await logAudit({
      userId: payload.id,
      userEmail: payload.email,
      action: 'update',
      entityType: logementIds.length > 1 ? 'logement_batch' : 'logement',
      entityId: logementIds.length === 1 ? logementIds[0] : undefined,
      changes: {
        logement_ids: logementIds,
        updated_count: updateResult.rows.length,
        date_debut_contrat: dateDebut,
        date_fin_contrat: dateFin,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({
      success: true,
      updated: updateResult.rows.length,
      message: logementIds.length > 1
        ? 'Dates de bail mises a jour en masse'
        : 'Dates de bail mises a jour',
    });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/logements/renouvellements', method: 'PATCH' });
    }
    return NextResponse.json({ error: 'Erreur lors de la mise a jour des dates de bail' }, { status: 500 });
  }
};

export const GET = withReadAuth(getHandler);
export const PATCH = withWriteAuth(patchHandler);
