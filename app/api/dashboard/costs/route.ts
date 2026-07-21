import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

// Coûts mensuels totaux des logements (somme des loyers du mois courant)
const monthlyHandler = async (request: NextRequest, payload: TokenPayload) => {
  try {
    // Loyers actuels pour tous les logements actifs (sur mois courant)
    const result = await query(`
      SELECT 
        COALESCE(SUM(l.prix_loyer), 0) as total_coût_mois
      FROM logements l
      WHERE l.est_actif = true
        AND l.prix_loyer IS NOT NULL
    `);

    const totalCoutMois = parseFloat(result.rows[0]?.total_coût_mois || 0);

    return NextResponse.json({ 
      success: true, 
      data: {
        totalCoutMois,
        mois: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors du calcul des coûts mensuels:', error);
    return NextResponse.json(
      { error: 'Erreur lors du calcul' },
      { status: 500 }
    );
  }
};

// Coûts par centre analytique
const byAnalyticalCenterHandler = async (request: NextRequest, payload: TokenPayload) => {
  try {
    const result = await query(`
      SELECT 
        l.centre_analytique as center,
        COALESCE(SUM(l.prix_loyer), 0) as total_cost,
        COUNT(l.id) as logement_count
      FROM logements l
      WHERE l.est_actif = true
        AND l.centre_analytique IS NOT NULL
        AND l.prix_loyer IS NOT NULL
      GROUP BY l.centre_analytique
      ORDER BY total_cost DESC
    `);

    const data = result.rows.map(row => ({
      centre_analytique: row.center || 'Non assigné',
      coût_total: parseFloat(row.total_cost),
      nombre_logements: row.logement_count
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('❌ Erreur lors du calcul par centre analytique:', error);
    return NextResponse.json(
      { error: 'Erreur lors du calcul' },
      { status: 500 }
    );
  }
};

// Route dispatcher
export async function GET(request: NextRequest, context: any) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  return withAuth(async (req: NextRequest, payload: TokenPayload) => {
    if (type === 'by-center') {
      return byAnalyticalCenterHandler(req, payload);
    }
    return monthlyHandler(req, payload);
  })(request, context);
}
