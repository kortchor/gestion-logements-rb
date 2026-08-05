import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { logError } from '@/lib/logger';
import { ensureLitOccupantsTable } from '@/lib/lit-occupants-schema';

// Lits libres (non assignés)
export const GET = withAuth(async (request: NextRequest, payload: TokenPayload) => {
  void request;
  void payload;
  try {
    await ensureLitOccupantsTable();
    const result = await query(`
      WITH bed_state AS (
        SELECT
          l.id,
          l.numero,
          l.chambre_id,
          CASE
            WHEN LOWER(TRIM(COALESCE(ch.type_lit, 'simple'))) = 'double' THEN 2
            ELSE 1
          END AS capacity,
          COALESCE(lo_counts.occupants_count, CASE WHEN l.collaborateur_id IS NOT NULL THEN 1 ELSE 0 END) AS occupants_count
        FROM lits l
        JOIN chambres ch ON ch.id = l.chambre_id
        LEFT JOIN (
          SELECT lit_id, COUNT(*)::int AS occupants_count
          FROM lit_occupants
          GROUP BY lit_id
        ) lo_counts ON lo_counts.lit_id = l.id
      )
      SELECT 
        bs.id,
        bs.numero as num_lit,
        ch.type_lit,
        ch.id as chambre_id,
        ch.nom as num_chambre,
        log.id as logement_id,
        log.nom_logement,
        log.adresse,
        log.ville,
        log.prix_loyer
      FROM bed_state bs
      JOIN chambres ch ON bs.chambre_id = ch.id
      JOIN logements log ON ch.logement_id = log.id
      WHERE bs.occupants_count < bs.capacity
        AND COALESCE(log.est_actif, true) = true
      ORDER BY log.adresse, ch.nom, bs.numero
    `);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/lits/libres', method: 'GET' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
});
