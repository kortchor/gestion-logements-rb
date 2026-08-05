import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withReadAuth } from '@/lib/api-helpers';
import { logError } from '@/lib/logger';

const getHandler = async () => {
  try {
    const result = await query(`
      WITH bed_state AS (
        SELECT
          l.id,
          l.numero,
          l.chambre_id,
          l.collaborateur_id,
          COALESCE(lo_counts.occupants_count, CASE WHEN l.collaborateur_id IS NOT NULL THEN 1 ELSE 0 END) AS occupants_count
        FROM lits l
        LEFT JOIN (
          SELECT lit_id, COUNT(*)::int AS occupants_count
          FROM lit_occupants
          GROUP BY lit_id
        ) lo_counts ON lo_counts.lit_id = l.id
      ),
      primary_occupant AS (
        SELECT DISTINCT ON (lo.lit_id)
          lo.lit_id,
          c.nom,
          c.prenom
        FROM lit_occupants lo
        JOIN collaborateurs c ON c.id = lo.collaborateur_id
        ORDER BY lo.lit_id, lo.created_at
      )
      SELECT 
        bs.id,
        bs.numero,
        (bs.occupants_count > 0) as est_occupe,
        ch.nom as chambre_nom,
        log.adresse as logement_adresse,
        log.ville,
        COALESCE(po.nom, c_legacy.nom) as collaborateur_nom,
        COALESCE(po.prenom, c_legacy.prenom) as collaborateur_prenom
      FROM bed_state bs
      LEFT JOIN chambres ch ON bs.chambre_id = ch.id
      LEFT JOIN logements log ON ch.logement_id = log.id
      LEFT JOIN primary_occupant po ON po.lit_id = bs.id
      LEFT JOIN collaborateurs c_legacy ON c_legacy.id = bs.collaborateur_id
      ORDER BY log.ville, log.adresse, ch.nom, bs.numero
    `);
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/lits', method: 'GET' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
};

export const GET = withReadAuth(getHandler);