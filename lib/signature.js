// lib/signature.js
// Version de secours pour les signatures (sans Yousign)

/**
 * Simuler l'envoi d'une demande de signature
 */
async function sendSignatureRequest({
  signerEmail,
  signerNom,
  signerPrenom,
  documentName,
  documentContent,
}) {
  console.log('📝 [SIMULATION] Demande de signature');
  console.log(`👤 Destinataire: ${signerPrenom} ${signerNom} (${signerEmail})`);
  console.log(`📄 Document: ${documentName}`);
  
  // Simuler un délai
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const signatureId = `sim_${Date.now()}`;
  const signatureLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/simulation/signature/${signatureId}`;
  
  console.log('🔗 Lien de signature (simulé):', signatureLink);
  
  return {
    success: true,
    signatureId,
    signatureLink,
    message: 'Demande de signature envoyée (simulation)',
  };
}

/**
 * Vérifier le statut d'une signature simulée
 */
async function checkSignatureStatus(signatureId) {
  return {
    success: true,
    status: 'completed',
    message: 'Signature effectuée (simulation)',
  };
}

module.exports = {
  sendSignatureRequest,
  checkSignatureStatus,
};