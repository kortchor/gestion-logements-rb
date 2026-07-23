import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

// Loyer total = ce que l'hôtel paye aux propriétaires chaque mois
const monthlyHandler = async (request: NextRequest, payload: TokenPayload) => {
  try {
    const result = await query(`
      SELECT 
        COALESCE(SUM(l.prix_loyer), 0) as total_loyer
      FROM logements l
      WHERE l.est_actif = true
        AND l.prix_loyer IS NOT NULL
    `);

    const totalLoyer = parseFloat(result.rows[0]?.total_loyer || 0);

    return NextResponse.json({ 
      success: true, 
      data: {
        totalCoutMois: totalLoyer,
        mois: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      }
    });
  } catch (error) {
    console.error('❌ Erreur coûts mensuels:', error);
    return NextResponse.json({ error: 'Erreur lors du calcul' }, { status: 500 });
  }
};

// Coût par centre analytique = SUM(prix_loyer / nb_occupants_du_lit) pour chaque bail actif
const byAnalyticalCenterHandler = async (request: NextRequest, payload: TokenPayload) => {
  try {
    const result = await query(`
      SELECT
        COALESCE(log.centre_analytique, 'Non assigné') as centre_analytique,
        SUM(
          CASE 
            WHEN li.id IS NOT NULL THEN 
              log.prix_loyer::numeric / NULLIF(occupant_counts.nb_occupants, 1)
            ELSE 
              log.prix_loyer::numeric / NULLIF(lits_count.nb_lits, 1)
          END
        ) as cout_centre,
        COUNT(DISTINCT b.id) as nb_collaborateurs
      FROM baux b
      JOIN logements log ON b.logement_id = log.id
      LEFT JOIN lit_occupants lo ON lo.collaborateur_id = b.collaborateur_id
      LEFT JOIN lits li ON lo.lit_id = li.id
      LEFT JOIN (
        SELECT lit_id, COUNT(*) as nb_occupants
        FROM lit_occupants
        GROUP BY lit_id
      ) occupant_counts ON li.id = occupant_counts.lit_id
      LEFT JOIN (
        SELECT ch.logement_id, COUNT(l.id) as nb_lits
        FROM lits l
        JOIN chambres ch ON l.chambre_id = ch.id
        GROUP BY ch.logement_id
      ) lits_count ON lits_count.logement_id = log.id
      WHERE b.date_fin >= CURRENT_DATE
        AND log.est_actif = true
      GROUP BY log.centre_analytique
      ORDER BY cout_centre DESC
    `);

    const data = result.rows.map(row => ({
      centre_analytique: row.centre_analytique,
      cout_total: parseFloat(row.cout_centre || 0),
      nombre_collaborateurs: parseInt(row.nb_collaborateurs || 0),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('❌ Erreur coûts par centre:', error);
    return NextResponse.json({ error: 'Erreur lors du calcul' }, { status: 500 });
  }
};

// Tableau des participations : chaque collaborateur avec sa participation et le coût hôtel
const participationsHandler = async (request: NextRequest, payload: TokenPayload) => {
  try {
    const result = await query(`
      SELECT
        c.prenom || ' ' || c.nom as collaborateur,
        log.nom_logement as logement,
        log.adresse,
        log.ville,
        COALESCE(log.centre_analytique, 'Non assigné') as centre_analytique,
        b.participation_mensuelle,
        -- Calculer le coût hôtel en fonction du nombre d'occupants du lit
        CASE 
          WHEN li.id IS NOT NULL THEN 
            log.prix_loyer::numeric / NULLIF(occupant_counts.nb_occupants, 1)
          ELSE 
            log.prix_loyer::numeric / NULLIF(lits_count.nb_lits, 1)
        END as cout_hotel_par_collaborateur,
        b.date_debut,
        b.date_fin
      FROM baux b
      JOIN collaborateurs c ON b.collaborateur_id = c.id
      JOIN logements log ON b.logement_id = log.id
      LEFT JOIN lit_occupants lo ON lo.collaborateur_id = c.id
      LEFT JOIN lits li ON lo.lit_id = li.id
      LEFT JOIN (
        SELECT lit_id, COUNT(*) as nb_occupants
        FROM lit_occupants
        GROUP BY lit_id
      ) occupant_counts ON li.id = occupant_counts.lit_id
      LEFT JOIN (
        SELECT ch.logement_id, COUNT(l.id) as nb_lits
        FROM lits l
        JOIN chambres ch ON l.chambre_id = ch.id
        GROUP BY ch.logement_id
      ) lits_count ON lits_count.logement_id = log.id
      WHERE b.date_fin >= CURRENT_DATE
        AND log.est_actif = true
      ORDER BY log.centre_analytique, c.nom, c.prenom
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
    console.error('❌ Erreur participations:', error);
    return NextResponse.json({ error: 'Erreur lors du calcul' }, { status: 500 });
  }
};

// Route dispatcher
export async function GET(request: NextRequest, context: any) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  return withAuth(async (req: NextRequest, payload: TokenPayload) => {
    if (type === 'by-center') return byAnalyticalCenterHandler(req, payload);
    if (type === 'participations') return participationsHandler(req, payload);
    return monthlyHandler(req, payload);
  })(request, context);
}
