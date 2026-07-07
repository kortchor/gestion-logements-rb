import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { sendSignatureRequest } from '@/lib/signature';
import { generateConventionPDF } from '@/lib/generateConventionPDF';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ DÉBALLER LA PROMESSE AVEC await
    const { id } = await params;
    const collaborateurId = parseInt(id);

    if (isNaN(collaborateurId)) {
      return NextResponse.json(
        { error: 'ID de collaborateur invalide' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    const lit_id = body.lit_id;
    const lit_ids = body.lit_ids || [];
    const participation_mensuelle = body.participation_mensuelle;
    const chambre_privée = body.chambre_privée || false;
    const convention_pdf = body.convention_pdf;
    const convention_nom = body.convention_nom || 'convention.pdf';
    const modele_convention_id = body.modele_convention_id;

    console.log('📦 Données reçues:', { lit_id, lit_ids, chambre_privée, modele_convention_id });

    // Construire la liste des lits à assigner
    let litsAAssigner: number[] = [];

    if (lit_id) {
      litsAAssigner = [parseInt(lit_id)];
      
      if (chambre_privée) {
        const chambreResult = await query(
          `SELECT chambre_id FROM lits WHERE id = $1`,
          [parseInt(lit_id)]
        );
        
        if (chambreResult.rows.length > 0) {
          const chambreId = chambreResult.rows[0].chambre_id;
          
          const autresLitsResult = await query(
            `SELECT id FROM lits 
             WHERE chambre_id = $1 AND est_occupe = false`,
            [chambreId]
          );
          
          if (autresLitsResult.rows.length === 0) {
            return NextResponse.json(
              { error: 'Aucun lit disponible dans cette chambre' },
              { status: 400 }
            );
          }
          
          litsAAssigner = autresLitsResult.rows.map((row: any) => row.id);
          console.log('🛏️ Chambre privée - Lits trouvés:', litsAAssigner);
        }
      }
    } else if (lit_ids.length > 0) {
      litsAAssigner = lit_ids;
    } else {
      return NextResponse.json(
        { error: 'Veuillez sélectionner au moins un lit' },
        { status: 400 }
      );
    }

    if (litsAAssigner.length === 0) {
      return NextResponse.json(
        { error: 'Aucun lit disponible' },
        { status: 400 }
      );
    }

    // Récupérer le modèle de convention
    let modeleContenu = null;
    if (modele_convention_id) {
      const modeleResult = await query(
        'SELECT contenu FROM modeles_convention WHERE id = $1 AND est_actif = true',
        [modele_convention_id]
      );
      if (modeleResult.rows.length > 0) {
        modeleContenu = modeleResult.rows[0].contenu;
      }
    }

    // 1. Récupérer les informations du collaborateur
    const collaborateurResult = await query(
      `SELECT id, genre, nom, prenom, email, date_arrivee, date_depart, 
              centre_principal, centre_affectation 
       FROM collaborateurs 
       WHERE id = $1`,
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

    // 2. Récupérer les informations du premier lit
    const firstLitResult = await query(
      `SELECT 
        l.chambre_id,
        ch.logement_id,
        ch.nom as chambre_nom,
        log.mixte_autorise,
        log.type_occupation_effectif,
        log.adresse,
        log.ville,
        log.description_detaillee
       FROM lits l
       LEFT JOIN chambres ch ON l.chambre_id = ch.id
       LEFT JOIN logements log ON ch.logement_id = log.id
       WHERE l.id = $1`,
      [litsAAssigner[0]]
    );

    if (firstLitResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Lit non trouvé' },
        { status: 404 }
      );
    }

    const lit = firstLitResult.rows[0];
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

    // 4. Vérifier que tous les lits sont disponibles
    const litsIndisponibles: number[] = [];
    for (const litId of litsAAssigner) {
      const litCheck = await query(
        'SELECT est_occupe FROM lits WHERE id = $1',
        [litId]
      );
      if (litCheck.rows.length === 0) {
        return NextResponse.json(
          { error: `Le lit ${litId} n'existe pas` },
          { status: 400 }
        );
      }
      if (litCheck.rows[0].est_occupe) {
        litsIndisponibles.push(litId);
      }
    }

    if (litsIndisponibles.length > 0) {
      return NextResponse.json(
        { 
          error: `Les lits suivants sont déjà occupés : ${litsIndisponibles.join(', ')}`,
          lits_indisponibles: litsIndisponibles
        },
        { status: 400 }
      );
    }

    // 5. Assigner tous les lits
    for (const litId of litsAAssigner) {
      await query(
        'UPDATE lits SET est_occupe = true, collaborateur_id = $1 WHERE id = $2',
        [collaborateurId, litId]
      );
    }

    // 6. Gérer le bail
    const dateDebut = collaborateur.date_arrivee || new Date().toISOString().split('T')[0];
    const dateFin = collaborateur.date_depart || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const bailExistant = await query(
      'SELECT id FROM baux WHERE collaborateur_id = $1 AND logement_id = $2 AND date_fin >= CURRENT_DATE',
      [collaborateurId, logementId]
    );

    if (bailExistant.rows.length === 0) {
      await query(
        `INSERT INTO baux (collaborateur_id, logement_id, date_debut, date_fin, alerte_envoyee, signe, participation_mensuelle, chambre_privée)
         VALUES ($1, $2, $3, $4, false, false, $5, $6)`,
        [collaborateurId, logementId, dateDebut, dateFin, 
         participation_mensuelle ? parseFloat(participation_mensuelle) : null, chambre_privée]
      );
    }

    // 7. Générer le PDF
    let pdfBase64 = convention_pdf;
    let pdfNom = convention_nom;

    if (modeleContenu) {
      try {
        const numeroContrat = `CONV-${logementId}-${collaborateurId}-${Date.now().toString().slice(-6)}`;
        
        const pdfBuffer = await generateConventionPDF({
          templateConvention: modeleContenu,
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
        
        pdfBase64 = pdfBuffer.toString('base64');
        pdfNom = `Convention_${collaborateur.nom}_${collaborateur.prenom}.pdf`;
        console.log('✅ PDF généré à partir du modèle');
      } catch (error) {
        console.error('⚠️ Erreur génération PDF:', error);
      }
    }

    // 8. Envoyer la signature (simulation)
    let signatureResult = null;
    try {
      signatureResult = await sendSignatureRequest({
        signerEmail: collaborateur.email,
        signerNom: collaborateur.nom,
        signerPrenom: collaborateur.prenom,
        documentContent: pdfBase64,
        documentName: pdfNom || `Convention_${collaborateur.nom}_${collaborateur.prenom}.pdf`,
      });

      if (signatureResult.success) {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; color: #333; }
              .header { background-color: #1a56db; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; }
              .btn { background-color: #1a56db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
              .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
              .simulation { background-color: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 5px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🏨 Les Roches Blanches</h1>
              <p>Signature de la convention</p>
            </div>
            <div class="content">
              <h2>Bonjour ${collaborateur.prenom} ${collaborateur.nom},</h2>
              <p>Votre logement vous a été assigné. Veuillez signer votre convention locative.</p>
              
              <div class="simulation">
                <p>⚠️ <strong>Mode simulation</strong></p>
                <p>La signature électronique est en cours d'intégration.</p>
                <p>Cliquez sur le lien ci-dessous pour simuler la signature.</p>
              </div>
              
              <p><strong>📍 Logement :</strong> ${lit.adresse}, ${lit.ville}</p>
              <p><strong>📅 Période :</strong> ${new Date(dateDebut).toLocaleDateString('fr-FR')} - ${dateFin ? new Date(dateFin).toLocaleDateString('fr-FR') : 'Non définie'}</p>
              <p><strong>🛏️ Lits assignés :</strong> ${litsAAssigner.length}</p>
              ${chambre_privée ? '<p><strong>🛏️ Chambre privée</strong></p>' : ''}
              ${participation_mensuelle ? `<p><strong>💰 Participation mensuelle :</strong> ${parseFloat(participation_mensuelle).toFixed(2)} €</p>` : ''}
              
              <p style="margin-top: 20px;">
                <a href="${signatureResult.signatureLink}" class="btn">✍️ Signer la convention (simulation)</a>
              </p>
            </div>
            <div class="footer">
              <p>Les Roches Blanches - Gestion des logements saisonniers</p>
              <p>Signature électronique en cours d'intégration</p>
            </div>
          </body>
          </html>
        `;

        await sendEmail({
          to: collaborateur.email,
          subject: `📄 Signature de convention - ${collaborateur.prenom} ${collaborateur.nom}`,
          html: emailHtml,
        });
      }
    } catch (error) {
      console.error('⚠️ Erreur signature:', error);
    }

    // 9. ENVOYER L'EMAIL DE CONFIRMATION À LA RH (SANS IDENTIFIANTS)
    try {
      const rhEmail = process.env.RH_EMAIL || 'secretaire@roches-blanches-cassis.com';
      
      const rhEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .header { background-color: #1a56db; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .info-box { background-color: #dbeafe; border-left: 4px solid #1a56db; padding: 15px; margin: 15px 0; }
            .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏨 Les Roches Blanches</h1>
            <p>Confirmation d'assignation</p>
          </div>
          <div class="content">
            <h2>✅ Nouvelle assignation</h2>
            
            <div class="info-box">
              <h3>👤 Collaborateur</h3>
              <p><strong>Nom :</strong> ${collaborateur.prenom} ${collaborateur.nom}</p>
              <p><strong>Email :</strong> ${collaborateur.email}</p>
              <p><strong>Centre principal :</strong> ${collaborateur.centre_principal || 'Non renseigné'}</p>
              <p><strong>Centre affectation :</strong> ${collaborateur.centre_affectation || 'Non renseigné'}</p>
            </div>
            
            <div class="info-box">
              <h3>🏠 Logement</h3>
              <p><strong>Adresse :</strong> ${lit.adresse}</p>
              <p><strong>Ville :</strong> ${lit.ville}</p>
              <p><strong>Lits assignés :</strong> ${litsAAssigner.length}</p>
              ${chambre_privée ? '<p><strong>🛏️ Chambre privée</strong></p>' : ''}
              ${participation_mensuelle ? `<p><strong>💰 Participation mensuelle :</strong> ${parseFloat(participation_mensuelle).toFixed(2)} €</p>` : ''}
            </div>
            
            <div class="info-box">
              <h3>📅 Période</h3>
              <p><strong>Date d'arrivée :</strong> ${new Date(dateDebut).toLocaleDateString('fr-FR')}</p>
              <p><strong>Date de départ :</strong> ${dateFin ? new Date(dateFin).toLocaleDateString('fr-FR') : 'Non définie'}</p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
              📎 La convention a été envoyée au collaborateur pour signature.
            </p>
            <p style="font-size: 14px; color: #f59e0b; margin-top: 5px;">
              ⚠️ Signature en mode simulation (intégration Yousign en cours)
            </p>
          </div>
          <div class="footer">
            <p>Les Roches Blanches - Gestion des logements saisonniers</p>
            <p>Cet email est envoyé automatiquement.</p>
          </div>
        </body>
        </html>
      `;

      await sendEmail({
        to: rhEmail,
        subject: `📋 Nouvelle assignation - ${collaborateur.prenom} ${collaborateur.nom}`,
        html: rhEmailHtml,
      });

      console.log(`✅ Email de confirmation envoyé à la RH (${rhEmail})`);
    } catch (rhError) {
      console.error('⚠️ Erreur envoi email RH:', rhError);
    }

    return NextResponse.json(
      { 
        success: true, 
        message: `${litsAAssigner.length} lit(s) assigné(s) avec succès`,
        lits_assignes: litsAAssigner.length,
        chambre_privée: chambre_privée,
        signature: signatureResult ? { 
          success: signatureResult.success, 
          url: signatureResult.signatureLink || null 
        } : null
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