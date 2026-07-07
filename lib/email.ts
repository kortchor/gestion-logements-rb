import nodemailer from 'nodemailer';

// ✅ LOGS DE DÉBOGAGE - Affiche les variables d'environnement
console.log('🔍 Vérification des variables Mailtrap:');
console.log('📧 EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('📧 EMAIL_USER:', process.env.EMAIL_USER);
console.log('📧 EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Présent' : '❌ Manquant');
console.log('📧 EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('📧 EMAIL_FROM:', process.env.EMAIL_FROM);

// ✅ Configuration du transporteur
const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "485b581256d52a",
    pass: "f5f1df829f5037",  // Mot de passe Mailtrap
  },
});

export async function sendEmailWithAttachment({
  to,
  subject,
  html,
  text,
  attachments,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}) {
  try {
    console.log(`📧 Envoi d'email à: ${to}`);
    console.log(`📧 Sujet: ${subject}`);

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Les Roches Blanches" <noreply@roches-blanches.com>',
      to,
      subject,
      text,
      html: html || text,
      attachments,
    });

    console.log('✅ Email envoyé:', info.messageId);
    console.log('📧 Réponse:', info.response);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur envoi email:');
    console.error('📧 Message:', error.message);
    console.error('📧 Code:', error.code);
    console.error('📧 Response:', error.response);
    console.error('📧 ResponseCode:', error.responseCode);
    console.error('📧 Command:', error.command);
    return { success: false, error };
  }
}

export async function sendEmail({ to, subject, html, text }: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  return sendEmailWithAttachment({ to, subject, html, text });
}