import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const DEFAULT_CONVENTION_TEMPLATE = `
CONVENTION DE MISE A DISPOSITION D'UN LOGEMENT
ACCESSOIRE AU CONTRAT DE TRAVAIL

ENTRE LES SOUSSIGNES :

La société LES ROCHES BLANCHES DE CASSIS,
Dont le siège social est situé 9 Avenue des Calanques 13260 CASSIS,
Numéro SIRET : 06080148700012, Code NAF : 5510Z,
Représentée par Monsieur Christopher LAVAUD,
Agissant en qualité de Directeur Général en exercice,
Ci-après désignée « l'Employeur »

D'une part,

Et

{{PRENOM}} {{NOM}}
{{#if CENTRE_PRINCIPAL}}Centre principal : {{CENTRE_PRINCIPAL}}{{/if}}
{{#if CENTRE_AFFECTATION}}Centre affectation : {{CENTRE_AFFECTATION}}{{/if}}
Email : {{EMAIL}}
Ci-dessous désigné "l'Occupant"

D'autre part

IL EST CONVENU CE QUI SUIT

Article 1er -- Logement mis à disposition de l'Occupant
L'Employeur concède à {{PRENOM}} {{NOM}} en considération de sa qualité de salarié à son service et comme accessoire du contrat de travail liant les deux parties, la jouissance d'une partie du Logement suivant dont il est locataire à l'adresse suivante :
Adresse du Logement : {{ADRESSE}}, {{VILLE}}

Description du Logement mis à disposition de l'Occupant
{{#if DESCRIPTION}}{{DESCRIPTION}}{{else}}Logement meublé et équipé.{{/if}}

Fait en double exemplaire à Cassis,
Le {{DATE_SIGNATURE}}
`;

// Fonction pour remplacer les variables dans le template
function remplacerVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

// ✅ NOUVELLE FONCTION : Générer un PDF depuis un modèle
export async function generateConventionPDF({
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
  template?: string | null;
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
  const finalTemplate = template && template.trim().length > 0 ? template : DEFAULT_CONVENTION_TEMPLATE;
  const pdfDoc = await PDFDocument.create();
  // Note: la gestion de plusieurs pages et le contenu plus complexe du PDF par défaut
  // nécessiteraient une logique de rendu plus avancée que ce simple remplacement.
  // L'exemple ci-dessous est simplifié pour illustrer le concept de template.
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
  let texte = remplacerVariables(finalTemplate, variables);

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