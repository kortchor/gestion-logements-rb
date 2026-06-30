// scripts/test-email.js
require('dotenv').config();

// Importer le fichier TypeScript avec ts-node
const { sendEmail } = require('../lib/email.ts');

async function test() {
  console.log('📧 Test d\'envoi d\'email vers Mailtrap...');
  console.log('📡 Host:', process.env.EMAIL_HOST);
  console.log('👤 User:', process.env.EMAIL_USER);
  console.log('🔑 Password:', process.env.EMAIL_PASSWORD ? '✅ Présent' : '❌ Manquant');
  console.log('---');

  const result = await sendEmail({
    to: 'test@exemple.com',
    subject: '🧪 Test Mailtrap - Les Roches Blanches',
    text: 'Ceci est un test d\'envoi d\'email via Mailtrap.',
    html: `
      <h1>🧪 Test Mailtrap</h1>
      <p>Ceci est un test d'envoi d'email via Mailtrap.</p>
      <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
      <p>Si vous voyez cet email, la configuration est réussie ! ✅</p>
    `,
  });

  if (result.success) {
    console.log('✅ Email envoyé avec succès !');
    console.log('📩 Message ID:', result.messageId);
    console.log('📬 Va sur Mailtrap pour voir l\'email.');
  } else {
    console.log('❌ Erreur:', result.error);
  }
}

test();