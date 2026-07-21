// Template pour l'alerte fin de bail
export function getFinBailEmailTemplate({
  collaborateurNom,
  collaborateurPrenom,
  logementAdresse,
  dateFin,
  joursRestants = 0,
  typeAlerte = 'premiere',
}: {
  collaborateurNom: string;
  collaborateurPrenom: string;
  logementAdresse: string;
  dateFin: string;
  joursRestants?: number;
  typeAlerte?: string;
}) {
  const dateFinFormatee = new Date(dateFin).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const getSubject = () => {
    switch (typeAlerte) {
      case 'relance':
        return `🔔 RELANCE - Fin de bail de ${collaborateurPrenom} ${collaborateurNom}`;
      case 'derniere':
        return `🚨 URGENT - Dernière relance pour ${collaborateurPrenom} ${collaborateurNom}`;
      default:
        return `📅 Fin de bail - ${collaborateurPrenom} ${collaborateurNom}`;
    }
  };

  const getColor = () => {
    switch (typeAlerte) {
      case 'relance':
        return '#f59e0b';
      case 'derniere':
        return '#ef4444';
      default:
        return '#3b82f6';
    }
  };

  const getUrgence = () => {
    if (joursRestants <= 7) return '🔴 URGENT';
    if (joursRestants <= 14) return '🟡 ATTENTION';
    return 'ℹ️ INFORMATION';
  };

  return {
    subject: getSubject(),
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .header { background-color: ${getColor()}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          .info-box { background-color: ${typeAlerte === 'derniere' ? '#fef2f2' : '#fef3c7'}; border-left: 4px solid ${getColor()}; padding: 15px; margin: 15px 0; }
          .btn { background-color: #1a56db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏨 Les Roches Blanches</h1>
          <p>${typeAlerte === 'derniere' ? '⚠️ DERNIÈRE RELANCE' : typeAlerte === 'relance' ? '🔔 RELANCE' : 'Alerte fin de bail'}</p>
        </div>
        <div class="content">
          <h2>Bonjour,</h2>
          <div class="info-box">
            <p><strong>${getUrgence()} - ${typeAlerte === 'derniere' ? 'Action requise !' : 'Information importante'}</strong></p>
            <p><strong>📅 Date de fin :</strong> ${dateFinFormatee}</p>
            <p><strong>⏳ Jours restants :</strong> ${joursRestants} jours</p>
            <p><strong>📍 Logement :</strong> ${logementAdresse}</p>
            <p><strong>👤 Collaborateur :</strong> ${collaborateurPrenom} ${collaborateurNom}</p>
          </div>
          
          <p>Veuillez prendre les mesures nécessaires :</p>
          <ul>
            <li>Contacter le collaborateur pour connaître ses intentions</li>
            <li>Préparer la relève si nécessaire</li>
            <li>Organiser l'état des lieux de sortie</li>
          </ul>
          
          <p style="margin-top: 20px;">
            <a href="${process.env.NEXTAUTH_URL}/collaborateurs" class="btn">📊 Voir dans l'application</a>
          </p>
        </div>
        <div class="footer">
          <p>Les Roches Blanches - Gestion des logements saisonniers</p>
          <p>Cet email est envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
      </body>
      </html>
    `,
    text: `
      ${typeAlerte === 'derniere' ? '⚠️ DERNIÈRE RELANCE' : typeAlerte === 'relance' ? '🔔 RELANCE' : 'Alerte fin de bail'}
      
      ${getUrgence()}
      
      Date de fin : ${dateFinFormatee}
      Jours restants : ${joursRestants} jours
      Logement : ${logementAdresse}
      Collaborateur : ${collaborateurPrenom} ${collaborateurNom}
      
      Veuillez contacter le collaborateur et préparer la relève.
      
      ---
      Les Roches Blanches - Gestion des logements saisonniers
    `,
  };
}

// Template pour la convention à signer
export function getConventionEmailTemplate({
  collaborateurNom,
  collaborateurPrenom,
  collaborateurEmail,
  logementAdresse,
  logementVille,
  dateDebut,
  dateFin,
}: {
  collaborateurNom: string;
  collaborateurPrenom: string;
  collaborateurEmail: string;
  logementAdresse: string;
  logementVille: string;
  dateDebut: string;
  dateFin: string;
}) {
  const dateDebutFormatee = new Date(dateDebut).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const dateFinFormatee = dateFin ? new Date(dateFin).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }) : 'Non définie';

  return {
    subject: `📄 Convention locative - ${collaborateurPrenom} ${collaborateurNom}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .header { background-color: #1a56db; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          .info-box { background-color: #dbeafe; border-left: 4px solid #1a56db; padding: 15px; margin: 15px 0; }
          .btn { background-color: #1a56db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏨 Les Roches Blanches</h1>
          <p>Convention locative</p>
        </div>
        <div class="content">
          <h2>Bonjour ${collaborateurPrenom} ${collaborateurNom},</h2>
          <p>Votre logement vous a été assigné. Veuillez trouver ci-dessous les informations de votre hébergement.</p>
          
          <div class="info-box">
            <h3>📍 Informations du logement</h3>
            <p><strong>Adresse :</strong> ${logementAdresse}</p>
            <p><strong>Ville :</strong> ${logementVille}</p>
            <p><strong>Date d'arrivée :</strong> ${dateDebutFormatee}</p>
            <p><strong>Date de départ :</strong> ${dateFinFormatee}</p>
          </div>
          
          <p style="margin-top: 20px;">
            <a href="#" class="btn">📝 Signer la convention</a>
          </p>
          <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
            🔗 Lien de signature valable 7 jours
          </p>
        </div>
        <div class="footer">
          <p>Les Roches Blanches - Gestion des logements saisonniers</p>
          <p>Cet email est envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
      </body>
      </html>
    `,
    text: `
      Convention locative - ${collaborateurPrenom} ${collaborateurNom}
      
      Informations du logement :
      Adresse : ${logementAdresse}
      Ville : ${logementVille}
      Date d'arrivée : ${dateDebutFormatee}
      Date de départ : ${dateFinFormatee}
      
      ---
      Les Roches Blanches - Gestion des logements saisonniers
    `,
  };
}

// Template pour les identifiants d'administrateur
export function getAdminCredentialsEmailTemplate({
  nom,
  prenom,
  email,
  motDePasse,
  siteUrl = 'https://gestion-logements-rb.vercel.app',
}: {
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
  siteUrl?: string;
}) {
  return {
    subject: `🔐 Vos identifiants administrateur - Gestion Logements`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .header { background-color: #065f46; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; max-width: 600px; margin: 0 auto; }
          .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          .credentials-box { background-color: #f0fdf4; border: 2px solid #059669; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .credentials-box h3 { color: #065f46; margin-top: 0; }
          .credential-item { margin: 12px 0; padding: 10px; background-color: white; border-radius: 5px; border-left: 4px solid #059669; }
          .label { font-weight: bold; color: #065f46; display: block; font-size: 12px; text-transform: uppercase; margin-bottom: 3px; }
          .value { font-family: 'Courier New', monospace; font-size: 14px; color: #1f2937; }
          .btn { background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; }
          .warning-box { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; font-size: 13px; color: #7f1d1d; }
          .step { margin: 15px 0; padding-left: 20px; }
          .step-number { display: inline-block; width: 25px; height: 25px; background-color: #059669; color: white; border-radius: 50%; text-align: center; line-height: 25px; font-weight: bold; margin-right: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Accès Administrateur</h1>
          <p>Gestion Logements Les Roches Blanches</p>
        </div>
        <div class="content">
          <h2>Bienvenue ${prenom} ${nom},</h2>
          <p>Votre compte administrateur a été créé avec succès. Vos identifiants de connexion sont ci-dessous.</p>
          
          <div class="credentials-box">
            <h3>✅ Vos identifiants d'accès</h3>
            <div class="credential-item">
              <span class="label">Email / Nom d'utilisateur</span>
              <span class="value">${email}</span>
            </div>
            <div class="credential-item">
              <span class="label">Mot de passe temporaire</span>
              <span class="value">${motDePasse}</span>
            </div>
          </div>
          
          <div class="warning-box">
            <strong>⚠️ Important :</strong> Ceci est un mot de passe temporaire généré automatiquement. 
            Vous DEVEZ le changer lors de votre première connexion pour sécuriser votre compte.
          </div>
          
          <h3>📖 Comment accéder à votre compte ?</h3>
          <div class="step">
            <span class="step-number">1</span>
            <strong>Rendez-vous sur le site :</strong>
            <p style="margin: 8px 0; margin-left: 35px;">
              <a href="${siteUrl}/login" class="btn">🔗 Accéder à l'application</a>
            </p>
          </div>
          
          <div class="step">
            <span class="step-number">2</span>
            <strong>Connectez-vous avec vos identifiants :</strong>
            <ul style="margin: 8px 0; margin-left: 35px;">
              <li>Email : ${email}</li>
              <li>Mot de passe : ${motDePasse}</li>
            </ul>
          </div>
          
          <div class="step">
            <span class="step-number">3</span>
            <strong>Modifiez votre mot de passe :</strong>
            <p style="margin: 8px 0; margin-left: 35px;">
              Une fois connecté, accédez à votre profil et changez immédiatement votre mot de passe 
              pour un mot de passe personnel que vous seul connaissez.
            </p>
          </div>
          
          <h3>🛡️ Conseils de sécurité</h3>
          <ul>
            <li>Ne partagez jamais vos identifiants avec quiconque</li>
            <li>Utilisez un mot de passe fort et unique</li>
            <li>Changez votre mot de passe régulièrement</li>
            <li>Déconnectez-vous toujours après utilisation</li>
          </ul>
          
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
            Si vous avez des questions ou des problèmes d'accès, contactez votre administrateur système.
          </p>
        </div>
        <div class="footer">
          <p>Les Roches Blanches - Gestion des logements saisonniers</p>
          <p>Cet email contient des informations confidentielles. Ne le partagez pas.</p>
          <p>Cet email est envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
      </body>
      </html>
    `,
    text: `
      ACCÈS ADMINISTRATEUR - Gestion Logements Les Roches Blanches
      
      Bienvenue ${prenom} ${nom},
      
      Votre compte administrateur a été créé avec succès.
      
      ===== VOS IDENTIFIANTS =====
      Email / Nom d'utilisateur : ${email}
      Mot de passe temporaire : ${motDePasse}
      
      ⚠️ IMPORTANT : Ceci est un mot de passe temporaire. Vous DEVEZ le changer lors de votre première connexion.
      
      ===== COMMENT ACCÉDER ? =====
      
      1. Rendez-vous sur : ${siteUrl}/login
      2. Connectez-vous avec :
         - Email : ${email}
         - Mot de passe : ${motDePasse}
      3. Modifiez immédiatement votre mot de passe
      
      ===== CONSEILS DE SÉCURITÉ =====
      ✓ Ne partagez jamais vos identifiants
      ✓ Utilisez un mot de passe fort et unique
      ✓ Changez votre mot de passe régulièrement
      ✓ Déconnectez-vous toujours après utilisation
      
      Si vous avez des questions, contactez votre administrateur système.
      
      ---
      Les Roches Blanches - Gestion des logements saisonniers
      Cet email contient des informations confidentielles.
    `,
  };
}