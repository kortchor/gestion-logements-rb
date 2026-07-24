#!/usr/bin/env node

// Debug collaborateur creation error

async function debugCreation() {
  console.log("🔍 Debugging collaborateur creation error...\n");

  const testData = {
    nom: "Test",
    prenom: "User",
    email: `test-${Date.now()}@example.com`,
    civilite: "M.",
    telephone: "+33123456789",
    genre: "M",
    date_arrivee: "2025-01-01",
    date_depart: "2026-12-31",
    date_debut_contrat: "2025-01-01",
    date_fin_contrat: "2026-12-31",
    vehicule: false,
    animal: false,
    commentaire: "Test collaborateur",
    centre_principal: "Test",
    centre_affectation: "Test",
  };

  console.log("📤 Sending request with data:", JSON.stringify(testData, null, 2));

  try {
    const response = await fetch("http://localhost:3001/api/collaborateurs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testData),
    });

    console.log("\n📥 Response Status:", response.status, response.statusText);
    
    const responseText = await response.text();
    console.log("📥 Response Body:", responseText);

    if (responseText) {
      try {
        const jsonResult = JSON.parse(responseText);
        if (jsonResult.errors) {
          console.log("\n❌ Validation Errors:");
          jsonResult.errors.forEach((err) => {
            console.log(`  - ${err.field}: ${err.message}`);
          });
        }
      } catch (e) {
        // Response might not be JSON
      }
    }
  } catch (error) {
    console.log("❌ Exception:", error.message);
  }
}

debugCreation();
