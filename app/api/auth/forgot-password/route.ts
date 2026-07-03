import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe
    const result = await query(
      'SELECT id, nom, prenom, email FROM collaborateurs WHERE email = $1 AND est_actif = true',
      [email]
    );

    if (result.rows.length === 0) {
      // Pour des raisons de sécurité, on ne révèle pas si l'email existe
      return NextResponse.json({
        success: true,
        message: 'Si un compte existe avec cet email, un lien de réinitialisation vous a été envoyé.',
      });
    }

    const user = result.rows[0];

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 heure

    // Stocker le token
    await query(
      'UPDATE collaborateurs SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
      [resetToken, resetTokenExpiry, user.id]
    );

    // Envoyer l'email
    const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .header { background-color: #1a56db; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .btn { background-color: #1a56db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; }
          .info-box { background-color: #dbeafe; border-left: 4px solid #1a56db; padding: 15px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏨 Les Roches Blanches</h1>
          <p>Réinitialisation du mot de passe</p>
        </div>
        <div class="content">
          <h2>Bonjour ${user.prenom} ${user.nom},</h2>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          
          <div class="info-box">
            <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
          </div>
          
          <p style="margin-top: 20px;">
            <a href="${resetLink}" class="btn">🔑 Réinitialiser mon mot de passe</a>
          </p>
          <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
            🔗 Lien valable 1 heure : ${resetLink}
          </p>
          <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
            Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
          </p>
        </div>
        <div class="footer">
          <p>Les Roches Blanches - Gestion des logements saisonniers</p>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: user.email,
      subject: '🔑 Réinitialisation du mot de passe',
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      message: 'Email de réinitialisation envoyé',
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi' },
      { status: 500 }
    );
  }
}