import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const postHandler = async (request: NextRequest, payload: TokenPayload) => {
  try {
    // Traiter le FormData
    const formData = await request.formData();
    const sujet = formData.get('sujet') as string;
    const message = formData.get('message') as string;
    const fichiers = formData.getAll('fichiers') as File[];

    if (!sujet || !message) {
      return NextResponse.json(
        { error: 'Sujet et message requis' },
        { status: 400 }
      );
    }

    // Récupérer les informations du technicien
    const paramsResult = await query(
      "SELECT cle, valeur FROM parametres WHERE cle IN ('technicien_email', 'technicien_telephone', 'rh_email')"
    );

    const appParams: Record<string, string> = {};
    paramsResult.rows.forEach((row: any) => {
      appParams[row.cle] = row.valeur;
    });

    const techEmail = appParams['technicien_email'] || process.env.TECH_EMAIL || 'technique@roches-blanches-cassis.com';
    const rhEmail = appParams['rh_email'] || process.env.RH_EMAIL || 'secretaire@roches-blanches-cassis.com';

    // Récupérer les informations du collaborateur
    const collaborateurResult = await query(
      'SELECT nom, prenom, email FROM collaborateurs WHERE id = $1',
      [payload.id]
    );

    const collaborateur = collaborateurResult.rows[0];

    // Récupérer le logement actuel du collaborateur
    let logementInfo = 'Non assigné';
    try {
      const logementResult = await query(
        `SELECT DISTINCT l.adresse, l.id
         FROM logements l
         INNER JOIN baux b ON l.id = b.logement_id
         WHERE b.collaborateur_id = $1 
         AND b.date_fin >= CURRENT_DATE
         LIMIT 1`,
        [payload.id]
      );
      if (logementResult.rows.length > 0) {
        logementInfo = logementResult.rows[0].adresse;
      }
    } catch (e) {
      console.warn('⚠️ Erreur récupération logement:', e);
    }

    // Enregistrer le signalement
    const signalementResult = await query(
      `INSERT INTO signalements (collaborateur_id, sujet, message, statut)
       VALUES ($1, $2, $3, 'en_attente')
       RETURNING id`,
      [payload.id, sujet, message]
    );

    const signalementId = signalementResult.rows[0].id;

    // Sauvegarder les fichiers (optionnel - ne pas bloquer l'envoi si ça échoue)
    const fichiersPaths: string[] = [];
    if (fichiers.length > 0) {
      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'signalements', String(signalementId));
        await mkdir(uploadDir, { recursive: true });

        for (const file of fichiers) {
          try {
            if (!ALLOWED_FILE_TYPES.includes(file.type)) {
              console.warn(`⚠️ Type de fichier non autorisé uploadé : ${file.type}`);
              continue;
            }
            if (file.size > MAX_FILE_SIZE) {
              console.warn(`⚠️ Fichier trop volumineux uploadé : ${file.size}`);
              continue;
            }
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const filename = `${Date.now()}-${file.name}`;
            const filepath = path.join(uploadDir, filename);
            await writeFile(filepath, buffer);
            fichiersPaths.push(`/uploads/signalements/${signalementId}/${filename}`);
          } catch (fileError) {
            console.warn(`⚠️ Erreur sauvegarde fichier ${file.name}:`, fileError);
            // Continuer même si un fichier échoue
          }
        }
      } catch (dirError) {
        console.warn('⚠️ Erreur création répertoire uploads:', dirError);
        // Continuer sans les fichiers
      }
    }

    // Préparer les pièces jointes pour l'email
    let attachments: any[] = [];
    if (fichiersPaths.length > 0) {
      try {
        attachments = fichiersPaths
          .map((filepath, index) => {
            try {
              return {
                filename: fichiers[index]?.name || `piece-jointe-${index+1}`,
                path: path.join(process.cwd(), 'public', filepath),
              };
            } catch (e) {
              return null;
            }
          })
          .filter(Boolean);
      } catch (e) {
        console.warn('⚠️ Erreur préparation attachments:', e);
        attachments = [];
      }
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .info-box { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
          .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; }
          .files-list { background-color: #f9fafb; padding: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔧 Signalement technique</h1>
        </div>
        <div class="content">
          <h2>Un nouveau signalement a été envoyé</h2>
          
          <div class="info-box">
            <h3>👤 Informations du collaborateur</h3>
            <p><strong>Nom :</strong> ${collaborateur.prenom} ${collaborateur.nom}</p>
            <p><strong>Email :</strong> ${collaborateur.email}</p>
            <p><strong>🏠 Logement :</strong> ${logementInfo}</p>
          </div>
          
          <div class="info-box">
            <h3>📋 Détails du signalement</h3>
            <p><strong>Sujet :</strong> ${sujet}</p>
            <p><strong>Message :</strong></p>
            <p style="background: #f9fafb; padding: 10px; border-radius: 5px;">${message}</p>
          </div>

          ${fichiersPaths.length > 0 ? `
            <div class="files-list">
              <p><strong>📎 Fichiers joints :</strong></p>
              <ul>
                ${fichiersPaths.map((f, i) => `<li>${fichiers[i]?.name || 'Fichier'}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          <p style="margin-top: 20px; color: #6b7280;">
            ${appParams['technicien_telephone'] ? `📞 ${appParams['technicien_telephone']}` : ''}
          </p>
        </div>
        <div class="footer">
          <p>Les Roches Blanches - Signalement technique</p>
          <p>RH en copie de cet email</p>
        </div>
      </body>
      </html>
    `;

    // Envoyer les emails (ne pas bloquer si ça échoue)
    try {
      await sendEmail({
        to: techEmail,
        subject: `🔧 Signalement technique : ${sujet}`,
        html: emailHtml,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
    } catch (emailError) {
      console.error('❌ Erreur envoi email technicien:', emailError);
    }

    try {
      await sendEmail({
        to: rhEmail,
        subject: `🔧 Copie signalement technique : ${sujet}`,
        html: emailHtml,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
    } catch (emailError) {
      console.error('❌ Erreur envoi email RH:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Signalement envoyé avec succès',
      fichiers: fichiersPaths.length,
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi du signalement' },
      { status: 500 }
    );
  }
};

export const POST = withAuth(postHandler);
