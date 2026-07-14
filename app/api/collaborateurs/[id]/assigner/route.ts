import { query, pool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { PoolClient } from 'pg'; // ✅ AMÉLIORATION: Importer le type du client
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { generateConventionPDF } from '@/lib/generateConventionPDF';
import { sendSignatureRequest } from '@/lib/signature';
import { sendEmail } from '@/lib/email';

/**
 * @interface AssignmentBody
 * @description Type pour le corps de la requête d'assignation.
 */
interface AssignmentBody {
  lit_id?: string;
  lit_ids?: number[];
  chambre_privée?: boolean;
  modele_convention_id?: string;
  participation_mensuelle: number;
  date_debut?: string;
  date_fin?: string;
}

/**
 * Valide les données d'entrée pour l'assignation et récupère les informations nécessaires.
 */
async function validateAssignment(client: PoolClient, collaborateurId: number, body: AssignmentBody) {
  const { lit_id: lit_id_str, lit_ids = [], chambre_privée = false, modele_convention_id: modele_convention_id_str } = body;

  if (isNaN(collaborateurId)) {
    return { error: NextResponse.json({ error: 'ID de collaborateur invalide' }, { status: 400 }) };
  }

  const lit_id = lit_id_str ? parseInt(lit_id_str) : null;
  if (lit_id_str && (lit_id === null || isNaN(lit_id))) {
    return { error: NextResponse.json({ error: 'ID de lit invalide fourni.' }, { status: 400 }) };
  }

  const modele_convention_id = modele_convention_id_str ? parseInt(modele_convention_id_str) : null;
  if (!modele_convention_id) {
    return { error: NextResponse.json({ error: 'Modèle de convention non sélectionné.' }, { status: 400 }) };
  }

  // 1. Construire la liste des lits à assigner
  let litsAAssigner: number[] = [];
  if (chambre_privée && lit_id) {
    const litsChambreResult = await client.query<{ id: number }>(
      `SELECT id FROM lits WHERE chambre_id = (SELECT chambre_id FROM lits WHERE id = $1) AND est_occupe = false`,
      [lit_id]
    );
    litsAAssigner = litsChambreResult.rows.map(row => row.id);
  } else if (lit_id) {
    litsAAssigner = [lit_id];
  } else if (lit_ids.length > 0) {
    litsAAssigner = lit_ids;
  }

  if (litsAAssigner.length === 0) {
    return { error: NextResponse.json({ error: 'Veuillez sélectionner un lit ou une chambre.' }, { status: 400 }) };
  }

  // 2. Vérifier la disponibilité des lits (avec verrouillage pour la transaction)
  const litsIndisponibles: number[] = [];
  for (const id of litsAAssigner) {
    const litCheck = await client.query('SELECT est_occupe FROM lits WHERE id = $1 FOR UPDATE', [id]);
    if (litCheck.rows.length === 0 || litCheck.rows[0].est_occupe) {
      litsIndisponibles.push(id);
    }
  }

  if (litsIndisponibles.length > 0) {
    return { error: NextResponse.json({ error: `Un ou plusieurs lits ne sont plus disponibles : ${litsIndisponibles.join(', ')}` }, { status: 409 }) };
  }

  // 3. Récupérer les données essentielles
  const collaborateurResult = await client.query('SELECT id, genre, nom, prenom, email FROM collaborateurs WHERE id = $1', [collaborateurId]);
  if (collaborateurResult.rows.length === 0) {
    return { error: NextResponse.json({ error: 'Collaborateur non trouvé' }, { status: 404 }) };
  }
  const collaborateur = collaborateurResult.rows[0];

  const litResult = await client.query(
    `SELECT l.id, ch.logement_id, l.chambre_id, log.mixte_autorise, log.adresse, log.ville, log.nom_logement, ch.nom as chambre_nom
     FROM lits l
     LEFT JOIN chambres ch ON l.chambre_id = ch.id
     LEFT JOIN logements log ON ch.logement_id = log.id
     WHERE l.id = $1`,
    [litsAAssigner[0]]
  );
  if (litResult.rows.length === 0) {
    return { error: NextResponse.json({ error: 'Lit non trouvé' }, { status: 404 }) };
  }
  const lit = litResult.rows[0];

  const modeleResult = await client.query('SELECT contenu FROM modeles_convention WHERE id = $1', [modele_convention_id]);
  if (modeleResult.rows.length === 0) {
    return { error: NextResponse.json({ error: 'Modèle de convention non trouvé.' }, { status: 400 }) };
  }
  const modeleContenu = modeleResult.rows[0].contenu;

  // 4. Vérifier la règle de mixité
  if (!lit.mixte_autorise) {
    const occupantsResult = await client.query(
      `SELECT c.genre FROM collaborateurs c JOIN lits l ON c.id = l.collaborateur_id JOIN chambres ch ON l.chambre_id = ch.id WHERE ch.logement_id = $1 AND c.id != $2`,
      [lit.logement_id, collaborateurId]
    );
    // ✅ AMÉLIORATION: Vérifier si au moins un occupant a un genre différent.
    const premierOccupantGenre = occupantsResult.rows.length > 0 ? occupantsResult.rows[0].genre : null;
    const mixiteNonRespectee = occupantsResult.rows.some(occupant => occupant.genre !== collaborateur.genre);
    if (mixiteNonRespectee) {
      return { error: NextResponse.json({ error: `Ce logement est non-mixte et déjà occupé par un collaborateur de genre '${premierOccupantGenre}'` }, { status: 400 }) };
    }
  }

  return {
    data: {
      litsAAssigner,
      collaborateur,
      lit,
      modeleContenu,
      modele_convention_id
    }
  };
}

const assignerHandler = async (
  request: NextRequest,
  payload: TokenPayload,
  context: { params: { id: string } } // ✅ CORRECTION: Accepter le contexte complet
) => {
  // ✅ Utiliser un client unique pour la transaction
  const client = await pool.connect();
  try {
    const collaborateurId = parseInt(context.params.id); // ✅ CORRECTION: Utiliser context.params.id
    const body: AssignmentBody = await request.json();
    const participation_mensuelle = body.participation_mensuelle;
    const chambre_privée = body.chambre_privée || false;

    // ✅ Démarrer la transaction
    await client.query('BEGIN');

    // ✅ 1. Valider les entrées et récupérer les données
    const validationResult = await validateAssignment(client, collaborateurId, body);
    if (validationResult.error) {
      await client.query('ROLLBACK');
      return validationResult.error;
    }

    const { litsAAssigner, collaborateur, lit, modeleContenu, modele_convention_id } = validationResult.data;

    // 2. Mettre fin à l'ancien bail actif et libérer le(s) lit(s) associé(s)
    const dateHier = new Date();
    dateHier.setDate(dateHier.getDate() - 1);
    const dateHierISO = dateHier.toISOString().split('T')[0];

    const ancienBailActifResult = await client.query("SELECT id FROM baux WHERE collaborateur_id = $1 AND statut = 'actif' LIMIT 1", [collaborateurId]);
    if (ancienBailActifResult.rows.length > 0) {
      await client.query(
        `UPDATE lits SET est_occupe = false, collaborateur_id = NULL 
         WHERE collaborateur_id = $1`,
        [collaborateurId]
      );
      await client.query("UPDATE baux SET statut = 'terminé', date_fin = $2 WHERE collaborateur_id = $1 AND statut = 'actif'", [collaborateurId, dateHierISO]);
      console.log(`✅ Ancien bail du collaborateur ${collaborateurId} clôturé à la date d'hier et lit(s) libéré(s).`);
    }

    // 3. Assigner le(s) nouveau(x) lit(s)
    for (const id of litsAAssigner) {
      await client.query(
        'UPDATE lits SET est_occupe = true, collaborateur_id = $1 WHERE id = $2',
        [collaborateurId, id]
      );
    }

    // 4. Créer le nouveau bail
    const dateDebut = body.date_debut || new Date().toISOString();
    const dateFin = body.date_fin || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();

    const bailResult = await client.query(
      `INSERT INTO baux (collaborateur_id, logement_id, chambre_id, lit_id, date_debut, date_fin, participation_mensuelle, chambre_privée, modele_convention_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        collaborateurId, lit.logement_id, lit.chambre_id, 
        chambre_privée ? null : litsAAssigner[0], // ✅ Ne pas lier de lit si la chambre est privée
        dateDebut, dateFin, participation_mensuelle, chambre_privée, modele_convention_id || null
      ]
    );
    const nouveauBailId = bailResult.rows[0].id;

    // 5. Générer le PDF de la convention
    const pdfBuffer = await generateConventionPDF({
      template: modeleContenu,
      nom: collaborateur.nom,
      prenom: collaborateur.prenom,
      email: collaborateur.email,
      adresseLogement: lit.adresse,
      villeLogement: lit.ville,
      dateDebut: dateDebut,
      dateFin: dateFin,
      numeroContrat: `BAIL-${nouveauBailId}`,
      descriptionDetaillee: `Logement: ${lit.nom_logement}\nChambre: ${lit.chambre_nom}`,
      participationMensuelle: participation_mensuelle,
    });

    // 6. Envoyer la demande de signature
    const signatureData = await sendSignatureRequest({
      documentContent: pdfBuffer,
      documentName: `Convention-${collaborateur.prenom}-${collaborateur.nom}.pdf`,
      signerEmail: collaborateur.email,
      signerNom: collaborateur.nom,
      signerPrenom: collaborateur.prenom,
    });

    // 7. Mettre à jour le bail avec l'ID de la demande de signature
    await client.query('UPDATE baux SET signature_request_id = $1 WHERE id = $2', [signatureData.requestId, nouveauBailId]);

    // 8. Envoyer l'email au collaborateur avec le lien de signature
    await sendEmail({
      to: collaborateur.email,
      subject: '📄 Votre convention de logement est prête à être signée',
      html: `
        <p>Bonjour ${collaborateur.prenom},</p>
        <p>Votre convention de logement est prête. Veuillez la signer en cliquant sur le lien ci-dessous :</p>
        <a href="${signatureData.signatureLink}">Signer ma convention</a>
      `,
    });

    // ✅ Valider la transaction
    await client.query('COMMIT');

    return NextResponse.json(
      { 
        success: true, 
        message: 'Lit assigné avec succès',
      },
      { status: 200 }
    );
  } catch (error) {
    // ✅ Annuler la transaction en cas d'erreur
    await client.query('ROLLBACK');
    console.error('Erreur:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur lors de l\'assignation' },
      { status: 500 }
    );
  } finally {
    // ✅ Libérer le client dans tous les cas
    client.release();
  }
};

export const POST = withAuth(assignerHandler, ['admin', 'super_admin']);
