const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:111876354@localhost:5432/gestion_logements"
});

async function setupDatabase() {
  try {
    await client.connect();
    console.log('🚀 Création des tables...');

    // Table des administrateurs
    await client.query(`
      CREATE TABLE IF NOT EXISTS administrateurs (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        mot_de_passe VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des logements
    await client.query(`
      CREATE TABLE IF NOT EXISTS logements (
        id SERIAL PRIMARY KEY,
        adresse TEXT NOT NULL,
        prix_loyer DECIMAL(10,2),
        proprietaire VARCHAR(255),
        contact_proprietaire VARCHAR(255),
        fournisseur_edf VARCHAR(255),
        fournisseur_eau VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des chambres
    await client.query(`
      CREATE TABLE IF NOT EXISTS chambres (
        id SERIAL PRIMARY KEY,
        logement_id INTEGER REFERENCES logements(id) ON DELETE CASCADE,
        nom VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des lits
    await client.query(`
      CREATE TABLE IF NOT EXISTS lits (
        id SERIAL PRIMARY KEY,
        chambre_id INTEGER REFERENCES chambres(id) ON DELETE CASCADE,
        numero VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des collaborateurs
    await client.query(`
      CREATE TABLE IF NOT EXISTS collaborateurs (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        date_arrivee DATE,
        date_depart DATE,
        vehicule BOOLEAN DEFAULT false,
        chien BOOLEAN DEFAULT false,
        lit_id INTEGER REFERENCES lits(id),
        clefs VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des baux
    await client.query(`
      CREATE TABLE IF NOT EXISTS baux (
        id SERIAL PRIMARY KEY,
        logement_id INTEGER REFERENCES logements(id) ON DELETE CASCADE,
        collaborateur_id INTEGER REFERENCES collaborateurs(id) ON DELETE CASCADE,
        date_debut DATE NOT NULL,
        date_fin DATE NOT NULL,
        participation_mensuelle DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des interventions
    await client.query(`
      CREATE TABLE IF NOT EXISTS interventions (
        id SERIAL PRIMARY KEY,
        logement_id INTEGER REFERENCES logements(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        statut VARCHAR(50) DEFAULT 'en_attente',
        date_demande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_resolution TIMESTAMP
      )
    `);

    console.log('✅ Tables créées avec succès !');
    
    await client.end();
  } catch (err) {
    console.error('❌ Erreur:', err.message);
  }
}

setupDatabase();