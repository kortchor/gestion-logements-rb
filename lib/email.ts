import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "sandbox.smtp.mailtrap.io",
  port: parseInt(process.env.EMAIL_PORT || '2525'),
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
}) {
  try {
    // Forcer l'envoi vers une boîte de test si la variable est activée
    const isProd = process.env.NODE_ENV === 'production';
    const isForced = process.env.FORCE_MAILTRAP === 'true';
    const finalTo = (isProd && isForced) ? (process.env.MAILTRAP_TEST_EMAIL || 'test@mailtrap.io') : to;

    console.log(`📧 Envoi à: ${finalTo} (original: ${to})`);

    const info = await transporter.sendMail({
      from: '"Les Roches Blanches" <noreply@roches-blanches.com>',
      to: finalTo,
      subject: subject,
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

export async function sendEmail({ to, subject, html, text }) {
  return sendEmailWithAttachment({ to, subject, html, text });
}