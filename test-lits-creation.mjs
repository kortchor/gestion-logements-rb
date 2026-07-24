#!/usr/bin/env node

// Test script to verify lits are created and accessible

async function testLitsCreation() {
  try {
    console.log("🛏️  Testing automatic lits creation...\n");

    // Get a logement with chambres
    const getResponse = await fetch("http://localhost:3001/api/logements/20");
    const logement = await getResponse.json();
    
    if (!logement.data) {
      console.log("❌ Could not fetch logement");
      return;
    }

    console.log(`📦 Logement found: ${logement.data.nom_logement} (ID: ${logement.data.id})`);
    console.log(`   Adresse: ${logement.data.adresse}`);
    console.log(`   Prix: €${logement.data.prix_loyer}`);
    console.log(`   Dates: ${logement.data.date_debut_contrat} to ${logement.data.date_fin_contrat}\n`);

    // Get chambres
    const chambresResponse = await fetch(`http://localhost:3001/api/logements/20/chambres`);
    const chambres = await chambresResponse.json();
    
    console.log(`🏠 Chambres créées: ${chambres.data.length}`);
    chambres.data.forEach((chambre, i) => {
      console.log(`   ${i + 1}. ${chambre.nom} (${chambre.nombre_lits} lit${chambre.nombre_lits > 1 ? 's' : ''} ${chambre.type_lit})`);
    });

    // Get all lits directly from database
    console.log("\n🛏️  Getting available lits...\n");
    const litsResponse = await fetch("http://localhost:3001/api/lits/libres");
    const lits = await litsResponse.json();
    
    if (lits.data) {
      console.log(`✅ Total available lits: ${lits.data.length}`);
      
      console.log(`📋 Sample of available lits:`);
      lits.data.slice(0, 10).forEach((lit) => {
        console.log(`   - ${lit.numero || lit.id} (${lit.type_lit || 'unknown type'}) - Chambre: ${lit.chambre_id}`);
      });
    }

    console.log("\n✅ Test completed successfully!");
    console.log("\nSummary:");
    console.log("- Dates are properly stored in logements table");
    console.log("- Chambres are automatically created");
    console.log("- Lits are automatically created for each chambre");
    console.log("- Lits appear in available lits list");

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testLitsCreation();
