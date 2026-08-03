import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { logError } from '@/lib/logger';

let dashboardCostsSchemaChecked = false;

async function ensureDashboardCostsSchema() {
  if (dashboardCostsSchemaChecked) {
    return;
  }

  await query(`
    ALTER TABLE logements
    ADD COLUMN IF NOT EXISTS centre_analytique VARCHAR(255)
  `);

  dashboardCostsSchemaChecked = true;
}

// Loyer total = ce que l'hôtel paye aux propriétaires chaque mois
const monthlyHandler = async (request: NextRequest, payload: TokenPayload) => {
  void request;
  void payload;
  try {
    await ensureDashboardCostsSchema();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startDate = monthStart.toISOString().split('T')[0];
    const endDate = monthEnd.toISOString().split('T')[0];

    const result = await query(`
      WITH period AS (
        SELECT
          $1::DATE AS month_start,
          $2::DATE AS month_end,
          ($2::DATE - $1::DATE + 1) AS days_in_month
      ),
      eligible AS (
        SELECT
          l.id,
          COALESCE(l.prix_loyer, 0)::numeric AS prix_loyer,
          l.date_debut_contrat::DATE AS date_debut,
          l.date_fin_contrat::DATE AS date_fin
        FROM logements l
        WHERE COALESCE(l.est_actif, true) = true
          AND COALESCE(l.prix_loyer, 0) > 0
          AND l.date_debut_contrat IS NOT NULL
          AND l.date_debut_contrat <= $2::DATE
          AND COALESCE(l.date_fin_contrat, 'infinity'::DATE) >= $1::DATE
      ),
      overlap AS (
        SELECT
          e.prix_loyer,
          GREATEST(e.date_debut, p.month_start) AS overlap_start,
          LEAST(COALESCE(e.date_fin, p.month_end), p.month_end) AS overlap_end,
          p.days_in_month
        FROM eligible e
        CROSS JOIN period p
      )
      SELECT COALESCE(
        SUM(
          CASE
            WHEN overlap_end < overlap_start THEN 0
            ELSE prix_loyer * ((overlap_end - overlap_start + 1)::numeric / NULLIF(days_in_month, 0)::numeric)
          END
        ),
        0
      ) AS total_loyer
      FROM overlap
    `, [startDate, endDate]);

    const totalLoyer = parseFloat(result.rows[0]?.total_loyer || 0);

    return NextResponse.json({ 
      success: true, 
      data: {
        totalCoutMois: totalLoyer,
        mois: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/dashboard/costs', section: 'monthly' });
    }
    return NextResponse.json({ error: 'Erreur lors du calcul' }, { status: 500 });
  }
};

// Coût par centre analytique = (loyer / nb_lits_du_logement) puis partage par nb_occupants_du_lit
const byAnalyticalCenterHandler = async (request: NextRequest, payload: TokenPayload) => {
  void request;
  void payload;
  try {
    await ensureDashboardCostsSchema();

    const result = await query(`
      WITH active_baux AS (
        SELECT DISTINCT b.collaborateur_id, b.logement_id
        FROM baux b
        WHERE b.date_debut <= CURRENT_DATE
          AND COALESCE(b.date_fin, CURRENT_DATE + INTERVAL '10 years') >= CURRENT_DATE
      ),
      lits_per_logement AS (
        SELECT
          ch.logement_id,
          COUNT(l.id)::int AS nb_lits
        FROM chambres ch
        JOIN lits l ON l.chambre_id = ch.id
        GROUP BY ch.logement_id
      ),
      occupants_per_lit AS (
        SELECT
          occ.lit_id,
          COUNT(DISTINCT occ.collaborateur_id)::int AS nb_occupants
        FROM (
          SELECT lo.lit_id, lo.collaborateur_id
          FROM lit_occupants lo

          UNION

          SELECT l.id AS lit_id, l.collaborateur_id
          FROM lits l
          WHERE l.collaborateur_id IS NOT NULL
        ) AS occ
        GROUP BY occ.lit_id
      ),
      active_assignments AS (
        SELECT
          ab.collaborateur_id,
          ab.logement_id,
          assigned_lit.lit_id
        FROM active_baux ab
        LEFT JOIN LATERAL (
          SELECT l.id AS lit_id
          FROM lits l
          JOIN chambres ch ON ch.id = l.chambre_id
          LEFT JOIN lit_occupants lo
            ON lo.lit_id = l.id
           AND lo.collaborateur_id = ab.collaborateur_id
          WHERE ch.logement_id = ab.logement_id
            AND (lo.collaborateur_id IS NOT NULL OR l.collaborateur_id = ab.collaborateur_id)
          ORDER BY CASE WHEN lo.collaborateur_id IS NOT NULL THEN 0 ELSE 1 END, l.id
          LIMIT 1
        ) AS assigned_lit ON true
      ),
      per_collaborateur AS (
        SELECT
          aa.collaborateur_id,
          COALESCE(NULLIF(TRIM(c.centre_principal), ''), COALESCE(NULLIF(TRIM(log.centre_analytique), ''), 'Non assigné')) AS centre_analytique,
          CASE
            WHEN COALESCE(lpl.nb_lits, 0) <= 0 THEN 0::numeric
            WHEN aa.lit_id IS NULL THEN COALESCE(log.prix_loyer, 0)::numeric / lpl.nb_lits::numeric
            ELSE (COALESCE(log.prix_loyer, 0)::numeric / lpl.nb_lits::numeric) / GREATEST(COALESCE(opl.nb_occupants, 1), 1)::numeric
          END AS cout_hotel
        FROM active_assignments aa
        JOIN collaborateurs c ON c.id = aa.collaborateur_id
        JOIN logements log ON log.id = aa.logement_id
        LEFT JOIN lits_per_logement lpl ON lpl.logement_id = aa.logement_id
        LEFT JOIN occupants_per_lit opl ON opl.lit_id = aa.lit_id
        WHERE COALESCE(log.est_actif, true) = true
          AND COALESCE(log.prix_loyer, 0) > 0
      )
      SELECT
        centre_analytique,
        SUM(cout_hotel) AS cout_centre,
        COUNT(DISTINCT collaborateur_id) AS nb_collaborateurs
      FROM per_collaborateur
      GROUP BY 1
      ORDER BY cout_centre DESC
    `);

    const data = result.rows.map(row => ({
      centre_analytique: row.centre_analytique,
      cout_total: parseFloat(row.cout_centre || 0),
      nombre_collaborateurs: parseInt(row.nb_collaborateurs || 0),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/dashboard/costs', section: 'by-center' });
    }
    return NextResponse.json({ error: 'Erreur lors du calcul' }, { status: 500 });
  }
};

// Tableau des participations : coût hôtel basé sur coût par lit puis partage par occupants du lit
const participationsHandler = async (request: NextRequest, payload: TokenPayload) => {
  void request;
  void payload;
  try {
    await ensureDashboardCostsSchema();

    const result = await query(`
      WITH active_baux AS (
        SELECT DISTINCT b.collaborateur_id, b.logement_id, b.participation_mensuelle, b.date_debut, b.date_fin
        FROM baux b
        WHERE b.date_debut <= CURRENT_DATE
          AND COALESCE(b.date_fin, CURRENT_DATE + INTERVAL '10 years') >= CURRENT_DATE
      ),
      lits_per_logement AS (
        SELECT
          ch.logement_id,
          COUNT(l.id)::int AS nb_lits
        FROM chambres ch
        JOIN lits l ON l.chambre_id = ch.id
        GROUP BY ch.logement_id
      ),
      occupants_per_lit AS (
        SELECT
          occ.lit_id,
          COUNT(DISTINCT occ.collaborateur_id)::int AS nb_occupants
        FROM (
          SELECT lo.lit_id, lo.collaborateur_id
          FROM lit_occupants lo

          UNION

          SELECT l.id AS lit_id, l.collaborateur_id
          FROM lits l
          WHERE l.collaborateur_id IS NOT NULL
        ) AS occ
        GROUP BY occ.lit_id
      ),
      active_assignments AS (
        SELECT
          ab.collaborateur_id,
          ab.logement_id,
          ab.participation_mensuelle,
          ab.date_debut,
          ab.date_fin,
          assigned_lit.lit_id,
          assigned_lit.numero AS lit_numero
        FROM active_baux ab
        LEFT JOIN LATERAL (
          SELECT l.id AS lit_id, l.numero
          FROM lits l
          JOIN chambres ch ON ch.id = l.chambre_id
          LEFT JOIN lit_occupants lo
            ON lo.lit_id = l.id
           AND lo.collaborateur_id = ab.collaborateur_id
          WHERE ch.logement_id = ab.logement_id
            AND (lo.collaborateur_id IS NOT NULL OR l.collaborateur_id = ab.collaborateur_id)
          ORDER BY CASE WHEN lo.collaborateur_id IS NOT NULL THEN 0 ELSE 1 END, l.id
          LIMIT 1
        ) AS assigned_lit ON true
      )
      SELECT
        c.prenom || ' ' || c.nom as collaborateur,
        log.nom_logement as logement,
        log.adresse,
        log.ville,
        COALESCE(NULLIF(TRIM(c.centre_principal), ''), COALESCE(NULLIF(TRIM(log.centre_analytique), ''), 'Non assigné')) as centre_analytique,
        aa.participation_mensuelle,
        CASE
          WHEN COALESCE(lpl.nb_lits, 0) <= 0 THEN 0::numeric
          WHEN aa.lit_id IS NULL THEN COALESCE(log.prix_loyer, 0)::numeric / lpl.nb_lits::numeric
          ELSE (COALESCE(log.prix_loyer, 0)::numeric / lpl.nb_lits::numeric) / GREATEST(COALESCE(opl.nb_occupants, 1), 1)::numeric
        END as cout_hotel_par_collaborateur,
        aa.date_debut,
        aa.date_fin,
        aa.lit_numero,
        COALESCE(opl.nb_occupants, 0) AS lit_occupants,
        COALESCE(lpl.nb_lits, 0) AS logement_nb_lits
      FROM active_assignments aa
      JOIN collaborateurs c ON aa.collaborateur_id = c.id
      JOIN logements log ON aa.logement_id = log.id
      LEFT JOIN lits_per_logement lpl ON lpl.logement_id = aa.logement_id
      LEFT JOIN occupants_per_lit opl ON opl.lit_id = aa.lit_id
      WHERE COALESCE(log.est_actif, true) = true
        AND COALESCE(log.prix_loyer, 0) > 0
      ORDER BY centre_analytique, c.nom, c.prenom
    `);

    const data = result.rows.map(row => ({
      collaborateur: row.collaborateur,
      logement: row.logement || row.adresse,
      ville: row.ville,
      centre_analytique: row.centre_analytique,
      participation_mensuelle: parseFloat(row.participation_mensuelle || 0),
      cout_hotel: parseFloat(row.cout_hotel_par_collaborateur || 0),
      date_debut: row.date_debut,
      date_fin: row.date_fin,
    }));

    // Coût total = somme des coûts hôtel par collaborateur
    const coutTotal = data.reduce((sum, row) => sum + row.cout_hotel, 0);

    return NextResponse.json({ success: true, data, coutTotal });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/dashboard/costs', section: 'participations' });
    }
    return NextResponse.json({ error: 'Erreur lors du calcul' }, { status: 500 });
  }
};

// Route dispatcher
export async function GET(request: NextRequest, context: { params: Promise<Record<string, never>> }) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  return withAuth(async (req: NextRequest, payload: TokenPayload) => {
    if (type === 'by-center') return byAnalyticalCenterHandler(req, payload);
    if (type === 'participations') return participationsHandler(req, payload);
    return monthlyHandler(req, payload);
  })(request, context);
}
