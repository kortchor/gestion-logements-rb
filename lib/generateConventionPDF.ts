import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Fonction pour remplacer les variables dans le template
function remplacerVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

// NOUVELLE FONCTION : Générer un PDF depuis un modèle
export async function generateConventionPDFFromTemplate({
  template,
  nom,
  prenom,
  email,
  adresseLogement,
  villeLogement,
  dateDebut,
  dateFin,
  numeroContrat,
  descriptionDetaillee = '',
  centrePrincipal = '',
  centreAffectation = '',
  participationMensuelle = null,
}: {
  template: string;
  nom: string;
  prenom: string;
  email: string;
  adresseLogement: string;
  villeLogement: string;
  dateDebut: string;
  dateFin: string;
  numeroContrat: string;
  descriptionDetaillee?: string;
  centrePrincipal?: string;
  centreAffectation?: string;
  participationMensuelle?: number | null;
}): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Préparer les variables
  const variables = {
    NOM: nom.toUpperCase(),
    PRENOM: prenom,
    EMAIL: email || '',
    ADRESSE: adresseLogement,
    VILLE: villeLogement,
    DATE_DEBUT: new Date(dateDebut).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
    DATE_FIN: dateFin ? new Date(dateFin).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }) : 'Non définie',
    PARTICIPATION: participationMensuelle ? participationMensuelle.toFixed(2) : '0',
    NUMERO_CONTRAT: numeroContrat,
    CENTRE_PRINCIPAL: centrePrincipal || '',
    CENTRE_AFFECTATION: centreAffectation || '',
    DESCRIPTION: descriptionDetaillee || '',
    DATE_SIGNATURE: new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
  };

  // Remplacer les variables
  let texte = remplacerVariables(template, variables);

  // Diviser en lignes
  const lines = texte.split('\n');
  const fontSize = 11;
  const lineHeight = 18;
  let y = height - 50;

  for (const line of lines) {
    if (line.trim() === '') {
      y -= lineHeight * 0.5;
      continue;
    }
    
    const isBold = line.trim() === line.trim().toUpperCase() && line.trim().length > 3;
    const isSignatureLine = line.includes('_________________') || line.includes('signature') || line.includes('Signature');
    
    let drawFont = font;
    let drawSize = fontSize;
    
    if (isBold) {
      drawFont = fontBold;
    }
    if (isSignatureLine) {
      drawFont = fontBold;
      drawSize = fontSize + 1;
    }
    
    page.drawText(line, {
      x: 50,
      y: y,
      size: drawSize,
      font: drawFont,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;

    if (y < 50) {
      const newPage = pdfDoc.addPage([595.28, 841.89]);
      y = height - 50;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// Fonction existante (convention par défaut)
export async function generateConventionPDF({
  nom,
  prenom,
  email,
  adresseLogement,
  villeLogement,
  dateDebut,
  dateFin,
  numeroContrat,
  descriptionDetaillee = '',
  centrePrincipal = '',
  centreAffectation = '',
  participationMensuelle = null,
  templateConvention = null,
}: {
  nom: string;
  prenom: string;
  email: string;
  adresseLogement: string;
  villeLogement: string;
  dateDebut: string;
  dateFin: string;
  numeroContrat: string;
  descriptionDetaillee?: string;
  centrePrincipal?: string;
  centreAffectation?: string;
  participationMensuelle?: number | null;
  templateConvention?: string | null;
}): Promise<Buffer> {
  // Si un template est fourni, on l'utilise
  if (templateConvention && templateConvention.trim().length > 0) {
    return generateConventionPDFFromTemplate({
      template: templateConvention,
      nom,
      prenom,
      email,
      adresseLogement,
      villeLogement,
      dateDebut,
      dateFin,
      numeroContrat,
      descriptionDetaillee,
      centrePrincipal,
      centreAffectation,
      participationMensuelle,
    });
  }

  // Sinon, on utilise le template par défaut (à garder pour compatibilité)
  // ... code existant du template par défaut ...
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const fontSize = 11;
  const lineHeight = 18;
  let y = height - 50;

  // En-tête
  page.drawText('CONVENTION DE MISE A DISPOSITION D\'UN LOGEMENT', {
    x: 50,
    y: y,
    size: 14,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.6),
  });
  y -= 5;
  page.drawText('ACCESSOIRE AU CONTRAT DE TRAVAIL', {
    x: 50,
    y: y,
    size: 14,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.6),
  });
  y -= 30;

  // Entre les soussignes
  page.drawText('ENTRE LES SOUSSIGNES :', {
    x: 50,
    y: y,
    size: fontSize + 1,
    font: fontBold,
  });
  y -= 25;

  page.drawText('La société LES ROCHES BLANCHES DE CASSIS,', {
    x: 50,
    y: y,
    size: fontSize,
    font: fontBold,
  });
  y -= lineHeight;

  page.drawText('Dont le siège social est situé 9 Avenue des Calanques 13260 CASSIS,', {
    x: 60,
    y: y,
    size: fontSize,
    font,
  });
  y -= lineHeight;

  page.drawText('Numéro SIRET : 06080148700012, Code NAF : 5510Z,', {
    x: 60,
    y: y,
    size: fontSize,
    font,
  });
  y -= lineHeight;

  page.drawText('Représentée par Monsieur Christopher LAVAUD,', {
    x: 60,
    y: y,
    size: fontSize,
    font,
  });
  y -= lineHeight;

  page.drawText('Agissant en qualité de Directeur Général en exercice,', {
    x: 60,
    y: y,
    size: fontSize,
    font,
  });
  y -= lineHeight;

  page.drawText('Ci-après désignée « l\'Employeur »', {
    x: 60,
    y: y,
    size: fontSize,
    font,
  });
  y -= 25;

  page.drawText('D\'une part,', {
    x: 50,
    y: y,
    size: fontSize,
    font: fontBold,
  });
  y -= 25;

  page.drawText(`Et`, {
    x: 50,
    y: y,
    size: fontSize,
    font: fontBold,
  });
  y -= 25;

  page.drawText(`${prenom.toUpperCase()} ${nom.toUpperCase()}`, {
    x: 50,
    y: y,
    size: fontSize,
    font: fontBold,
  });
  y -= lineHeight;

  if (centrePrincipal) {
    page.drawText(`Centre principal : ${centrePrincipal}`, {
      x: 60,
      y: y,
      size: fontSize,
      font,
    });
    y -= lineHeight;
  }

  if (centreAffectation) {
    page.drawText(`Centre affectation : ${centreAffectation}`, {
      x: 60,
      y: y,
      size: fontSize,
      font,
    });
    y -= lineHeight;
  }

  page.drawText(`Email : ${email}`, {
    x: 60,
    y: y,
    size: fontSize,
    font,
  });
  y -= lineHeight;

  page.drawText('Ci-dessous désigné "l\'Occupant"', {
    x: 60,
    y: y,
    size: fontSize,
    font,
  });
  y -= 25;

  page.drawText('D\'autre part', {
    x: 50,
    y: y,
    size: fontSize,
    font: fontBold,
  });
  y -= 30;

  // IL EST CONVENU CE QUI SUIT
  page.drawText('IL EST CONVENU CE QUI SUIT', {
    x: 50,
    y: y,
    size: fontSize + 1,
    font: fontBold,
  });
  y -= 25;

  // ARTICLE 1
  page.drawText('Article 1er -- Logement mis à disposition de l\'Occupant', {
    x: 50,
    y: y,
    size: fontSize,
    font: fontBold,
  });
  y -= lineHeight;

  page.drawText(`L'Employeur concède à ${prenom} ${nom} en considération de sa qualité de salarié`, {
    x: 60,
    y: y,
    size: fontSize - 0.5,
    font,
  });
  y -= lineHeight;

  page.drawText('à son service et comme accessoire du contrat de travail liant les deux parties,', {
    x: 60,
    y: y,
    size: fontSize - 0.5,
    font,
  });
  y -= lineHeight;

  page.drawText('la jouissance d\'une partie du Logement suivant dont il est locataire', {
    x: 60,
    y: y,
    size: fontSize - 0.5,
    font,
  });
  y -= lineHeight;

  page.drawText(`à l'adresse suivante :`, {
    x: 60,
    y: y,
    size: fontSize - 0.5,
    font,
  });
  y -= lineHeight;

  page.drawText(`Adresse du Logement : ${adresseLogement}, ${villeLogement}`, {
    x: 70,
    y: y,
    size: fontSize,
    font: fontBold,
  });
  y -= lineHeight * 2;

  // Description
  page.drawText('Description du Logement mis à disposition de l\'Occupant', {
    x: 60,
    y: y,
    size: fontSize,
    font: fontBold,
  });
  y -= lineHeight;

  if (descriptionDetaillee) {
    const descLines = descriptionDetaillee.split('\n');
    for (const line of descLines) {
      if (line.trim()) {
        page.drawText(`• ${line.trim()}`, {
          x: 70,
          y: y,
          size: fontSize - 0.5,
          font,
        });
        y -= lineHeight;
      }
    }
  } else {
    page.drawText('Logement meublé et équipé.', {
      x: 70,
      y: y,
      size: fontSize - 0.5,
      font,
    });
    y -= lineHeight;
  }
  y -= lineHeight;

  // ARTICLE 2
  page.drawText('Article 2 -- Prise d\'effet - Durée', {
    x: 50,
    y: y,
    size: fontSize,
    font: fontBold,
  });
  y -= lineHeight;

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

  page.drawText(`La jouissance prendra effet avec la remise des clés pour une période du`, {
    x: 60,
    y: y,
    size: fontSize - 0.5,
    font,
  });
  y -= lineHeight;

  page.drawText(`${dateDebutFormatee} au ${dateFinFormatee} inclus.`, {
    x: 60,
    y: y,
    size: fontSize,
    font: fontBold,
  });
  y -= lineHeight * 2;

  // ARTICLE 4
  page.drawText('Article 4 -- Obligations de l\'Occupant', {
    x: 50,
    y: y,
    size: fontSize,
    font: fontBold,
  });
  y -= lineHeight;

  // 4.1 Caution
  page.drawText('4.1. Chèque de caution', {
    x: 60,
    y: y,
    size: fontSize,
    font: fontBold,
  });
  y -= lineHeight;

  page.drawText('Un dépôt de garantie (caution) d\'un montant de 250 € (deux cent cinquante euros)', {
    x: 70,
    y: y,
    size: fontSize - 0.5,
    font,
  });
  y -= lineHeight;

  page.drawText('est demandé à l\'Occupant. Le chèque ne sera en principe pas encaissé.', {
    x: 70,
    y: y,
    size: fontSize - 0.5,
    font,
  });
  y -= lineHeight * 2;

  // 4.2 Redevance
  page.drawText('4.2. Mise à disposition du Logement à titre onéreux', {
    x: 60,
    y: y,
    size: fontSize,
    font: fontBold,
  });
  y -= lineHeight;

  const participationText = participationMensuelle 
    ? `La mise à disposition du Logement est consentie moyennant le paiement par l'Occupant d'une redevance fixée à ${participationMensuelle.toFixed(2)} € (${participationMensuelle.toFixed(2)} euros) par mois.`
    : 'La mise à disposition du Logement est consentie à titre gratuit.';

  page.drawText(participationText, {
    x: 70,
    y: y,
    size: fontSize - 0.5,
    font,
  });
  y -= lineHeight;

  if (participationMensuelle) {
    page.drawText('Cette redevance inclut la consommation d\'eau et d\'électricité de l\'Occupant.', {
      x: 70,
      y: y,
      size: fontSize - 0.5,
      font,
    });
    y -= lineHeight;

    page.drawText('L\'Occupant accepte expressément que cette redevance soit prélevée par l\'Employeur', {
      x: 70,
      y: y,
      size: fontSize - 0.5,
      font,
    });
    y -= lineHeight;

    page.drawText('chaque mois directement sur sa paie.', {
      x: 70,
      y: y,
      size: fontSize - 0.5,
      font,
    });
  }
  y -= lineHeight * 2;

  // 4.3 Assurance
  page.drawText('4.3. Assurance', {
    x: 60,
    y: y,
    size: fontSize,
    font: fontBold,
  });
  y -= lineHeight;

  page.drawText('Le logement bénéficie de la couverture du contrat SUISSCOURTAGE,', {
    x: 70,
    y: y,
    size: fontSize - 0.5,
    font,
  });
  y -= lineHeight;

  page.drawText('souscrit par LES ROCHES BLANCHES, N° 01049851S - 0045', {
    x: 70,
    y: y,
    size: fontSize - 0.5,
    font,
  });
  y -= lineHeight * 2;

  // Signatures
  if (y < 150) {
    const newPage = pdfDoc.addPage([595.28, 841.89]);
    y = height - 50;
  }

  page.drawText('Fait en double exemplaire à Cassis,', {
    x: 50,
    y: y,
    size: fontSize,
    font,
  });
  y -= lineHeight;

  page.drawText(`Le ${new Date().toLocaleDateString('fr-FR')}`, {
    x: 50,
    y: y,
    size: fontSize,
    font,
  });
  y -= lineHeight * 3;

  // Signature Employeur
  page.drawText('Pour la société LES ROCHES BLANCHES DE CASSIS', {
    x: 50,
    y: y,
    size: fontSize,
    font: fontBold,
  });
  y -= lineHeight;

  page.drawText('Monsieur Christopher LAVAUD', {
    x: 60,
    y: y,
    size: fontSize,
    font,
  });
  y -= lineHeight;

  page.drawText('Directeur Général', {
    x: 60,
    y: y,
    size: fontSize,
    font,
  });
  y -= lineHeight;

  page.drawLine({
    start: { x: 50, y: y - 5 },
    end: { x: 250, y: y - 5 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Signature Occupant
  const signatureX = 350;
  page.drawText('L\'Occupant', {
    x: signatureX,
    y: y + 20,
    size: fontSize,
    font: fontBold,
  });
  y -= lineHeight;

  page.drawText(`${prenom} ${nom}`, {
    x: signatureX + 10,
    y: y,
    size: fontSize,
    font,
  });
  y -= lineHeight;

  page.drawLine({
    start: { x: signatureX, y: y - 5 },
    end: { x: signatureX + 200, y: y - 5 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Pied de page
  page.drawText('Document généré automatiquement - Les Roches Blanches - Tous droits réservés', {
    x: 50,
    y: 50,
    size: 8,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// Exporter les deux fonctions
export { generateConventionPDFFromTemplate };