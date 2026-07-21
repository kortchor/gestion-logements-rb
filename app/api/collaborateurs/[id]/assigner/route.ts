import { query, pool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { PoolClient } from 'pg';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { generateConventionPDF } from '@/lib/generateConventionPDF';
import { sendEmail } from '@/lib/email';
import youSignClient from '@/lib/yousign-client';
import fs from 'fs';
import path from 'path';
import { isMatch, parseISO } from 'date-fns';

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
  force_mixite?: boolean; // Super Admin peut forcer la mixité
}

/**
 * Valide les données d'entrée pour l'assignation et récupère les informations nécessaires.
 */
async function validateAssignment(client: PoolClient, collaborateurId: number, body: AssignmentBody) {
  const { lit_id: lit_id_str, lit_ids = [], chambre_privée = false, modele_convention_id: modele_convention_id_str, date_debut, date_fin } = body;

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

  // ✅ AMÉLIORATION: Valider les formats de date avec date-fns pour plus de robustesse
  if (date_debut && !isMatch(date_debut, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'") && !isMatch(date_debut, 'yyyy-MM-dd')) {
    return { error: NextResponse.json({ error: 'Format de date_debut invalide. Attendu: YYYY-MM-DD ou format ISO 8601 complet.' }, { status: 400 }) };
  }
  if (date_fin && !isMatch(date_fin, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'") && !isMatch(date_fin, 'yyyy-MM-dd')) {
    return { error: NextResponse.json({ error: 'Format de date_fin invalide. Attendu: YYYY-MM-DD ou format ISO 8601 complet.' }, { status: 400 }) };
  }
  if (date_debut && date_fin && parseISO(date_debut) > parseISO(date_fin)) {
    return { error: NextResponse.json({ error: 'La date de début ne peut pas être postérieure à la date de fin.' }, { status: 400 }) };
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

  // 4. Vérifier la règle de mixité (sauf si force_mixite est true)
  if (!lit.mixte_autorise && !body.force_mixite) {
    const occupantsResult = await client.query(
      `SELECT c.genre FROM collaborateurs c JOIN lits l ON c.id = l.collaborateur_id JOIN chambres ch ON l.chambre_id = ch.id WHERE ch.logement_id = $1 AND c.id != $2`,
      [lit.logement_id, collaborateurId]
    );
    const premierOccupantGenre = occupantsResult.rows.length > 0 ? occupantsResult.rows[0].genre : null;
    const mixiteNonRespectee = occupantsResult.rows.some(occupant => occupant.genre !== collaborateur.genre);
    if (mixiteNonRespectee) {
      // Retourner une erreur avec la possibilité pour le Super Admin de forcer
      // Le frontend affichera un bouton "Forcer l'assignation" pour les Super Admin
      return { 
        error: NextResponse.json({ 
          error: `Ce logement est non-mixte et déjà occupé par un collaborateur de genre '${premierOccupantGenre}'`,
          code: 'MIXITE_BLOCKED',
          logementId: lit.logement_id,
          genreActuel: premierOccupantGenre,
          genreTente: collaborateur.genre,
        }, { status: 400 }) 
      };
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
  let pdfPath = ''; // Déclaré ici pour la portée
  let pdfUrl = '';
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

    // Un bail est considéré "actif" si sa date_fin >= aujourd'hui
    const aujourdhui = new Date().toISOString().split('T')[0];
    const ancienBailActifResult = await client.query(
      "SELECT id FROM baux WHERE collaborateur_id = $1 AND date_fin >= $2::date LIMIT 1",
      [collaborateurId, aujourdhui]
    );
    if (ancienBailActifResult.rows.length > 0) {
      await client.query(
        `UPDATE lits SET est_occupe = false, collaborateur_id = NULL 
         WHERE collaborateur_id = $1`,
        [collaborateurId]
      );
      await client.query(
        "UPDATE baux SET date_fin = $2 WHERE collaborateur_id = $1 AND date_fin >= $3::date",
        [collaborateurId, dateHierISO, aujourdhui]
      );
      console.log(`✅ Ancien bail du collaborateur ${collaborateurId} clôturé à la date d'hier et lit(s) libéré(s).`);
    }

    // 3. Assigner le(s) nouveau(x) lit(s)
    for (const id of litsAAssigner) {
      await client.query(
        'UPDATE lits SET est_occupe = true, collaborateur_id = $1 WHERE id = $2',
        [collaborateurId, id]
      );
    }

    // 4. Créer le nouveau bail (sans colonnes chambre_id/lit_id qui n'existent pas)
    const dateDebut = body.date_debut || new Date().toISOString();
    const dateFin = body.date_fin || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();

    const bailResult = await client.query(
      `INSERT INTO baux (collaborateur_id, logement_id, date_debut, date_fin, participation_mensuelle, chambre_privée)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        collaborateurId, lit.logement_id, dateDebut, dateFin,
        participation_mensuelle, chambre_privée
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

    // 5. Créer une demande de signature via Yousign (avec le PDF généré)
    console.log('📋 Intégration Yousign pour la demande de signature...');
    
    let yousignRequestId: string | null = null;
    let signatureLink: string | null = null;

    try {
      const yousignResult = await youSignClient.createSignatureRequest({
        signerEmail: collaborateur.email,
        signerName: `${collaborateur.prenom} ${collaborateur.nom}`,
        documentContent: pdfBuffer,
        documentName: `Convention_${collaborateur.nom}_${collaborateur.prenom}.pdf`,
        message: `Veuillez signer votre convention de logement chez Les Roches Blanches`,
      });

      if (yousignResult.success && yousignResult.signatureLink) {
        yousignRequestId = yousignResult.signatureRequestId || null;
        signatureLink = yousignResult.signatureLink;
        console.log('✅ Demande Yousign créée avec succès');
        console.log('🔗 Lien de signature Yousign:', signatureLink);

        // Stocker l'ID de la demande Yousign dans la base de données
        try {
          await client.query(
            'UPDATE baux SET yousign_request_id = $1 WHERE id = $2',
            [yousignRequestId, nouveauBailId]
          );
        } catch (err: any) {
          console.warn('⚠️ Colonne yousign_request_id non disponible, ignorée:', err.message);
        }
      } else {
        console.error('❌ Erreur Yousign:', yousignResult.error);
        // ❌ Ne PAS créer de fallback - si Yousign échoue, le bail ne peut pas être signé
        throw new Error(`Impossible de créer la demande de signature Yousign: ${yousignResult.error}`);
      }
    } catch (err: any) {
      console.error('❌ Erreur lors de la création de la demande Yousign:', err);
      // ❌ Rejeter la transaction si Yousign échoue
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: `Erreur lors de la création de la demande de signature: ${err.message}` },
        { status: 500 }
      );
    }

    // 6. Sauvegarder le PDF (pour archive)
    try {
      const pdfDir = path.join(process.cwd(), 'public', 'uploads', 'conventions');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }
      const pdfFilename = `convention-${nouveauBailId}-${Date.now()}.pdf`;
      pdfPath = path.join(pdfDir, pdfFilename);
      fs.writeFileSync(pdfPath, pdfBuffer);

      pdfUrl = `/uploads/conventions/${pdfFilename}`;

      try {
        await client.query(
          'UPDATE baux SET pdf_convention_url = $1 WHERE id = $2',
          [pdfUrl, nouveauBailId]
        );
      } catch (err: any) {
        console.warn('⚠️ Colonne pdf_convention_url non disponible, ignorée:', err.message);
      }
    } catch (err: any) {
      console.warn('⚠️ Impossible de sauvegarder le PDF:', err.message);
    }

    // 7. Envoyer l'email avec le lien Yousign
    await sendEmail({
      to: collaborateur.email,
      subject: `📄 Convention de logement à signer - ${collaborateur.prenom} ${collaborateur.nom}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .header { background-color: #1a56db; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; max-width: 600px; margin: 0 auto; }
            .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
            .info-box { background-color: #dbeafe; border-left: 4px solid #1a56db; padding: 15px; margin: 15px 0; border-radius: 4px; }
            .btn { background-color: #1a56db; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px; }
            .btn:hover { background-color: #0d47a1; }
            .security-note { background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; margin: 15px 0; border-radius: 4px; color: #065f46; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏨 Les Roches Blanches</h1>
            <p>Convention de logement à signer électroniquement</p>
          </div>
          <div class="content">
            <h2>Bonjour ${collaborateur.prenom} ${collaborateur.nom},</h2>
            <p>Bienvenue chez Les Roches Blanches ! 🎉</p>
            <p>Votre logement a été assigné avec succès. Pour finaliser votre assignation, veuillez signer votre convention de logement en cliquant sur le bouton ci-dessous.</p>
            
            <div class="info-box">
              <h3>📍 Détails de votre logement</h3>
              <p><strong>Adresse :</strong> ${lit.adresse}</p>
              <p><strong>Ville :</strong> ${lit.ville}</p>
              <p><strong>Date d'arrivée :</strong> ${new Date(dateDebut).toLocaleDateString('fr-FR')}</p>
              <p><strong>Date de départ :</strong> ${new Date(dateFin).toLocaleDateString('fr-FR')}</p>
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
              <a href="${signatureLink}" class="btn">✍️ Signer ma convention maintenant</a>
            </p>
            
            <div class="security-note">
              🔒 <strong>Sécurité :</strong> Ce lien est personnel et sécurisé. Il expirera automatiquement dans 7 jours. Cliquez uniquement si vous êtes ${collaborateur.prenom} ${collaborateur.nom}.
            </div>
            
            <p style="font-size: 13px; color: #6b7280; margin-top: 20px; line-height: 1.6;">
              <strong>Besoin d'aide ?</strong><br>
              Si vous n'avez pas cliqué sur ce lien, ou si vous avez des questions, contactez-nous.<br>
              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur:<br>
              <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 3px; word-break: break-all;">${signatureLink}</code>
            </p>
          </div>
          <div class="footer">
            <p><strong>Les Roches Blanches</strong> - Gestion des logements saisonniers</p>
            <p>Cet email est envoyé automatiquement. Merci de ne pas y répondre.</p>
          </div>
        </body>
        </html>
      `,
    });

    // ✅ Valider la transaction
    await client.query('COMMIT');

    return NextResponse.json(
      { 
        success: true, 
        message: 'Lit assigné avec succès. La convention a été envoyée par email avec lien de signature sécurisé.',
        bail: {
          id: nouveauBailId,
          yousignRequestId,
          signatureLink,
          pdfUrl,
        },
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
