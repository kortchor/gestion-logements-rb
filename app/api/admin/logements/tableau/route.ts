import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { logError } from '@/lib/logger';
import { logApiTransferMetrics } from '@/lib/api-transfer-metrics';

let logementsTableauSchemaChecked = false;

async function ensureLogementsTableauSchema() {
  if (logementsTableauSchemaChecked) {
    return;
  }

  await query(`
    ALTER TABLE logements
    ADD COLUMN IF NOT EXISTS nom_logement VARCHAR(255),
    ADD COLUMN IF NOT EXISTS est_actif BOOLEAN DEFAULT true
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS lit_occupants (
      id SERIAL PRIMARY KEY,
      lit_id INTEGER NOT NULL REFERENCES lits(id) ON DELETE CASCADE,
      collaborateur_id INTEGER NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(lit_id, collaborateur_id)
    )
  `);

  await query('CREATE INDEX IF NOT EXISTS idx_logements_ville ON logements(ville)');
  await query('CREATE INDEX IF NOT EXISTS idx_logements_est_actif ON logements(est_actif)');
  await query('CREATE INDEX IF NOT EXISTS idx_chambres_logement_id ON chambres(logement_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_lits_chambre_id ON lits(chambre_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_lits_collaborateur_id ON lits(collaborateur_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_lit_occupants_lit_id ON lit_occupants(lit_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_lit_occupants_collaborateur_id ON lit_occupants(collaborateur_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_baux_collab_logement_active ON baux(collaborateur_id, logement_id, date_debut, date_fin)');

  logementsTableauSchemaChecked = true;
}

interface LogementRow {
  id: number;
  nom_logement: string | null;
  adresse: string;
  ville: string;
  est_actif: boolean;
  nombre_lits: string | number;
  lits_libres: string | number;
}

interface OccupantRow {
  logement_id: number;
  id: number;
  prenom: string;
  nom: string;
  participation: string | number | null;
  date_debut: string | null;
  date_fin: string | null;
}

interface GroupedVille {
  ville: string;
  logements: Array<{
    id: number;
    nom_logement: string | null;
    adresse: string;
    est_actif: boolean;
    occupants: Array<{ nom: string; contribution: number; date_debut: string | null; date_fin: string | null }>;
    nombre_occupants: number;
    nombre_lits: number;
    lits_libres: number;
  }>;
}

