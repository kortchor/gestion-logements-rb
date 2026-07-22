// scripts/test-yousign.js
// Test de configuration Yousign V3

require('dotenv').config();

async function test() {
  console.log('🔍 Test de configuration Yousign V3...');
  console.log('');
  console.log('Variables d\'environnement :');
  console.log('  YOUSIGN_API_KEY:', process.env.YOUSIGN_API_KEY ? '✅ Présente' : '❌ Manquante');
  console.log('  YOUSIGN_WORKSPACE_ID:', process.env.YOUSIGN_WORKSPACE_ID ? '✅ Présente' : '❌ Manquante');
  console.log('  YOUSIGN_ENVIRONMENT:', process.env.YOUSIGN_ENVIRONMENT || 'sandbox (défaut)');
  console.log('');
  
  // Importer le client (il affichera son propre message d'initialisation)
  const youSignClient = require('../lib/yousign-client').default;
  
  if (youSignClient) {
    console.log('✅ Client Yousign chargé avec succès');
  } else {
    console.log('❌ Impossible de charger le client Yousign');
  }
}

test();