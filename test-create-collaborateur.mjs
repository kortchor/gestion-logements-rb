#!/usr/bin/env node

// Test script to create collaborateurs directly via API
const testData = [
  {
    nom: 'Dupont',
    prenom: 'Jean',
    email: `test-dupont-${Date.now()}@roches.fr`,
    civilite: 'M.',
    telephone: '0610203040',
    genre: 'M',
    date_arrivee: '2026-07-24',
    date_debut_contrat: '2026-07-24',
    centre_principal: 'AGRH',
    centre_affectation: 'AGFI',
    vehicule: false,
    animal: false,
    commentaire: 'Test auto-créé'
  },
  {
    nom: 'Martin',
    prenom: 'Sophie',
    email: `test-martin-${Date.now()}@roches.fr`,
    civilite: 'Mme',
    telephone: '0620304050',
    genre: 'F',
    date_arrivee: '2026-08-01',
    date_debut_contrat: '2026-08-01',
    centre_principal: 'Direction Technique',
    centre_affectation: 'Hébergement',
    vehicule: true,
    animal: false,
    commentaire: ''
  }
];

async function testCreate() {
  console.log('🧪 Test CREATE Collaborateurs via API\n');
  
  for (const data of testData) {
    console.log(`📝 Testing: ${data.prenom} ${data.nom}`);
    console.log(`   Email: ${data.email}`);
    
    try {
      const response = await fetch('http://localhost:3000/api/collaborateurs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`   ✅ SUCCESS: Created with ID ${result.id}\n`);
      } else {
        console.log(`   ❌ VALIDATION ERROR (${response.status}):`);
        console.log(`      ${JSON.stringify(result.error)}`);
        if (result.errors) {
          result.errors.forEach(e => {
            console.log(`      - ${e.field}: ${e.message}`);
          });
        }
        console.log();
      }
    } catch (err) {
      console.log(`   ❌ NETWORK ERROR: ${err.message}\n`);
    }
  }
}

testCreate();
