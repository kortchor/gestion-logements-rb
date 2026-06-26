// lib/yousign.js
// Intégration Yousign pour la signature électronique

const axios = require('axios');

// ✅ URL CORRECTE pour l'API Yousign v3
const YOUSIGN_API_URL = 'https://api-sandbox.yousign.com/v3';

const API_KEY = process.env.YOUSIGN_API_KEY;

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

/**
 * Tester la connexion à Yousign
 */
async function testYousignConnection() {
  try {
    console.log('📡 URL testée:', `${YOUSIGN_API_URL}/organizations`);
    
    const response = await axios.get(
      `${YOUSIGN_API_URL}/organizations`,
      { 
        headers,
        timeout: 10000,
      }
    );
    
    console.log('✅ Connexion Yousign réussie !');
    console.log('📊 Statut:', response.status);
    console.log('📊 Données:', JSON.stringify(response.data, null, 2));
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Erreur Yousign:');
    if (error.response) {
      console.error('📊 Statut:', error.response.status);
      console.error('📊 Message:', error.response.data);
    } else if (error.request) {
      console.error('📊 Pas de réponse du serveur');
    } else {
      console.error('📊 Erreur:', error.message);
    }
    return { 
      success: false, 
      error: error.response?.data?.detail || error.message || 'Erreur de connexion' 
    };
  }
}

/**
 * Créer une demande de signature avec un document PDF
 */
async function createSignatureRequestWithDocument({
  signerEmail,
  signerNom,
  signerPrenom,
  documentContent,
  documentName,
  message = 'Veuillez signer votre convention locative',
}) {
  try {
    console.log('📄 Création du document Yousign...');
    
    // 1. Créer le document
    const documentResponse = await axios.post(
      `${YOUSIGN_API_URL}/documents`,
      {
        file: documentContent,
        nature: 'signable',
        name: documentName,
      },
      { headers }
    );

    const documentId = documentResponse.data.id;
    console.log('✅ Document créé:', documentId);

    // 2. Créer la demande de signature
    console.log('📝 Création de la demande de signature...');
    
    const signatureResponse = await axios.post(
      `${YOUSIGN_API_URL}/signature_requests`,
      {
        name: `Convention locative - ${signerPrenom} ${signerNom}`,
        signers: [
          {
            id: 'signer_1',
            info: {
              email: signerEmail,
              first_name: signerPrenom,
              last_name: signerNom,
            },
            signature_level: 'electronic_signature',
            signature_authentication_mode: 'otp_email',
          },
        ],
        documents: [
          {
            id: documentId,
            signers: [
              {
                id: 'signer_1',
                signer: 'signer_1',
                signature_fields: [
                  {
                    page: 1,
                    type: 'signature',
                    x: 350,
                    y: 600,
                    width: 200,
                    height: 60,
                  },
                ],
              },
            ],
          },
        ],
        timezone: 'Europe/Paris',
        message: message,
        redirect_urls: {
          success: `${process.env.NEXTAUTH_URL}/signature/success`,
          error: `${process.env.NEXTAUTH_URL}/signature/error`,
        },
        order: 'chronological',
      },
      { headers }
    );

    const signatureRequestId = signatureResponse.data.id;
    console.log('✅ Demande de signature créée:', signatureRequestId);

    const signerUrl = signatureResponse.data.signers[0]?.signature_link;
    console.log('🔗 Lien de signature:', signerUrl);

    return {
      success: true,
      signatureRequestId,
      documentId,
      signerUrl,
      status: signatureResponse.data.status,
    };
  } catch (error) {
    console.error('❌ Erreur Yousign:');
    if (error.response) {
      console.error('📊 Statut:', error.response.status);
      console.error('📊 Message:', error.response.data);
    } else {
      console.error('📊 Erreur:', error.message);
    }
    return {
      success: false,
      error: error.response?.data?.detail || error.message || 'Erreur lors de la création',
    };
  }
}

module.exports = {
  testYousignConnection,
  createSignatureRequestWithDocument,
};