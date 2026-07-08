/**
 * Fichier placeholder pour la logique de signature électronique.
 * La logique réelle d'intégration avec Yousign devra être implémentée ici.
 */

export async function sendSignatureRequest({
  signerEmail,
  signerNom,
  signerPrenom,
  documentContent,
  documentName,
  message,
}: {
  signerEmail: string;
  signerNom: string;
  signerPrenom: string;
  documentContent?: string;
  documentName?: string;
  message?: string;
}) {
  console.log('📤 [Signature] Simulation de signature');
  console.log('👤 Signataire:', signerPrenom, signerNom);
  console.log('📧 Email:', signerEmail);
  console.log('📄 Document:', documentName || 'Convention');

  // Simuler un lien de signature
  const signatureLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/signature/simulation?email=${encodeURIComponent(signerEmail)}&nom=${encodeURIComponent(signerNom)}&prenom=${encodeURIComponent(signerPrenom)}`;

  return {
    success: true,
    signatureLink,
    requestId: `sim-${Date.now()}`,
  };
}