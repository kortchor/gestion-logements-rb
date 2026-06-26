import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { sendEmailWithAttachment } from '@/lib/email';
import { generateConventionPDF } from '@/lib/generateConventionPDF';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const collaborateurId = parseInt(params.id);
    const body = await request.json();
    const lit_id = body.lit_id;
    const participation_mensuelle = body.participation_mensuelle;

    if (!lit_id) {
      return NextResponse.json(
        { error: 'Veuillez sélectionner un lit' },
        { status: 400 }
      );
    }

    // 1. Récupérer les informations du collaborateur
    const collaborateurResult = await query(
      'SELECT id, genre, nom, prenom, email, date_arrivee, date_depart, centre_principal, centre_affectation FROM collaborateurs WHERE id = $1',
      [collaborateurId]
    );

    if (collaborateurResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Collaborateur non trouvé' },
        { status: 404 }
      );
    }

    const collaborateur = collaborateurResult.rows[0];
    const genreCollaborateur = collaborateur.genre;

    // 2. Récupérer les informations du lit
    const litResult = await query(
      `SELECT 
        l.id, 
        l.est_occupe,
        ch.logement_id,
        log.mixte_autorise,
        log.type_occupation_effectif,
        log.adresse,
        log.ville,
        log.description_detaillee
       FROM lits l
       LEFT JOIN chambres ch ON l.chambre_id = ch.id
       LEFT JOIN logements log ON ch.logement_id = log.id
       WHERE l.id = $1`,
      [parseInt(lit_id)]
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

    const logementId = lit.logement_id;
    const mixteAutorise = lit.mixte_autorise;
    let typeOccupationEffectif = lit.type_occupation_effectif || 'mixte';

    // 3. Vérification du genre
    if (mixteAutorise) {
      typeOccupationEffectif = 'mixte';
    } else if (typeOccupationEffectif !== 'mixte') {
      if (typeOccupationEffectif !== genreCollaborateur) {
        const genreLabel = typeOccupationEffectif === 'F' ? '👩 femmes' : '👨 hommes';
        return NextResponse.json(
          { 
            error: `Ce logement est réservé aux ${genreLabel}.`,
            code: 'GENRE_INCOMPATIBLE'
          },
          { status: 400 }
        );
      }
    } else {
      const occupantsResult = await query(
        `SELECT COUNT(*) as nb_occupants
         FROM lits l
         LEFT JOIN chambres ch ON l.chambre_id = ch.id
         WHERE ch.logement_id = $1 AND l.est_occupe = true`,
        [logementId]
      );

      const nbOccupants = parseInt(occupantsResult.rows[0]?.nb_occupants || '0');

      if (nbOccupants === 0) {
        typeOccupationEffectif = genreCollaborateur;
        await query(
          'UPDATE logements SET type_occupation_effectif = $1 WHERE id = $2',
          [genreCollaborateur, logementId]
        );
      }
    }

    // 4. Assigner le lit
    await query(
      'UPDATE lits SET est_occupe = true, collaborateur_id = $1 WHERE id = $2',
      [collaborateurId, parseInt(lit_id)]
    );

    // 5. Gérer le bail
    const dateDebut = collaborateur.date_arrivee || new Date().toISOString().split('T')[0];
    const dateFin = collaborateur.date_depart || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const bailExistant = await query(
      'SELECT id FROM baux WHERE collaborateur_id = $1 AND logement_id = $2 AND date_fin >= CURRENT_DATE',
      [collaborateurId, logementId]
    );

    if (bailExistant.rows.length === 0) {
      await query(
        `INSERT INTO baux (collaborateur_id, logement_id, date_debut, date_fin, alerte_envoyee, signe, participation_mensuelle)
         VALUES ($1, $2, $3, $4, false, false, $5)`,
        [collaborateurId, logementId, dateDebut, dateFin, participation_mensuelle ? parseFloat(participation_mensuelle) : null]
      );
    }

    // 6. Envoyer l'email avec le PDF
    try {
      const numeroContrat = `CONV-${logementId}-${collaborateurId}-${Date.now().toString().slice(-6)}`;
      
      const pdfBuffer = await generateConventionPDF({
        nom: collaborateur.nom,
        prenom: collaborateur.prenom,
        email: collaborateur.email,
        adresseLogement: lit.adresse,
        villeLogement: lit.ville,
        dateDebut: dateDebut,
        dateFin: dateFin,
        numeroContrat: numeroContrat,
        descriptionDetaillee: lit.description_detaillee || '',
        centrePrincipal: collaborateur.centre_principal || '',
        centreAffectation: collaborateur.centre_affectation || '',
        participationMensuelle: participation_mensuelle ? parseFloat(participation_mensuelle) : null,
      });

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .header { background-color: #1a56db; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
            .info-box { background-color: #dbeafe; border-left: 4px solid #1a56db; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏨 Les Roches Blanches</h1>
            <p>Convention locative</p>
          </div>
          <div class="content">
            <h2>Bonjour ${collaborateur.prenom} ${collaborateur.nom},</h2>
            <p>Votre logement vous a été assigné. Vous trouverez ci-joint votre convention locative.</p>
            
            <div class="info-box">
              <h3>📍 Informations du logement</h3>
              <p><strong>Adresse :</strong> ${lit.adresse}</p>
              <p><strong>Ville :</strong> ${lit.ville}</p>
              <p><strong>Date d'arrivée :</strong> ${new Date(dateDebut).toLocaleDateString('fr-FR')}</p>
              <p><strong>Date de départ :</strong> ${dateFin ? new Date(dateFin).toLocaleDateString('fr-FR') : 'Non définie'}</p>
              ${participation_mensuelle ? `<p><strong>💰 Participation mensuelle :</strong> ${parseFloat(participation_mensuelle).toFixed(2)} €</p>` : ''}
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
              📎 La convention est jointe à cet email.
            </p>
          </div>
          <div class="footer">
            <p>Les Roches Blanches - Gestion des logements saisonniers</p>
            <p>Cet email est envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        </body>
        </html>
      `;

      await sendEmailWithAttachment({
        to: collaborateur.email,
        subject: `📄 Convention locative - ${collaborateur.prenom} ${collaborateur.nom}`,
        html: emailHtml,
        attachments: [
          {
            filename: `Convention_${collaborateur.nom}_${collaborateur.prenom}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      console.log(`✅ Email de convention envoyé à ${collaborateur.email}`);
    } catch (emailError) {
      console.error('⚠️ Erreur envoi email:', emailError);
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Lit assigné avec succès, convention envoyée par email',
        type_occupation_effectif: mixteAutorise ? 'mixte' : typeOccupationEffectif
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de l\'assignation' },
      { status: 500 }
    );
  }
}