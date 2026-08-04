import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const getHandler = async (request: NextRequest, payload: TokenPayload) => {
  void request;
  if (!['admin', 'super_admin'].includes(payload.role)) {
    return NextResponse.json({ error: 'Accès refusé. Administrateur requis.' }, { status: 403 });
  }

  try {
    const [logementsIncomplets, logementsSansChambre, chambresSansLit, litsOrphelins, bauxInvalides, litsSurcharges, litsConflits] = await Promise.all([
      query(`
        SELECT id, nom_logement, adresse, ville, est_actif
        FROM logements
        WHERE COALESCE(NULLIF(TRIM(nom_logement), ''), '') = ''
           OR COALESCE(NULLIF(TRIM(adresse), ''), '') = ''
           OR COALESCE(NULLIF(TRIM(ville), ''), '') = ''
        ORDER BY id DESC
      `),
      query(`
        SELECT l.id, COALESCE(NULLIF(TRIM(l.nom_logement), ''), l.adresse) AS nom_logement, l.adresse, l.ville, COALESCE(l.est_actif, true) AS est_actif
        FROM logements l
        LEFT JOIN chambres c ON c.logement_id = l.id
        GROUP BY l.id
        HAVING COUNT(c.id) = 0
        ORDER BY l.id DESC
      `),
      query(`
        SELECT c.id, c.nom, c.type_lit, c.nombre_lits, l.id AS logement_id, COALESCE(NULLIF(TRIM(l.nom_logement), ''), l.adresse) AS nom_logement, l.ville
        FROM chambres c
        LEFT JOIN logements l ON l.id = c.logement_id
        LEFT JOIN lits li ON li.chambre_id = c.id
        GROUP BY c.id, l.id
        HAVING COUNT(li.id) = 0
        ORDER BY c.id DESC
      `),
      query(`
        SELECT id, numero, chambre_id, collaborateur_id
        FROM lits
        WHERE chambre_id IS NULL
        ORDER BY id DESC
      `),
      query(`
        SELECT
          b.id,
          b.date_debut,
          b.date_fin,
          b.collaborateur_id,
          c.prenom,
          c.nom,
          l.id AS logement_id,
          COALESCE(NULLIF(TRIM(l.nom_logement), ''), l.adresse) AS nom_logement,
          l.ville
        FROM baux b
        LEFT JOIN collaborateurs c ON c.id = b.collaborateur_id
        LEFT JOIN logements l ON l.id = b.logement_id
        WHERE b.date_debut IS NULL
           OR (b.date_fin IS NOT NULL AND b.date_debut > b.date_fin)
        ORDER BY b.id DESC
      `),
      query(`
        WITH occupant_counts AS (
          SELECT lit_id, COUNT(DISTINCT collaborateur_id)::int AS occupant_count
          FROM lit_occupants
          GROUP BY lit_id
        )
        SELECT
          l.id,
          l.numero,
          l.type_lit,
          l.collaborateur_id AS legacy_collaborateur_id,
          COALESCE(oc.occupant_count, 0) AS occupant_count,
          c.nom AS chambre_nom,
          log.id AS logement_id,
          COALESCE(NULLIF(TRIM(log.nom_logement), ''), log.adresse) AS nom_logement,
          log.ville
        FROM lits l
        LEFT JOIN occupant_counts oc ON oc.lit_id = l.id
        LEFT JOIN chambres c ON c.id = l.chambre_id
        LEFT JOIN logements log ON log.id = c.logement_id
        WHERE (
          (l.type_lit = 'simple' AND COALESCE(oc.occupant_count, 0) > 1)
          OR (l.type_lit = 'double' AND COALESCE(oc.occupant_count, 0) > 2)
          OR (l.collaborateur_id IS NOT NULL AND COALESCE(oc.occupant_count, 0) > 0)
        )
        ORDER BY l.id DESC
      `),
      query(`
        SELECT
          l.id,
          l.numero,
          l.type_lit,
          l.collaborateur_id AS legacy_collaborateur_id,
          COUNT(lo.id)::int AS occupants_count,
          c.nom AS chambre_nom,
          log.id AS logement_id,
          COALESCE(NULLIF(TRIM(log.nom_logement), ''), log.adresse) AS nom_logement,
          log.ville
        FROM lits l
        LEFT JOIN lit_occupants lo ON lo.lit_id = l.id
        LEFT JOIN chambres c ON c.id = l.chambre_id
        LEFT JOIN logements log ON log.id = c.logement_id
        WHERE l.collaborateur_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM lit_occupants lo2 WHERE lo2.lit_id = l.id
        )
        GROUP BY l.id, c.id, log.id
        ORDER BY l.id DESC
      `),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logementsIncomplets: logementsIncomplets.rows,
        logementsSansChambre: logementsSansChambre.rows,
        chambresSansLit: chambresSansLit.rows,
        litsOrphelins: litsOrphelins.rows,
        bauxInvalides: bauxInvalides.rows,
        litsSurcharges: litsSurcharges.rows,
        litsConflits: litsConflits.rows,
      },
      totals: {
        logementsIncomplets: logementsIncomplets.rows.length,
        logementsSansChambre: logementsSansChambre.rows.length,
        chambresSansLit: chambresSansLit.rows.length,
        litsOrphelins: litsOrphelins.rows.length,
        bauxInvalides: bauxInvalides.rows.length,
        litsSurcharges: litsSurcharges.rows.length,
        litsConflits: litsConflits.rows.length,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/anomalies', method: 'GET' });
    }
    return NextResponse.json({ error: 'Erreur lors de la récupération des anomalies' }, { status: 500 });
  }
};

export const GET = withAuth(getHandler, ['admin', 'super_admin']);
