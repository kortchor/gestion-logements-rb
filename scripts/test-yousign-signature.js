require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createSignatureRequestWithDocument } = require('../lib/yousign.js');

async function test() {
  try {
    // Lire le fichier PDF
    const pdfPath = path.join(__dirname, '../public/test.pdf');
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ Fichier PDF introuvable ! Exécute d\'abord create-test-pdf.js');
      return;
    }

    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfBase64 = pdfBuffer.toString('base64');

    console.log('📄 PDF chargé, taille :', pdfBuffer.length, 'octets');
    console.log('🔍 Test de création de signature Yousign...');
    
    const result = await createSignatureRequestWithDocument({
      signerEmail: 'test@exemple.com',
      signerNom: 'Test',
      signerPrenom: 'Utilisateur',
      documentContent: pdfBase64,
      documentName: 'document_test.pdf',
      message: 'Test de signature',
    });

    if (result.success) {
      console.log('✅ Demande de signature créée !');
      console.log('📝 ID:', result.signatureRequestId);
      console.log('🔗 Lien:', result.signerUrl);
    } else {
      console.log('❌ Erreur:', result.error);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

test();