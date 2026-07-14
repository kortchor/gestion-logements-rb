import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server'; // ✅ Importer NextRequest
import { sendEmail } from '@/lib/email'; // sendEmail est utilisé, on le garde
import bcrypt from 'bcryptjs'; // Correction: bcryptjs est utilisé, donc on le garde
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { CollaborateurDb } from '@/types/db';

// ✅ Déplacer la constante en dehors de la fonction pour une meilleure performance
const PASSWORD_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';

export const POST = withAuth(async (
  request: NextRequest, // ✅ Utiliser NextRequest au lieu de Request
  payload: TokenPayload,
  { params }: { params: { id: string } }
) => {
  try {
    // ✅ Vérification robuste de l'ID
    if (!params.id) {
      return NextResponse.json(
        { error: 'ID de collaborateur manquant dans l\'URL' },
        { status: 400 }
      );
    }
    const collaborateurId = parseInt(params.id, 10);

    if (isNaN(collaborateurId)) {
      return NextResponse.json(
        { error: 'ID de collaborateur invalide' },
        { status: 400 }
      );
    }
    
    // Récupérer les infos du collaborateur
    const result = await query(
      // ✅ CORRECTION: Ajouter nom et prenom à la requête
      'SELECT nom, prenom, email, mot_de_passe FROM collaborateurs WHERE id = $1',
      [collaborateurId]
    );
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Collaborateur non trouvé' },
        { status: 404 }
      );
    }

    const collaborateur = result.rows[0];
    let motDePasseGenere: string | null = null; // ✅ Typer explicitement la variable

    if (!collaborateur.mot_de_passe) {
      // ✅ Générer le mot de passe dans une variable locale au bloc `if`
      let newPassword = '';
      for (let i = 0; i < 12; i++) { // La génération du mot de passe est correcte
        newPassword += PASSWORD_CHARS.charAt(Math.floor(Math.random() * PASSWORD_CHARS.length));
      }
      motDePasseGenere = newPassword; // Assigner à la variable extérieure

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await query(
        'UPDATE collaborateurs SET mot_de_passe = $1 WHERE id = $2',
        [hashedPassword, collaborateurId]
      );
    }

    const loginLink = process.env.NEXTAUTH_URL || 'http://localhost:3000/login';

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
          .password-box { background-color: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏨 Les Roches Blanches</h1>
          <p>Vos identifiants de connexion</p>
        </div>
        <div class="content">
          <h2>Bonjour ${collaborateur.prenom} ${collaborateur.nom},</h2>
          <p>Voici vos identifiants pour accéder à l'application.</p>
          
          <div class="password-box">
            <p><strong>🔑 Vos identifiants :</strong></p>
            <p><strong>Email :</strong> ${collaborateur.email}</p>
            ${motDePasseGenere 
              ? `<p><strong>Mot de passe :</strong> <code>${motDePasseGenere}</code></p>
                 <p style="font-size: 12px; color: #6b7280;">Changez ce mot de passe lors de votre première connexion.</p>`
              : `<p style="color: #6b7280;">Vous avez déjà un mot de passe.</p>`
            }
          </div>
          
          <p style="margin-top: 20px;">
            <a href="${loginLink}" class="btn">🔐 Se connecter</a>
          </p>
        </div>
        <div class="footer">
          <p>Les Roches Blanches - Gestion des logements saisonniers</p>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: collaborateur.email,
      subject: `🔑 Vos identifiants - ${collaborateur.prenom} ${collaborateur.nom}`,
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      message: 'Identifiants envoyés',
      mot_de_passe_genere: !!motDePasseGenere,
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi' },
      { status: 500 }
    );
  }
}, ['admin', 'super_admin']); // <-- Rôles autorisés
