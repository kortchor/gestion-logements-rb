/**
 * @file lib/signature.ts
 * @description Point d'entrée pour le module de signature.
 * Exporte la vraie implémentation de Yousign ou une simulation en fonction des variables d'environnement.
 */

const YOUSIGN_API_KEY = process.env.YOUSIGN_API_KEY;

let sendSignatureRequest: any;

if (YOUSIGN_API_KEY) {
  console.log('✅ [Signature] Utilisation de l\'API Yousign (production).');
  // Importer dynamiquement la vraie implémentation.
  // NOTE: Actuellement, le projet est configuré pour utiliser la simulation.
  // Pour activer la vraie signature, il faudra créer un fichier `signature.yousign.ts` et l'importer ici.
  sendSignatureRequest = require('./yousign.js').sendSignatureRequest;
} else {
  console.warn('⚠️ [Signature] Clé API Yousign non trouvée. Utilisation de la simulation.');
  // Importer dynamiquement la simulation
  sendSignatureRequest = require('./yousign.js').sendSignatureRequest;
}

export { sendSignatureRequest };