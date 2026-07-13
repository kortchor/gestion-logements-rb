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
  // ✅ Utiliser un client unique pour la transaction
  const client = await query.pool.connect();
  try {
    const collaborateurId = parseInt(params.id);
    const body = await request.json();
    const lit_id_str = body.lit_id;
    const lit_ids = body.lit_ids || []; // Pour la chambre privée
    const participation_mensuelle = body.participation_mensuelle;
    const chambre_privée = body.chambre_privée || false;
    const modele_convention_id = body.modele_convention_id ? parseInt(body.modele_convention_id) : null;

    if (isNaN(collaborateurId)) {
      return NextResponse.json(
        { error: 'ID de collaborateur invalide' },
        { status: 400 }
      );
    }

    // ✅ AMÉLIORATION : Validation robuste de l'ID du lit
    const lit_id = lit_id_str ? parseInt(lit_id_str) : null;
    if (lit_id_str && (lit_id === null || isNaN(lit_id))) {
      return NextResponse.json(
        { error: 'ID de lit invalide fourni.' },
        { status: 400 }
      );
    }

    // Construire la liste des lits à assigner
    let litsAAssigner: number[] = [];
    if (chambre_privée && lit_id) {
      const chambreResult = await client.query('SELECT chambre_id FROM lits WHERE id = $1', [lit_id]);
      if (chambreResult.rows.length > 0) {
        const chambreId = chambreResult.rows[0].chambre_id;
        const autresLitsResult = await client.query('SELECT id FROM lits WHERE chambre_id = $1 AND est_occupe = false', [chambreId]);
        litsAAssigner = autresLitsResult.rows.map((row: any) => row.id);
      }
    } else if (lit_id) {
      litsAAssigner = [lit_id];
    } else if (lit_ids.length > 0) {
      // Si une liste est déjà fournie
      litsAAssigner = lit_ids;
    }

    if (litsAAssigner.length === 0) {
      return NextResponse.json(
        { error: 'Veuillez sélectionner un lit' },
        { status: 400 }
      );
    }

    // ✅ Démarrer la transaction
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
        l.chambre_id,
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
      [litsAAssigner[0]] // Utiliser le premier lit de la liste pour les infos générales
    );

    if (litResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Lit non trouvé' },
        { status: 404 }
      );
    }

    const lit = litResult.rows[0];

    // Vérifier que tous les lits à assigner sont bien libres
    const litsIndisponibles: number[] = [];
    for (const id of litsAAssigner) {
      const litCheck = await client.query('SELECT est_occupe FROM lits WHERE id = $1 FOR UPDATE', [id]);
      if (litCheck.rows.length === 0 || litCheck.rows[0].est_occupe) {
        litsIndisponibles.push(id);
      }
    }

    if (litsIndisponibles.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { 
          error: `Un ou plusieurs lits ne sont plus disponibles : ${litsIndisponibles.join(', ')}`,
        },
        { status: 409 } // 409 Conflict
      );
    }


    // AMÉLIORATION : Mettre fin à l'ancien bail actif et libérer le(s) lit(s) associé(s)
    const dateHier = new Date();
    dateHier.setDate(dateHier.getDate() - 1);
    const dateHierISO = dateHier.toISOString().split('T')[0];

    // ✅ AMÉLIORATION : Clôturer l'ancien bail actif uniquement s'il existe
    const ancienBailActifResult = await client.query("SELECT id FROM baux WHERE collaborateur_id = $1 AND statut = 'actif' LIMIT 1", [collaborateurId]);
    if (ancienBailActifResult.rows.length > 0) {
      // Libérer les anciens lits
      await client.query(
        `UPDATE lits SET est_occupe = false, collaborateur_id = NULL 
         WHERE collaborateur_id = $1`,
        [collaborateurId]
      );
      await client.query("UPDATE baux SET statut = 'terminé', date_fin = $2 WHERE collaborateur_id = $1 AND statut = 'actif'", [collaborateurId, dateHierISO]);
      console.log(`✅ Ancien bail du collaborateur ${collaborateurId} clôturé à la date d'hier et lit(s) libéré(s).`);
    }

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
    for (const id of litsAAssigner) {
      await client.query(
        'UPDATE lits SET est_occupe = true, collaborateur_id = $1 WHERE id = $2',
        [collaborateurId, id]
      );
    }

    // 5. Créer le bail dans la base de données
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

    // 6. Générer le PDF de la convention
    const modeleResult = await client.query('SELECT contenu FROM modeles_convention WHERE id = $1', [modele_convention_id]);
    const modeleContenu = modeleResult.rows.length > 0 ? modeleResult.rows[0].contenu : null;

    // Si aucun modèle n'est trouvé, on ne peut pas continuer la signature
    if (!modeleContenu) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Modèle de convention non trouvé ou non sélectionné.' }, { status: 400 });
    }

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
      { error: error instanceof Error ? error.message : 'Erreur lors de l\'assignation' },
      { status: 500 }
    );
  } finally {
    // ✅ Libérer le client dans tous les cas
    client.release();
  }
};

export const POST = withAuth(assignerHandler, ['admin', 'super_admin']);