const getHandler = async (request: NextRequest, payload: TokenPayload) => {
  const startedAt = Date.now();
  if (!['admin', 'super_admin'].includes(payload.role)) {
    return NextResponse.json({ error: 'Accès refusé. Administrateur requis.' }, { status: 403 });
  }

  try {
    await ensureLogementsTableauSchema();

    const { searchParams } = new URL(request.url);
    const ville = searchParams.get('ville');
    const actif = searchParams.get('actif');
    const rawLimit = searchParams.get('limit');
    const rawOffset = searchParams.get('offset');
    const usePagination = rawLimit !== null || rawOffset !== null;
    const limit = Math.max(1, Math.min(parseInt(rawLimit || '100', 10), 500));
    const offset = Math.max(0, parseInt(rawOffset || '0', 10));

    let whereClause = '';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (actif === 'true') {
      whereClause += 'WHERE log.est_actif = true';
    } else if (actif === 'false') {
      whereClause += 'WHERE log.est_actif = false';
    }

    if (ville) {
      if (whereClause) {
        whereClause += ' AND';
      } else {
        whereClause += 'WHERE';
      }
      whereClause += ` log.ville ILIKE $${paramIndex}`;
      params.push(`%${ville}%`);
      paramIndex++;
    }

    const paginationClause = usePagination ? ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}` : '';
    const logementsParams = usePagination ? [...params, limit, offset] : params;

    const [logementsResult, countResult] = await Promise.all([
      query(
      `SELECT
        log.id,
        COALESCE(NULLIF(TRIM(log.nom_logement), ''), log.adresse) as nom_logement,
        log.adresse,
        COALESCE(log.ville, 'Non renseignée') as ville,
        COALESCE(log.est_actif, true) as est_actif,
        COUNT(DISTINCT l.id) as nombre_lits,
        COUNT(DISTINCT CASE WHEN l.collaborateur_id IS NULL AND lo.collaborateur_id IS NULL THEN l.id END) as lits_libres
      FROM logements log
      LEFT JOIN chambres c ON log.id = c.logement_id
      LEFT JOIN lits l ON c.id = l.chambre_id
      LEFT JOIN lit_occupants lo ON l.id = lo.lit_id
      ${whereClause}
      GROUP BY log.id, log.nom_logement, log.adresse, log.ville, log.est_actif
      ORDER BY log.ville, log.nom_logement${paginationClause}`,
      logementsParams
      ),
      query(
        `SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE COALESCE(log.est_actif, true) = true)::int AS actifs,
          COUNT(DISTINCT COALESCE(log.ville, 'Non renseignée'))::int AS villes
         FROM logements log
         ${whereClause}`,
        params
      ),
    ]);

    const logementRows = logementsResult.rows as LogementRow[];
    const logementIds = logementRows.map((l) => l.id);
    let occupants: OccupantRow[] = [];

    if (logementIds.length > 0) {
      const occupantsResult = await query(
        `WITH occupant_links AS (
          SELECT
            ch.logement_id,
            l.collaborateur_id
          FROM chambres ch
          JOIN lits l ON l.chambre_id = ch.id
          WHERE ch.logement_id = ANY($1::int[])
            AND l.collaborateur_id IS NOT NULL

          UNION

          SELECT
            ch.logement_id,
            lo.collaborateur_id
          FROM chambres ch
          JOIN lits l ON l.chambre_id = ch.id
          JOIN lit_occupants lo ON lo.lit_id = l.id
          WHERE ch.logement_id = ANY($1::int[])
        )
        SELECT DISTINCT
          ol.logement_id,
          col.id,
          col.prenom,
          col.nom,
          COALESCE(b.participation_mensuelle, 0) as participation,
          b.date_debut,
          b.date_fin
        FROM occupant_links ol
        JOIN collaborateurs col ON col.id = ol.collaborateur_id
        LEFT JOIN baux b ON col.id = b.collaborateur_id
          AND ol.logement_id = b.logement_id
          AND b.date_debut <= CURRENT_DATE
          AND COALESCE(b.date_fin, CURRENT_DATE + INTERVAL '10 years') >= CURRENT_DATE
        ORDER BY ol.logement_id, col.nom, col.prenom`,
        [logementIds]
      );
      occupants = occupantsResult.rows as OccupantRow[];
    }

    const grouped = logementRows.reduce<GroupedVille[]>((acc, log) => {
      const villeGroup = acc.find((g) => g.ville === log.ville);
      const logOccupants = occupants
        .filter((o) => o.logement_id === log.id)
        .map((o) => ({
          nom: `${o.prenom} ${o.nom}`,
          contribution: o.participation ? parseFloat(String(o.participation)) : 0,
          date_debut: o.date_debut,
          date_fin: o.date_fin,
        }));

      const logementData = {
        id: log.id,
        nom_logement: log.nom_logement,
        adresse: log.adresse,
        est_actif: log.est_actif,
        occupants: logOccupants,
        nombre_occupants: logOccupants.length,
        nombre_lits: parseInt(String(log.nombre_lits || 0), 10),
        lits_libres: parseInt(String(log.lits_libres || 0), 10),
      };

      if (villeGroup) {
        villeGroup.logements.push(logementData);
      } else {
        acc.push({ ville: log.ville, logements: [logementData] });
      }

      return acc;
    }, []);

    grouped.sort((a, b) => a.ville.localeCompare(b.ville));

    const total = parseInt(countResult.rows[0]?.total || '0', 10);
    const actifs = parseInt(countResult.rows[0]?.actifs || '0', 10);
    const villes = parseInt(countResult.rows[0]?.villes || '0', 10);
    const responsePayload = {
      success: true,
      data: grouped,
      counts: {
        total,
        actifs,
        villes,
      },
      pagination: usePagination
        ? {
            limit,
            offset,
            total,
            hasMore: offset + logementRows.length < total,
          }
        : undefined,
    };
    logApiTransferMetrics('/api/admin/logements/tableau', responsePayload, { startedAt });
    return NextResponse.json(responsePayload);
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/logements/tableau', method: 'GET' });
    }
    return NextResponse.json({ error: 'Erreur lors de la récupération du tableau' }, { status: 500 });
  }
};

export const GET = withAuth(getHandler, ['admin', 'super_admin']);
