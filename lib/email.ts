import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "485b581256d52a",
    pass: "f5f1df829f5037",
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
    // ✅ FORCER L'ENVOI VERS MAILTRAP en production
    const isProd = process.env.NODE_ENV === 'production';
    const isForced = process.env.FORCE_MAILTRAP === 'true';
    const finalTo = (isProd && isForced) ? 'test@mailtrap.io' : to;

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