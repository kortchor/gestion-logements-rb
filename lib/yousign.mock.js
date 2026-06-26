// lib/yousign.mock.js
// Version simulée de Yousign pour les tests

async function createSignatureRequestWithDocument({
  signerEmail,
  signerNom,
  signerPrenom,
  documentContent,
  documentName,
  message = 'Veuillez signer votre convention locative',
}) {
  console.log('📄 [SIMULATION] Création d\'une demande de signature...');
  console.log(`📧 Destinataire: ${signerEmail} (${signerPrenom} ${signerNom})`);
  console.log(`📄 Document: ${documentName}`);
  
  // Simuler un délai
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Simuler un succès
  const signatureRequestId = `sim_${Date.now()}`;
  const signerUrl = `https://yousign-simulator.com/sign/${signatureRequestId}`;
  
  console.log(`✅ [SIMULATION] Demande créée: ${signatureRequestId}`);
  console.log(`🔗 [SIMULATION] Lien: ${signerUrl}`);
  
  return {
    success: true,
    signatureRequestId,
    signerUrl,
    status: 'pending',
    simulation: true,
  };
}

module.exports = {
  createSignatureRequestWithDocument,
};