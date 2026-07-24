#!/usr/bin/env node

// Test script to verify collaborateur and logement creation

async function testCreation() {
  console.log("🧪 Testing creation endpoints...\n");

  // Test 1: Create collaborateur
  console.log("1️⃣  Testing collaborateur creation...");
  try {
    const collabResponse = await fetch("http://localhost:3001/api/collaborateurs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    });

    const collabResult = await collabResponse.json();
    if (collabResponse.ok) {
      console.log("✅ Collaborateur created successfully (ID:", collabResult.id, ")");
    } else {
      console.log("❌ Error creating collaborateur:", collabResult.error);
    }
  } catch (error) {
    console.log("❌ Exception creating collaborateur:", error.message);
  }

  console.log("\n2️⃣  Testing logement creation...");
  try {
    const logementResponse = await fetch("http://localhost:3001/api/logements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom_logement: "Test Logement",
        adresse: "123 Test Street",
        ville: "Cassis",
        type: "Appartement",
        prix_loyer: 1000,
        proprietaire: "Test Owner",
        contact_proprietaire: "owner@test.com",
        fournisseur_edf: "EDF",
        fournisseur_eau: "Eau",
        fournisseur_gaz: "GDF",
        nom_assureur: "Assureur",
        assurance: "Policy123",
        date_debut_contrat: "2025-01-01",
        date_fin_contrat: "2026-12-31",
        est_visible: true,
        mixte_autorise: false,
        description_detaillee: "Test",
        chambres: [
          {
            nom: "Chambre 1",
            type_lit: "double",
            nombre_lits: 2,
          },
          {
            nom: "Chambre 2",
            type_lit: "simple",
            nombre_lits: 1,
          },
        ],
      }),
    });

    const logementResult = await logementResponse.json();
    if (logementResponse.ok || logementResponse.status === 201) {
      console.log("✅ Logement created successfully (ID:", logementResult.id, ")");
      
      // Verify chambres were created
      console.log("\n   Checking chambres...");
      const chambresResponse = await fetch(`http://localhost:3001/api/logements/${logementResult.id}/chambres`);
      const chambresData = await chambresResponse.json();
      if (chambresData.data && chambresData.data.length > 0) {
        console.log(`   ✅ ${chambresData.data.length} chambre(s) created`);
        chambresData.data.forEach(c => {
          console.log(`      - ${c.nom} (${c.nombre_lits} lit${c.nombre_lits > 1 ? 's' : ''})`);
        });
      } else {
        console.log("   ❌ No chambres found");
      }
    } else {
      console.log("❌ Error creating logement:", logementResult.error);
    }
  } catch (error) {
    console.log("❌ Exception creating logement:", error.message);
  }

  console.log("\n3️⃣  Testing logements tableau endpoint...");
  try {
    const tableauResponse = await fetch("http://localhost:3001/api/admin/logements/tableau");
    const tableauData = await tableauResponse.json();
    if (tableauData.success) {
      let totalLogements = 0;
      if (Array.isArray(tableauData.data)) {
        totalLogements = tableauData.data.reduce((sum, ville) => sum + ville.logements.length, 0);
      }
      console.log(`✅ Tableau endpoint working (${totalLogements} logements)`);
    } else {
      console.log("❌ Tableau endpoint error:", tableauData.error);
    }
  } catch (error) {
    console.log("❌ Exception in tableau endpoint:", error.message);
  }

  console.log("\n✅ All tests completed!");
}

testCreation();
