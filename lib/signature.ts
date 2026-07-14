/**
 * @file lib/signature.ts
 * @description Point d'entrée pour le module de signature.
 * Exporte la vraie implémentation de Yousign ou une simulation en fonction des variables d'environnement.
 */

const YOUSIGN_API_KEY = process.env.YOUSIGN_API_KEY;

let sendSignatureRequest: any;

if (YOUSIGN_API_KEY) {
  console.log('✅ [Signature] Utilisation de l\'API Yousign (production).');
  // Importer dynamiquement la vraie implémentation
  sendSignatureRequest = require('./signature.yousign').sendSignatureRequest;
} else {
  console.warn('⚠️ [Signature] Clé API Yousign non trouvée. Utilisation de la simulation.');
  // Importer dynamiquement la simulation
  sendSignatureRequest = require('./signature.mock').sendSignatureRequest;
}

export { sendSignatureRequest };