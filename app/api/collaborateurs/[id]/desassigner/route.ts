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

    // 1. Récupérer le logement du collaborateur (lit_occupants prioritaire, fallback legacy)
    const logementResult = await query(
      `WITH candidats AS (
         SELECT ch.logement_id, 1 AS priority, COALESCE(lo.created_at::date, CURRENT_DATE) AS date_ref
         FROM lit_occupants lo
         JOIN lits l ON l.id = lo.lit_id
         JOIN chambres ch ON ch.id = l.chambre_id
         WHERE lo.collaborateur_id = $1

         UNION ALL

         SELECT ch.logement_id, 2 AS priority, CURRENT_DATE AS date_ref
         FROM lits l
         JOIN chambres ch ON ch.id = l.chambre_id
         WHERE l.collaborateur_id = $1
           AND COALESCE(l.est_occupe, false) = true
       )
       SELECT logement_id
       FROM candidats
       ORDER BY priority ASC, date_ref DESC
       LIMIT 1`,
      [collaborateurId]
    );

    const logementId = logementResult.rows[0]?.logement_id;
    logger.info({ route: '/api/collaborateurs/[id]/desassigner', collaborateurId, logementId }, 'Logement associe recupere');

    // 2. Identifier les lits concernés avant suppression des occupations
    const affectedLitsResult = await query(
      `SELECT DISTINCT lit_id
       FROM lit_occupants
       WHERE collaborateur_id = $1

       UNION

       SELECT id AS lit_id
       FROM lits
       WHERE collaborateur_id = $1`,
      [collaborateurId]
    );
    const affectedLitIds = affectedLitsResult.rows
      .map((row) => Number(row.lit_id))
      .filter((v) => Number.isInteger(v));

    // 3. Désassigner le collaborateur de lit_occupants puis fallback legacy
    await query('DELETE FROM lit_occupants WHERE collaborateur_id = $1', [collaborateurId]);

    await query(
      'UPDATE lits SET collaborateur_id = NULL WHERE collaborateur_id = $1',
      [collaborateurId]
    );

    // Recalculer l'état d'occupation des lits touchés
    for (const litId of affectedLitIds) {
      await query(
        `WITH current_occupants AS (
           SELECT collaborateur_id
           FROM lit_occupants
           WHERE lit_id = $1
           ORDER BY created_at
         )
         UPDATE lits
         SET est_occupe = EXISTS(SELECT 1 FROM current_occupants),
             collaborateur_id = (
               SELECT collaborateur_id
               FROM current_occupants
               LIMIT 1
             )
         WHERE id = $1`,
        [litId]
      );
    }

    // 4. Fermer le bail actif associé (date_fin = hier pour qu'il soit immédiatement en historique)
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

    // 5. Si le logement est vide, redevient mixte
    if (logementId) {
      const occupantsResult = await query(
        `SELECT COUNT(DISTINCT occ.collaborateur_id) AS nb_occupants
         FROM (
           SELECT lo.collaborateur_id
           FROM lit_occupants lo
           JOIN lits l ON l.id = lo.lit_id
           JOIN chambres ch ON ch.id = l.chambre_id
           WHERE ch.logement_id = $1

           UNION

           SELECT l.collaborateur_id
           FROM lits l
           JOIN chambres ch ON ch.id = l.chambre_id
           WHERE ch.logement_id = $1
             AND l.collaborateur_id IS NOT NULL
         ) AS occ`,
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