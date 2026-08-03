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

// Coût par centre analytique = SUM(prix_loyer / nb_occupants) pour chaque bail actif
const byAnalyticalCenterHandler = async (request: NextRequest, payload: TokenPayload) => {
  void request;
  void payload;
  try {
    await ensureDashboardCostsSchema();

    const result = await query(`
      WITH active_baux AS (
        SELECT b.collaborateur_id, b.logement_id
        FROM baux b
        WHERE b.date_debut <= CURRENT_DATE
          AND COALESCE(b.date_fin, CURRENT_DATE + INTERVAL '10 years') >= CURRENT_DATE
      ),
      occupants_per_logement AS (
        SELECT logement_id, COUNT(DISTINCT collaborateur_id) as nb_occupants
        FROM active_baux
        GROUP BY logement_id
      )
      SELECT
        COALESCE(NULLIF(TRIM(c.centre_principal), ''), COALESCE(NULLIF(TRIM(log.centre_analytique), ''), 'Non assigné')) as centre_analytique,
        SUM(
          COALESCE(log.prix_loyer, 0)::numeric / GREATEST(COALESCE(opl.nb_occupants, 1), 1)
        ) as cout_centre,
        COUNT(DISTINCT ab.collaborateur_id) as nb_collaborateurs
      FROM active_baux ab
      JOIN logements log ON ab.logement_id = log.id
      JOIN collaborateurs c ON ab.collaborateur_id = c.id
      LEFT JOIN occupants_per_logement opl ON opl.logement_id = log.id
      WHERE COALESCE(log.est_actif, true) = true
        AND COALESCE(log.prix_loyer, 0) > 0
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

// Tableau des participations : chaque collaborateur avec sa participation et son coût hôtel
const participationsHandler = async (request: NextRequest, payload: TokenPayload) => {
  void request;
  void payload;
  try {
    await ensureDashboardCostsSchema();

    const result = await query(`
      WITH active_baux AS (
        SELECT b.collaborateur_id, b.logement_id, b.participation_mensuelle, b.date_debut, b.date_fin
        FROM baux b
        WHERE b.date_debut <= CURRENT_DATE
          AND COALESCE(b.date_fin, CURRENT_DATE + INTERVAL '10 years') >= CURRENT_DATE
      ),
      occupants_per_logement AS (
        SELECT logement_id, COUNT(DISTINCT collaborateur_id) as nb_occupants
        FROM active_baux
        GROUP BY logement_id
      )
      SELECT
        c.prenom || ' ' || c.nom as collaborateur,
        log.nom_logement as logement,
        log.adresse,
        log.ville,
        COALESCE(NULLIF(TRIM(c.centre_principal), ''), COALESCE(NULLIF(TRIM(log.centre_analytique), ''), 'Non assigné')) as centre_analytique,
        ab.participation_mensuelle,
        COALESCE(log.prix_loyer, 0)::numeric / GREATEST(COALESCE(opl.nb_occupants, 1), 1) as cout_hotel_par_collaborateur,
        ab.date_debut,
        ab.date_fin
      FROM active_baux ab
      JOIN collaborateurs c ON ab.collaborateur_id = c.id
      JOIN logements log ON ab.logement_id = log.id
      LEFT JOIN occupants_per_logement opl ON opl.logement_id = log.id
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
