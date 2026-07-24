#!/usr/bin/env node

// Test script to create a new logement with dates

const testLogement = {
  nom_logement: "Test Logement Dates",
  adresse: "123 Rue de Test",
  ville: "Cassis",
  type: "Appartement",
  prix_loyer: 1000,
  proprietaire: "Test Owner",
  contact_proprietaire: "owner@test.com",
  fournisseur_edf: "EDF Test",
  fournisseur_eau: "Eau Test",
  fournisseur_gaz: "GDF Test",
  nom_assureur: "Assureur Test",
  assurance: "Policy123",
  date_debut_contrat: "2025-01-01",
  date_fin_contrat: "2026-12-31",
  est_visible: true,
  mixte_autorise: true,
  description_detaillee: "Test logement avec dates",
  chambres: [
    {
      nom: "Chambre 1",
      type_lit: "double",
      nombre_lits: 2
    },
    {
      nom: "Chambre 2",
      type_lit: "simple",
      nombre_lits: 1
    }
  ]
};

async function testCreateLogement() {
  try {
    console.log("📝 Testing new logement creation with dates...");
    console.log("Payload:", JSON.stringify(testLogement, null, 2));

    const response = await fetch("http://localhost:3001/api/logements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testLogement),
    });

    const result = await response.json();
    console.log("\n✅ Response:", JSON.stringify(result, null, 2));
    
    if ((response.ok || response.status === 201) && result.id) {
      console.log(`\n🎉 Logement created successfully with ID: ${result.id}`);
      
      // Now test if we can fetch it back
      console.log("\n📥 Fetching created logement...");
      const getResponse = await fetch(`http://localhost:3001/api/logements/${result.id}`);
      const getResult = await getResponse.json();
      console.log("Fetched data:", JSON.stringify(getResult.data, null, 2));
      
      // Verify dates are saved
      if (getResult.data && getResult.data.date_debut_contrat && getResult.data.date_fin_contrat) {
        console.log("\n✅ Dates saved successfully!");
        console.log(`   Start date: ${getResult.data.date_debut_contrat}`);
        console.log(`   End date: ${getResult.data.date_fin_contrat}`);
      } else {
        console.log("\n⚠️  Dates not saved");
      }
      
      // Test monthly-cost endpoint
      console.log("\n💰 Testing monthly-cost endpoint...");
      const costResponse = await fetch("http://localhost:3001/api/logements/monthly-cost?year=2025&month=1");
      const costResult = await costResponse.json();
      console.log("Monthly cost data:", JSON.stringify(costResult, null, 2));
      
      if (costResult.data && costResult.data.logements && costResult.data.logements.length > 0) {
        const found = costResult.data.logements.find(l => l.id === result.id);
        if (found) {
          console.log("\n✅ New logement appears in monthly-cost endpoint!");
          console.log(`   Cost for January 2025: €${found.cout_loyer_mois}`);
        } else {
          console.log("\n⚠️  New logement NOT found in monthly-cost endpoint");
        }
      } else {
        console.log("\n⚠️  No logements found in monthly-cost endpoint");
      }
      
      // Check if lits were created
      console.log("\n🛏️  Checking if lits were created...");
      const chambres = await fetch(`http://localhost:3001/api/logements/${result.id}/chambres`);
      const chambresData = await chambres.json();
      console.log("Chambres and Lits:", JSON.stringify(chambresData, null, 2));
      
    } else {
      console.log("\n❌ Failed to create logement");
      console.log("Status:", response.status);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testCreateLogement();
