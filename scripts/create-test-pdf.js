const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createTestPdf() {
  try {
    // Créer un nouveau document PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { height } = page.getSize();

    // Ajouter une police
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;

    // Titre
    page.drawText('CONVENTION DE MISE A DISPOSITION - TEST', {
      x: 50,
      y: y,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.6),
    });
    y -= 40;

    // Contenu
    const lines = [
      'Nom: Test',
      'Prénom: Utilisateur',
      'Email: test@exemple.com',
      'Logement: 12 Rue des Calanques, Cassis',
      'Date d\'arrivée: 30 juin 2026',
      'Date de départ: 31 août 2026',
      '',
      'Conditions générales:',
      '• L\'occupant s\'engage à respecter le règlement intérieur',
      '• Le logement doit être restitué dans son état initial',
      '• Toute dégradation sera à la charge de l\'occupant',
    ];

    for (const line of lines) {
      if (line.trim() === '') {
        y -= 10;
        continue;
      }
      page.drawText(line, {
        x: 70,
        y: y,
        size: 11,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 20;
    }

    // Signatures
    y -= 30;
    page.drawText('Signature de l\'Employeur : _________________', {
      x: 70,
      y: y,
      size: 11,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 25;
    page.drawText('Signature de l\'Occupant : _________________', {
      x: 70,
      y: y,
      size: 11,
      font,
      color: rgb(0, 0, 0),
    });

    // Sauvegarder le PDF
    const pdfBytes = await pdfDoc.save();
    const outputPath = path.join(__dirname, '../public/test.pdf');
    fs.writeFileSync(outputPath, pdfBytes);
    
    console.log('✅ PDF créé avec succès !');
    console.log('📁 Emplacement :', outputPath);
  } catch (error) {
    console.error('❌ Erreur :', error.message);
  }
}

createTestPdf();