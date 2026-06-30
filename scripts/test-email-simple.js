const nodemailer = require('nodemailer');
require('dotenv').config();

async function test() {
  console.log('📧 Test simple...');
  
  // ⚠️ Utiliser les variables d'environnement
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: 'test@exemple.com',
      subject: 'Test Mailtrap',
      text: 'Test email',
    });
    console.log('✅ Email envoyé:', info.messageId);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

test();