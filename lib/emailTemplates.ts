// Template pour l'alerte fin de bail
export function getFinBailEmailTemplate({
  collaborateurNom,
  collaborateurPrenom,
  logementAdresse,
  dateFin,
}: {
  collaborateurNom: string;
  collaborateurPrenom: string;
  logementAdresse: string;
  dateFin: string;
}) {
  const dateFinFormatee = new Date(dateFin).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return {
    subject: `📅 Fin de bail - ${collaborateurPrenom} ${collaborateurNom}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .header { background-color: #1a56db; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          .info-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
          .btn { background-color: #1a56db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏨 Les Roches Blanches</h1>
          <p>Alerte fin de bail</p>
        </div>
        <div class="content">
          <h2>Bonjour,</h2>
          <p>Le bail du collaborateur <strong>${collaborateurPrenom} ${collaborateurNom}</strong> arrive à échéance.</p>
          
          <div class="info-box">
            <p><strong>📅 Date de fin :</strong> ${dateFinFormatee}</p>
            <p><strong>📍 Logement :</strong> ${logementAdresse}</p>
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
      Alerte fin de bail - ${collaborateurPrenom} ${collaborateurNom}
      
      Date de fin : ${dateFinFormatee}
      Logement : ${logementAdresse}
      
      Veuillez contacter le collaborateur pour connaître ses intentions.
      
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