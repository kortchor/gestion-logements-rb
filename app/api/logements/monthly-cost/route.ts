import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
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
        nom_logement,
        adresse,
        ville,
        prix_loyer,
        COALESCE(date_debut_contrat, $1::DATE) as date_debut_contrat,
        COALESCE(date_fin_contrat, ($2::DATE + INTERVAL '10 years')) as date_fin_contrat,
        prix_loyer as cout_loyer_mois
      FROM logements
      WHERE est_actif = true
      AND prix_loyer > 0
      ORDER BY ville, nom_logement`,
      [startDate, endDate]
    );

    const logements = result.rows.map((log: any) => ({
      ...log,
      cout_loyer_mois: parseFloat(log.cout_loyer_mois) || 0
    }));
    const totalCout = logements.reduce((sum: number, log: any) => sum + (parseFloat(log.cout_loyer_mois) || 0), 0);

    // Grouper par ville
    const byVille = logements.reduce((acc: any, log: any) => {
      const ville = log.ville;
      if (!acc[ville]) acc[ville] = [];
      acc[ville].push(log);
      return acc;
    }, {});

    const groupedByVille = Object.entries(byVille).map(([ville, logs]: [string, any]) => ({
      ville,
      logements: logs,
      sousTotal: logs.reduce((sum: number, log: any) => sum + (log.cout_loyer_mois || 0), 0)
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
    console.error('❌ Erreur calcul coût mensuel:', error);
    return NextResponse.json(
      { error: 'Erreur lors du calcul du coût mensuel' },
      { status: 500 }
    );
  }
}
