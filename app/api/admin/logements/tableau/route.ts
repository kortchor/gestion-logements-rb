import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

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
}

interface GroupedVille {
  ville: string;
  logements: Array<{
    id: number;
    nom_logement: string | null;
    adresse: string;
    est_actif: boolean;
    occupants: Array<{ nom: string; contribution: number }>;
    nombre_occupants: number;
    nombre_lits: number;
    lits_libres: number;
  }>;
}

const getHandler = async (request: NextRequest, payload: TokenPayload) => {
  if (!['admin', 'super_admin'].includes(payload.role)) {
    return NextResponse.json({ error: 'Accès refusé. Administrateur requis.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const ville = searchParams.get('ville');
    const actif = searchParams.get('actif');

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

    const logementsResult = await query(
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

    const logementRows = logementsResult.rows as LogementRow[];
    const logementIds = logementRows.map((l) => l.id);
    let occupants: OccupantRow[] = [];

    if (logementIds.length > 0) {
      const placeholders = logementIds.map((_, i) => `$${i + 1}`).join(',');
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
      occupants = occupantsResult.rows as OccupantRow[];
    }

    const grouped = logementRows.reduce<GroupedVille[]>((acc, log) => {
      const villeGroup = acc.find((g) => g.ville === log.ville);
      const logOccupants = occupants
        .filter((o) => o.logement_id === log.id)
        .map((o) => ({
          nom: `${o.prenom} ${o.nom}`,
          contribution: o.participation ? parseFloat(String(o.participation)) : 0,
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

    return NextResponse.json({ success: true, data: grouped });
  } catch (error) {
    console.error('❌ Erreur tableau logements:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération du tableau' }, { status: 500 });
  }
};

export const GET = withAuth(getHandler, ['admin', 'super_admin']);
