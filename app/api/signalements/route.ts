import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import jwt from 'jsonwebtoken';

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

    const body = await request.json();
    const { sujet, message } = body;

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
    await query(
      `INSERT INTO signalements (collaborateur_id, sujet, message, statut)
       VALUES ($1, $2, $3, 'en_attente')`,
      [decoded.id, sujet, message]
    );

    // Envoyer l'email au technicien (avec RH en copie)
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

    // Envoyer au technicien et à la RH
    const rhEmail = process.env.RH_EMAIL || 'secretaire@roches-blanches-cassis.com';
    const techEmail = technicien['technicien_email'] || 'technique@roches-blanches-cassis.com';

    await sendEmail({
      to: techEmail,
      subject: `🔧 Signalement technique : ${sujet}`,
      html: emailHtml,
    });

    await sendEmail({
      to: rhEmail,
      subject: `🔧 Copie signalement technique : ${sujet}`,
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      message: 'Signalement envoyé avec succès',
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi du signalement' },
      { status: 500 }
    );
  }
}