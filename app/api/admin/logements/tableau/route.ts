import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

const getHandler = async (request: NextRequest, payload: TokenPayload) => {
  // Vérifier que l'utilisateur est admin ou super_admin
  if (!['admin', 'super_admin'].includes(payload.role)) {
    return NextResponse.json(
      { error: 'Accès refusé. Administrateur requis.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const ville = searchParams.get('ville');
    const actif = searchParams.get('actif');

    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (actif === 'true') {
      whereClause += `WHERE log.est_actif = true`;
    } else if (actif === 'false') {
      whereClause += `WHERE log.est_actif = false`;
    }

    if (ville) {
      if (whereClause) whereClause += ' AND';
      else whereClause += 'WHERE';
      whereClause += ` log.ville ILIKE $${paramIndex}`;
      params.push(`%${ville}%`);
      paramIndex++;
    }

    // Requête pour récupérer tous les logements avec leurs informations
    const logements = await query(
      `SELECT 
        log.id,
        log.nom_logement,
        log.adresse,
        log.ville,
        log.est_actif,
        COUNT(DISTINCT l.id) as nombre_lits,
        COUNT(DISTINCT CASE WHEN l.collaborateur_id IS NULL AND lo.collaborateur_id IS NULL THEN l.id END) as lits_libres
      FROM logements log
      LEFT JOIN chambres c ON log.id = c.logement_id
      LEFT JOIN lits l ON c.id = l.chambre_id
      LEFT JOIN lit_occupants lo ON l.id = lo.lit_id
      ${whereClause}
      GROUP BY log.id, log.nom_logement, log.adresse, log.ville, log.est_actif
      ORDER BY log.ville, log.nom_logement`,
      params
    );

    // Pour chaque logement, récupérer les occupants
    const logementIds = logements.rows.map((l: any) => l.id);
    let occupants: any[] = [];

    if (logementIds.length > 0) {
      const placeholders = logementIds
        .map((_, i) => `$${i + 1}`)
        .join(',');

      // Récupérer les occupants (directement via lits.collaborateur_id et via lit_occupants)
      const occupantsResult = await query(
        `SELECT DISTINCT
          c.logement_id,
          col.id,
          col.prenom,
          col.nom,
          COALESCE(b.participation_mensuelle, 0) as participation
        FROM chambres c
        LEFT JOIN lits l ON c.id = l.chambre_id
        LEFT JOIN collaborateurs col ON (l.collaborateur_id = col.id OR col.id IN (
          SELECT collaborateur_id FROM lit_occupants WHERE lit_id = l.id
        ))
        LEFT JOIN baux b ON col.id = b.collaborateur_id AND c.logement_id = b.logement_id AND CURRENT_DATE BETWEEN b.date_debut AND b.date_fin
        WHERE c.logement_id IN (${placeholders})
        AND col.id IS NOT NULL
        ORDER BY c.logement_id, col.nom, col.prenom`,
        logementIds
      );

      occupants = occupantsResult.rows;
    }

    // Grouper par ville
    const grouped = logements.rows.reduce((acc: any, log: any) => {
      const villeGroup = acc.find((g: any) => g.ville === log.ville);
      
      // Récupérer les occupants pour ce logement avec leurs contributions
      const logOccupants = occupants
        .filter((o: any) => o.logement_id === log.id)
        .map((o: any) => ({
          nom: `${o.prenom} ${o.nom}`,
          contribution: o.participation ? parseFloat(o.participation) : 0
        }));

      const logementData = {
        id: log.id,
        nom_logement: log.nom_logement,
        adresse: log.adresse,
        est_actif: log.est_actif,
        occupants: logOccupants,
        nombre_occupants: logOccupants.length,
        nombre_lits: parseInt(log.nombre_lits || 0),
        lits_libres: parseInt(log.lits_libres || 0),
      };

      if (villeGroup) {
        villeGroup.logements.push(logementData);
      } else {
        acc.push({
          ville: log.ville,
          logements: [logementData],
        });
      }

      return acc;
    }, []);

    // Trier les villes alphabétiquement
    grouped.sort((a: any, b: any) => a.ville.localeCompare(b.ville));

    return NextResponse.json({
      success: true,
      data: grouped,
    });
  } catch (error) {
    console.error('❌ Erreur tableau logements:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du tableau' },
      { status: 500 }
    );
  }
};

export const GET = withAuth(getHandler, ['admin', 'super_admin']);
