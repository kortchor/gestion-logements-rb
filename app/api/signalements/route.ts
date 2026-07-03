import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { sendEmailWithAttachment } from '@/lib/email';
import jwt from 'jsonwebtoken';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_change_me';

export async function POST(request: Request) {
  try {
    // Vérifier le token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
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
    const technicienResult = await query(
      "SELECT cle, valeur FROM parametres WHERE cle IN ('technicien_nom', 'technicien_email', 'technicien_telephone')"
    );

    const technicien: Record<string, string> = {};
    technicienResult.rows.forEach((row: any) => {
      technicien[row.cle] = row.valeur;
    });

    // Récupérer les informations du collaborateur
    const collaborateurResult = await query(
      'SELECT nom, prenom, email FROM collaborateurs WHERE id = $1',
      [decoded.id]
    );

    const collaborateur = collaborateurResult.rows[0];

    // Enregistrer le signalement
    const signalementResult = await query(
      `INSERT INTO signalements (collaborateur_id, sujet, message, statut)
       VALUES ($1, $2, $3, 'en_attente')
       RETURNING id`,
      [decoded.id, sujet, message]
    );

    const signalementId = signalementResult.rows[0].id;

    // Sauvegarder les fichiers
    const fichiersPaths: string[] = [];
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'signalements', String(signalementId));

    if (fichiers.length > 0) {
      await mkdir(uploadDir, { recursive: true });

      for (const file of fichiers) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `${Date.now()}-${file.name}`;
        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);
        fichiersPaths.push(`/uploads/signalements/${signalementId}/${filename}`);
      }
    }

    // Préparer les pièces jointes pour l'email
    const attachments = fichiersPaths.map((filepath, index) => ({
      filename: fichiers[index]?.name || `piece-jointe-${index+1}`,
      path: path.join(process.cwd(), 'public', filepath),
    }));

    // Envoyer l'email avec pièces jointes
    const rhEmail = process.env.RH_EMAIL || 'secretaire@roches-blanches-cassis.com';
    const techEmail = technicien['technicien_email'] || 'technique@roches-blanches-cassis.com';

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
            ${technicien['technicien_telephone'] ? `📞 ${technicien['technicien_telephone']}` : ''}
          </p>
        </div>
        <div class="footer">
          <p>Les Roches Blanches - Signalement technique</p>
          <p>RH en copie de cet email</p>
        </div>
      </body>
      </html>
    `;

    await sendEmailWithAttachment({
      to: techEmail,
      subject: `🔧 Signalement technique : ${sujet}`,
      html: emailHtml,
      attachments,
    });

    await sendEmailWithAttachment({
      to: rhEmail,
      subject: `🔧 Copie signalement technique : ${sujet}`,
      html: emailHtml,
      attachments,
    });

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
}