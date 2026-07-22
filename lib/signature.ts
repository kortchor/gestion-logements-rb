/**
 * @file lib/signature.ts
 * @description Module de signature utilisant le vrai client Yousign V3
 */

import youSignClient from './yousign-client';

/**
 * Wrapper pour créer une demande de signature Yousign
 */
export async function sendSignatureRequest(options: {
  signerEmail: string;
  signerName: string;
  documentContent: Buffer;
  documentName: string;
  message?: string;
}) {
  console.log('📝 [Signature] Création demande via Yousign V3...');
  
  try {
    const result = await youSignClient.createSignatureRequest({
      signerEmail: options.signerEmail,
      signerName: options.signerName,
      documentContent: options.documentContent,
      documentName: options.documentName,
      message: options.message,
    });

    if (!result.success) {
      throw new Error(result.error || 'Erreur Yousign');
    }

    return {
      success: true,
      signatureRequestId: result.signatureRequestId,
      signatureLink: result.signatureLink,
      signerUrl: result.signerUrl,
    };
  } catch (error) {
    console.error('❌ [Signature] Erreur:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}