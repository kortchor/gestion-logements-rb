import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { logError } from '@/lib/logger';

const getHandler = async (_request: NextRequest, payload: TokenPayload) => {
  try {
    const collaborateurId = payload.id;

    const result = await query(`
      SELECT 
        l.id as logement_id,
        l.nom_logement,
        l.adresse,
        l.ville,
        l.description_detaillee,
        l.etat_lieux_photos,
        c.nom as chambre_nom,
        li.numero as lit_numero
      FROM lits li
      INNER JOIN chambres c ON li.chambre_id = c.id
      INNER JOIN logements l ON c.logement_id = l.id
      WHERE li.collaborateur_id = $1 AND li.est_occupe = true
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