import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { generateConventionPDF } from '@/lib/generateConventionPDF';
import { sendSignatureRequest } from '@/lib/signature';
import { sendEmail } from '@/lib/email';

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
        log.ville,
        log.nom_logement,
        ch.nom as chambre_nom
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

    // 5. Créer le bail dans la base de données
    const dateDebut = body.date_debut || new Date().toISOString();
    const dateFin = body.date_fin || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();

    const bailResult = await client.query(
      `INSERT INTO baux (collaborateur_id, logement_id, chambre_id, lit_id, date_debut, date_fin, participation_mensuelle, chambre_privée, modele_convention_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [collaborateurId, lit.logement_id, lit.chambre_id, lit_id, dateDebut, dateFin, participation_mensuelle, chambre_privée, modele_convention_id]
    );
    const nouveauBailId = bailResult.rows[0].id;

    // 6. Générer le PDF de la convention
    const modeleResult = await client.query('SELECT contenu FROM modeles_convention WHERE id = $1', [modele_convention_id]);
    const modeleContenu = modeleResult.rows.length > 0 ? modeleResult.rows[0].contenu : null;

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

    // 7. Envoyer la demande de signature via Yousign
    const signatureData = await sendSignatureRequest({
      documentContent: pdfBuffer,
      documentName: `Convention-${collaborateur.prenom}-${collaborateur.nom}.pdf`,
      signerEmail: collaborateur.email,
      signerNom: collaborateur.nom,
      signerPrenom: collaborateur.prenom,
    });

    // 8. Mettre à jour le bail avec l'ID de la demande de signature
    await client.query('UPDATE baux SET signature_request_id = $1 WHERE id = $2', [signatureData.requestId, nouveauBailId]);

    // 9. Envoyer l'email au collaborateur avec le lien de signature
    // (Vous pouvez créer un template d'email plus élaboré pour cela)
    await sendEmail({
      to: collaborateur.email,
      subject: '📄 Votre convention de logement est prête à être signée',
      html: `
        <p>Bonjour ${collaborateur.prenom},</p>
        <p>Votre convention de logement est prête. Veuillez la signer en cliquant sur le lien ci-dessous :</p>
        <a href="${signatureData.signatureLink}">Signer ma convention</a>
      `,
    });

    await client.query('COMMIT');

    return NextResponse.json(
      { 
        success: true, 
        message: 'Lit assigné avec succès',
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