import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { logError } from '@/lib/logger';

const getHandler = async (_request: NextRequest, payload: TokenPayload) => {
  try {
    const collaborateurId = payload.id;

    const result = await query(`
      WITH candidats AS (
        SELECT
          l.id AS logement_id,
          l.nom_logement,
          l.adresse,
          l.ville,
          l.description_detaillee,
          l.etat_lieux_photos,
          c.nom AS chambre_nom,
          li.numero AS lit_numero,
          1 AS priority,
          COALESCE(lo.created_at::date, CURRENT_DATE) AS date_ref
        FROM lit_occupants lo
        JOIN lits li ON li.id = lo.lit_id
        JOIN chambres c ON li.chambre_id = c.id
        JOIN logements l ON c.logement_id = l.id
        WHERE lo.collaborateur_id = $1

        UNION ALL

        SELECT
          l.id AS logement_id,
          l.nom_logement,
          l.adresse,
          l.ville,
          l.description_detaillee,
          l.etat_lieux_photos,
          c.nom AS chambre_nom,
          li.numero AS lit_numero,
          2 AS priority,
          CURRENT_DATE AS date_ref
        FROM lits li
        JOIN chambres c ON li.chambre_id = c.id
        JOIN logements l ON c.logement_id = l.id
        WHERE li.collaborateur_id = $1
          AND COALESCE(li.est_occupe, false) = true
      )
      SELECT
        logement_id,
        nom_logement,
        adresse,
        ville,
        description_detaillee,
        etat_lieux_photos,
        chambre_nom,
        lit_numero
      FROM candidats
      ORDER BY priority ASC, date_ref DESC
      LIMIT 1
    `, [collaborateurId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Aucun logement assigné' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/collaborateurs/logement', method: 'GET' });
    }
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
};

export const GET = withAuth(getHandler);