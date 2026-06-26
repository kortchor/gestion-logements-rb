import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
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
      from: process.env.EMAIL_FROM || '"Les Roches Blanches" <noreply@roches-blanches.com>',
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

// Garder la fonction simple pour la compatibilité
export async function sendEmail({ to, subject, html, text }: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  return sendEmailWithAttachment({ to, subject, html, text });
}