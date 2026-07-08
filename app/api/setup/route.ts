import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { sendEmail } from '@/lib/email'; // Assurez-vous d'avoir une fonction sendEmail simple
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // 1. Vérifier le code secret
  if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
    console.warn('⚠️ Tentative d\'accès non autorisée à la route de setup.');
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
  }

  const adminEmail = 'admin@roches-blanches.com';

  try {
    // 2. Trouver l'utilisateur super_admin
    const userResult = await query(
      'SELECT id, nom, prenom FROM collaborateurs WHERE email = $1 AND role = \'super_admin\'',
      [adminEmail]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: `L'utilisateur ${adminEmail} n'a pas été trouvé ou n'est pas super_admin.` },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // 3. Générer un mot de passe sécurisé
    const newPassword = randomBytes(8).toString('hex'); // Génère un mot de passe de 16 caractères
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Mettre à jour le mot de passe dans la base de données
    await query(
      'UPDATE collaborateurs SET mot_de_passe = $1 WHERE id = $2',
      [hashedPassword, user.id]
    );

    console.log(`✅ Le mot de passe pour ${adminEmail} a été réinitialisé.`);

    // 5. Envoyer l'email avec le nouveau mot de passe
    const emailHtml = `
      <h1>Vos identifiants de connexion Super Admin</h1>
      <p>Bonjour ${user.prenom},</p>
      <p>Votre compte super administrateur a été initialisé pour l'application de gestion des logements.</p>
      <p>Voici vos identifiants :</p>
      <ul>
        <li><strong>Email :</strong> ${adminEmail}</li>
        <li><strong>Mot de passe :</strong> <code>${newPassword}</code></li>
      </ul>
      <p>Veuillez conserver ce mot de passe en lieu sûr. Vous pourrez le modifier depuis votre profil une fois connecté.</p>
      <p>L'équipe technique</p>
    `;

    const emailResult = await sendEmail({
      to: adminEmail,
      subject: 'Initialisation de votre compte Super Admin',
      html: emailHtml,
    });

    console.log(`📧 Email avec le nouveau mot de passe envoyé à ${adminEmail}.`);

    // ✅ VÉRIFICATION : S'assurer que l'email est bien parti
    if (!emailResult.success) {
      console.error('❌ Échec de l\'envoi de l\'email de setup :', emailResult.error);
      return NextResponse.json(
        { error: 'Le mot de passe a été créé, mais l\'envoi de l\'email a échoué. Veuillez vérifier vos logs Vercel et la configuration de votre service d\'email.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Le mot de passe pour ${adminEmail} a été créé et envoyé par email.`,
    });

  } catch (error) {
    console.error('❌ Erreur lors du setup du premier admin:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de l\'initialisation.' },
      { status: 500 }
    );
  }
}