import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

const assignerHandler = async (
  request: NextRequest,
  payload: TokenPayload,
  { params }: { params: { id: string } }
) => {
  const client = await query.pool.connect();
  try {
    const collaborateurId = parseInt(params.id);
    const body = await request.json();
    const lit_id = parseInt(body.lit_id);

    if (!lit_id) {
      return NextResponse.json(
        { error: 'Veuillez sélectionner un lit' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // 1. Récupérer les informations du collaborateur
    const collaborateurResult = await client.query(
      'SELECT id, genre, nom, prenom, email FROM collaborateurs WHERE id = $1',
      [collaborateurId]
    );

    if (collaborateurResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Collaborateur non trouvé' },
        { status: 404 }
      );
    }

    const collaborateur = collaborateurResult.rows[0];

    // 2. Récupérer les informations du lit et du logement
    const litResult = await client.query(
      `SELECT 
        l.id, 
        l.est_occupe,
        ch.logement_id,
        log.mixte_autorise,
        log.type_occupation_effectif,
        log.adresse,
        log.ville
       FROM lits l
       LEFT JOIN chambres ch ON l.chambre_id = ch.id
       LEFT JOIN logements log ON ch.logement_id = log.id
       WHERE l.id = $1`,
      [lit_id]
    );

    if (litResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Lit non trouvé' },
        { status: 404 }
      );
    }

    const lit = litResult.rows[0];

    if (lit.est_occupe) {
      return NextResponse.json(
        { error: 'Ce lit est déjà occupé' },
        { status: 400 }
      );
    }

    // NOUVEAU : Libérer l'ancien lit du collaborateur s'il en a un
    await client.query(
      'UPDATE lits SET est_occupe = false, collaborateur_id = NULL WHERE collaborateur_id = $1',
      [collaborateurId]
    );
    console.log(`✅ Ancien lit du collaborateur ${collaborateurId} libéré (si existant).`);

    // 3. Vérifier la règle de mixité si le logement n'est pas mixte
    if (!lit.mixte_autorise) {
      const occupantsResult = await client.query(
        `SELECT c.genre 
         FROM collaborateurs c
         JOIN lits l ON c.id = l.collaborateur_id
         JOIN chambres ch ON l.chambre_id = ch.id
         WHERE ch.logement_id = $1 AND c.id != $2`,
        [lit.logement_id, collaborateurId]
      );

      const occupants = occupantsResult.rows;
      if (occupants.length > 0) {
        const premierOccupantGenre = occupants[0].genre;
        // Si le logement est déjà occupé, vérifier que le nouveau collaborateur a le même genre
        if (collaborateur.genre !== premierOccupantGenre) {
          return NextResponse.json(
            { error: `Ce logement est non-mixte et déjà occupé par un collaborateur de genre '${premierOccupantGenre}'` },
            { status: 400 }
          );
        }
      }
    }

    // 4. Assigner le lit
    await client.query(
      'UPDATE lits SET est_occupe = true, collaborateur_id = $1 WHERE id = $2',
      [collaborateurId, lit_id]
    );

    await client.query('COMMIT');

    return NextResponse.json(
      { 
        success: true, 
        message: 'Lit assigné avec succès',
        logement_adresse: lit.adresse,
        logement_ville: lit.ville
      },
      { status: 200 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de l\'assignation' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
};

export const POST = withAuth(assignerHandler, ['admin', 'super_admin']);