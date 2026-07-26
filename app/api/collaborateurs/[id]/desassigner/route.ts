import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import logger, { logError } from '@/lib/logger';
import { verifyCsrfMiddleware } from '@/lib/csrf';

const postHandler = async (
  request: Request,
  payload: TokenPayload,
  { params }: { params: { id: string } }
) => {
  void payload;
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json({ error: 'CSRF token invalide' }, { status: 403 });
    }

    const { id } = params;
    const collaborateurId = parseInt(id);
    
    if (isNaN(collaborateurId)) {
      return NextResponse.json(
        { error: 'ID de collaborateur invalide' },
        { status: 400 }
      );
    }

    logger.info({ route: '/api/collaborateurs/[id]/desassigner', collaborateurId }, 'Debut desassignation collaborateur');

    // 1. Récupérer le logement du collaborateur
    const logementResult = await query(
      `SELECT DISTINCT ch.logement_id
       FROM lits l
       LEFT JOIN chambres ch ON l.chambre_id = ch.id
       WHERE l.collaborateur_id = $1 AND l.est_occupe = true`,
      [collaborateurId]
    );

    const logementId = logementResult.rows[0]?.logement_id;
    logger.info({ route: '/api/collaborateurs/[id]/desassigner', collaborateurId, logementId }, 'Logement associe recupere');

    // 2. Désassigner le lit
    await query(
      'UPDATE lits SET est_occupe = false, collaborateur_id = NULL WHERE collaborateur_id = $1',
      [collaborateurId]
    );

    // 3. Fermer le bail actif associé (date_fin = hier pour qu'il soit immédiatement en historique)
    // On ferme TOUS les baux encore ouverts (date_fin >= hier) pour ce collaborateur
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const bailUpdate = await query(
      `UPDATE baux SET date_fin = $1 WHERE collaborateur_id = $2 AND date_fin >= $1`,
      [yesterdayStr, collaborateurId]
    );
    logger.info(
      { route: '/api/collaborateurs/[id]/desassigner', collaborateurId, closedLeases: bailUpdate.rowCount },
      'Baux clotures pour collaborateur'
    );

    // 4. Si le logement est vide, redevient mixte
    if (logementId) {
      const occupantsResult = await query(
        `SELECT COUNT(*) as nb_occupants
         FROM lits l
         LEFT JOIN chambres ch ON l.chambre_id = ch.id
         WHERE ch.logement_id = $1 AND l.est_occupe = true`,
        [logementId]
      );

      const nbOccupants = parseInt(occupantsResult.rows[0]?.nb_occupants || '0');
      logger.info(
        { route: '/api/collaborateurs/[id]/desassigner', collaborateurId, logementId, nbOccupants },
        'Nombre d occupants restants dans le logement'
      );

      if (nbOccupants === 0) {
        const mixteResult = await query(
          'SELECT mixte_autorise FROM logements WHERE id = $1',
          [logementId]
        );
        const mixteAutorise = mixteResult.rows[0]?.mixte_autorise || false;

        if (!mixteAutorise) {
          await query(
            'UPDATE logements SET type_occupation_effectif = $1 WHERE id = $2',
            ['mixte', logementId]
          );
          logger.info(
            { route: '/api/collaborateurs/[id]/desassigner', logementId },
            'Logement remis en mode mixte'
          );
        }
      }
    }

    logger.info({ route: '/api/collaborateurs/[id]/desassigner', collaborateurId }, 'Collaborateur desassigne avec succes');
    return NextResponse.json(
      { success: true, message: 'Collaborateur désassigné avec succès' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/collaborateurs/[id]/desassigner', method: 'POST' });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la désassignation' },
      { status: 500 }
    );
  }
};

export const POST = withAuth(postHandler, ['admin', 'super_admin']);