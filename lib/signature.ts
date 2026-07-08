/**
 * @file Ce fichier gère l'intégration avec l'API de signature électronique Yousign.
 */
import { Buffer } from 'buffer';

const YOUSIGN_API_KEY = process.env.YOUSIGN_API_KEY;
const YOUSIGN_API_URL = process.env.YOUSIGN_API_URL || 'https://api.yousign.com';

if (!YOUSIGN_API_KEY) {
  console.warn('⚠️ La clé API Yousign (YOUSIGN_API_KEY) n\'est pas configurée. La signature électronique ne fonctionnera pas.');
}

export async function sendSignatureRequest({
  documentContent,
  documentName = 'document.pdf',
  signerEmail,
  signerNom,
  signerPrenom,
}: {
  documentContent: Buffer;
  documentName?: string;
  signerEmail: string;
  signerNom: string;
  signerPrenom: string;
}) {
  if (!YOUSIGN_API_KEY) {
    throw new Error("La clé d'API Yousign n'est pas configurée.");
  }

  console.log(`📤 [Yousign] Initialisation de la demande de signature pour ${signerEmail}`);

  const body = {
    name: `Convention - ${signerPrenom} ${signerNom}`,
    delivery_mode: 'email',
    documents: [
      {
        name: documentName,
        content: documentContent.toString('base64'), // Le document doit être en Base64
      },
    ],
    signers: [
      {
        info: {
          first_name: signerPrenom,
          last_name: signerNom,
          email: signerEmail,
        },
        fields: [
          {
            type: 'signature',
            document_id: 0, // Index du document dans le tableau `documents`
            page: 1, // La page où placer la signature (à ajuster si besoin)
            x: 400, // Position X (à ajuster)
            y: 100, // Position Y (à ajuster)
          },
        ],
        signature_level: 'electronic_signature',
        signature_authentication_mode: 'otp_email',
      },
    ],
  };

  const response = await fetch(`${YOUSIGN_API_URL}/v3/signature_requests`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${YOUSIGN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ [Yousign] Erreur API:', errorData);
    throw new Error(`Erreur Yousign: ${errorData.detail || response.statusText}`);
  }

  const signatureRequest = await response.json();
  console.log(`✅ [Yousign] Demande de signature créée avec l'ID: ${signatureRequest.id}`);

  // Le lien de signature est directement dans l'objet du signataire
  return {
    success: true,
    signatureLink: signatureRequest.signers[0].url,
    requestId: signatureRequest.id,
  };
}