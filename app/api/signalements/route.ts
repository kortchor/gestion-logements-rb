import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { verifyCsrfMiddleware } from '@/lib/csrf';
import logger, { logError } from '@/lib/logger';

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const postHandler = async (request: NextRequest, payload: TokenPayload) => {
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json({ error: 'CSRF token invalide' }, { status: 403 });
    }

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
    let logementNom = 'Non assigné';
    let logementAdresse = 'Non assignée';
    try {
      const logementResult = await query(
        `SELECT DISTINCT l.nom_logement, l.adresse, l.id
         FROM logements l
         INNER JOIN baux b ON l.id = b.logement_id
         WHERE b.collaborateur_id = $1 
         AND (b.date_fin IS NULL OR b.date_fin >= CURRENT_DATE)
         ORDER BY b.date_debut DESC NULLS LAST
         LIMIT 1`,
        [payload.id]
      );
      if (logementResult.rows.length > 0) {
        logementNom = logementResult.rows[0].nom_logement || 'Sans nom';
        logementAdresse = logementResult.rows[0].adresse || 'Adresse non renseignée';
      }
    } catch (e) {
      if (e instanceof Error) {
        logError(e, { route: '/api/signalements', action: 'fetch-logement-info' });
      }
    }

    // Enregistrer le signalement
    const signalementResult = await query(
      `INSERT INTO signalements (collaborateur_id, sujet, message, statut)
       VALUES ($1, $2, $3, 'en_attente')
       RETURNING id`,
      [payload.id, sujet, message]
    );

    const signalementId = signalementResult.rows[0].id;

    // Préparer les pièces jointes à partir des fichiers uploadés (robuste en serverless/Vercel)
    const attachments: {
      filename: string;
      content: Buffer;
      contentType: string;
    }[] = [];
    const attachedFileNames: string[] = [];

    if (fichiers.length > 0) {
      for (const file of fichiers) {
        try {
          if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            logger.warn(
              { route: '/api/signalements', action: 'file-validation', fileType: file.type },
              'Type de fichier non autorise'
            );
            continue;
          }
          if (file.size > MAX_FILE_SIZE) {
            logger.warn(
              { route: '/api/signalements', action: 'file-validation', fileSize: file.size },
              'Fichier trop volumineux'
            );
            continue;
          }

          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);

          attachments.push({
            filename: file.name,
            content: buffer,
            contentType: file.type,
          });
          attachedFileNames.push(file.name);
        } catch (fileError) {
          if (fileError instanceof Error) {
            logError(fileError, { route: '/api/signalements', action: 'prepare-attachment', fileName: file.name });
          }
        }
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
          .info-box p { margin: 6px 0; }
          .muted { color: #6b7280; font-style: italic; }
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
            ${logementNom === 'Non assigné' && logementAdresse === 'Non assignée'
              ? `<p class="muted">Aucun logement actif n'est assigné à ce collaborateur au moment du signalement.</p>`
              : `
                <p><strong>🏠 Logement :</strong> ${logementNom}</p>
                <p><strong>📍 Adresse :</strong> ${logementAdresse}</p>
              `}
          </div>
          
          <div class="info-box">
            <h3>📋 Détails du signalement</h3>
            <p><strong>Sujet :</strong> ${sujet}</p>
            <p><strong>Message :</strong></p>
            <p style="background: #f9fafb; padding: 10px; border-radius: 5px;">${message}</p>
          </div>

          ${attachedFileNames.length > 0 ? `
            <div class="files-list">
              <p><strong>📎 Fichiers joints :</strong></p>
              <ul>
                ${attachedFileNames.map((name) => `<li>${name}</li>`).join('')}
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
      const techResult = await sendEmail({
        to: techEmail,
        subject: `🔧 Signalement technique : ${sujet}`,
        html: emailHtml,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      if ('error' in techResult) {
        logError(techResult.error, { route: '/api/signalements', action: 'send-email-technicien' });
      }
    } catch (emailError) {
      if (emailError instanceof Error) {
        logError(emailError, { route: '/api/signalements', action: 'send-email-technicien' });
      }
    }

    try {
      const rhResult = await sendEmail({
        to: rhEmail,
        subject: `🔧 Copie signalement technique : ${sujet}`,
        html: emailHtml,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      if ('error' in rhResult) {
        logError(rhResult.error, { route: '/api/signalements', action: 'send-email-rh' });
      }
    } catch (emailError) {
      if (emailError instanceof Error) {
        logError(emailError, { route: '/api/signalements', action: 'send-email-rh' });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Signalement envoyé avec succès',
      signalementId,
      fichiers: attachedFileNames.length,
    });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/signalements', method: 'POST' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi du signalement' },
      { status: 500 }
    );
  }
};

export const POST = withAuth(postHandler);
