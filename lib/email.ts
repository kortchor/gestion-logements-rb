import nodemailer from 'nodemailer';

// ✅ Configuration Mailtrap directe
const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "485b581256d52a",
    pass: "f5f1df829f5037",  // Remplace par ton vrai mot de passe Mailtrap
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
    const info = await transporter.sendMail({
      from: '"Les Roches Blanches" <noreply@roches-blanches.com>',
      to,
      subject,
      text,
      html: html || text,
      attachments,
    });
    console.log('✅ Email envoyé:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
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