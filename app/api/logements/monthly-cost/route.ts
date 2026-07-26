import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { withReadAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

interface LogementCostRow {
  id: number;
  nom_logement: string;
  adresse: string;
  ville: string;
  prix_loyer: number;
  date_debut_contrat: string;
  date_fin_contrat: string | null;
  cout_loyer_mois: number | string;
}

interface GroupedVille {
  ville: string;
  logements: LogementCostRow[];
  sousTotal: number;
}

let logementsMonthlySchemaChecked = false;

async function ensureMonthlyCostSchema() {
  if (logementsMonthlySchemaChecked) {
    return;
  }

  await query(`
    ALTER TABLE logements
    ADD COLUMN IF NOT EXISTS nom_logement VARCHAR(255),
    ADD COLUMN IF NOT EXISTS est_actif BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS date_debut_contrat DATE,
    ADD COLUMN IF NOT EXISTS date_fin_contrat DATE
  `);

  logementsMonthlySchemaChecked = true;
}

const getHandler = async (request: NextRequest, payload: TokenPayload) => {
  void payload;
  try {
    await ensureMonthlyCostSchema();

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!year || !month) {
      return NextResponse.json(
        { error: 'year et month sont obligatoires' },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        { error: 'year et month invalides' },
        { status: 400 }
      );
    }

    // Construire les dates du mois
    const monthStart = new Date(yearNum, monthNum - 1, 1);
    const monthEnd = new Date(yearNum, monthNum, 0);

    const startDate = monthStart.toISOString().split('T')[0];
    const endDate = monthEnd.toISOString().split('T')[0];

    // Récupérer les logements qui sont actifs pendant ce mois
    const result = await query(
      `SELECT 
        id,
        COALESCE(NULLIF(TRIM(nom_logement), ''), adresse) as nom_logement,
        adresse,
        COALESCE(ville, 'Non renseignée') as ville,
        prix_loyer,
        COALESCE(date_debut_contrat, $1::DATE) as date_debut_contrat,
        COALESCE(date_fin_contrat, ($2::DATE + INTERVAL '10 years')) as date_fin_contrat,
        prix_loyer as cout_loyer_mois
      FROM logements
      WHERE COALESCE(est_actif, true) = true
      AND COALESCE(prix_loyer, 0) > 0
      AND COALESCE(date_debut_contrat, $1::DATE) <= $2::DATE
      AND COALESCE(date_fin_contrat, ($2::DATE + INTERVAL '10 years')::DATE) >= $1::DATE
      ORDER BY ville, nom_logement`,
      [startDate, endDate]
    );

    const logements = (result.rows as LogementCostRow[]).map((log) => ({
      ...log,
      cout_loyer_mois: parseFloat(String(log.cout_loyer_mois)) || 0
    }));
    const totalCout = logements.reduce((sum, log) => sum + (parseFloat(String(log.cout_loyer_mois)) || 0), 0);

    // Grouper par ville
    const byVille = logements.reduce<Record<string, LogementCostRow[]>>((acc, log) => {
      const ville = log.ville;
      if (!acc[ville]) acc[ville] = [];
      acc[ville].push(log);
      return acc;
    }, {});

    const groupedByVille = Object.entries(byVille).map(([ville, logs]): GroupedVille => ({
      ville,
      logements: logs,
      sousTotal: logs.reduce((sum, log) => sum + (Number(log.cout_loyer_mois) || 0), 0)
    }));

    // Formater le mois en texte
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const monthLabel = `${monthNames[monthNum - 1]} ${yearNum}`;

    return NextResponse.json({
      success: true,
      data: {
        mois: monthLabel,
        date: `${yearNum}-${String(monthNum).padStart(2, '0')}`,
        totalCout: parseFloat(totalCout.toFixed(2)),
        logements,
        groupedByVille,
        dateDebut: startDate,
        dateFin: endDate,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/logements/monthly-cost', method: 'GET' });
    }
    return NextResponse.json(
      { error: 'Erreur lors du calcul du coût mensuel' },
      { status: 500 }
    );
  }
};

export const GET = withReadAuth(getHandler);
