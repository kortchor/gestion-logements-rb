// scripts/test-yousign.js
// Test de connexion à l'API Yousign

require('dotenv').config();
const { testYousignConnection } = require('../lib/yousign.js');

async function test() {
  console.log('🔍 Test de connexion à Yousign...');
  console.log('🔑 Clé API:', process.env.YOUSIGN_API_KEY ? '✅ Présente' : '❌ Manquante');
  console.log('---');
  
  const result = await testYousignConnection();
  
  if (result.success) {
    console.log('✅ Connexion Yousign réussie !');
  } else {
    console.log('❌ Échec de connexion:', result.error);
  }
}

test();