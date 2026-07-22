require('dotenv').config();
const fs = require('fs');
const path = require('path');

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

    console.log('📄 PDF chargé, taille :', pdfBuffer.length, 'octets');
    console.log('🔍 Test de création de signature Yousign V3...');
    
    // Importer le client Yousign
    const youSignClient = require('../lib/yousign-client').default;
    
    const result = await youSignClient.createSignatureRequest({
      signerEmail: 'test@exemple.com',
      signerName: 'Test Utilisateur',
      documentContent: pdfBuffer,
      documentName: 'document_test.pdf',
      message: 'Test de signature via API V3',
    });

    if (result.success) {
      console.log('✅ Demande de signature créée !');
      console.log('📝 ID:', result.signatureRequestId);
      console.log('🔗 Lien:', result.signatureLink);
      console.log('👁️ Signer URL:', result.signerUrl);
    } else {
      console.log('❌ Erreur:', result.error);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

test();