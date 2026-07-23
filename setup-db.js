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
        nom_logement VARCHAR(255),
        adresse TEXT NOT NULL,
        ville VARCHAR(100),
        prix_loyer DECIMAL(10,2),
        proprietaire VARCHAR(255),
        contact_proprietaire VARCHAR(255),
        fournisseur_edf VARCHAR(255),
        fournisseur_eau VARCHAR(255),
        centre_analytique VARCHAR(100),
        date_debut_contrat DATE,
        date_fin_contrat DATE,
        est_actif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des chambres
    await client.query(`
      CREATE TABLE IF NOT EXISTS chambres (
        id SERIAL PRIMARY KEY,
        logement_id INTEGER REFERENCES logements(id) ON DELETE CASCADE,
        nom VARCHAR(100) NOT NULL,
        type_lit VARCHAR(50),
        nombre_lits INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des lits
    await client.query(`
      CREATE TABLE IF NOT EXISTS lits (
        id SERIAL PRIMARY KEY,
        chambre_id INTEGER REFERENCES chambres(id) ON DELETE CASCADE,
        numero VARCHAR(50) NOT NULL,
        type_lit VARCHAR(50),
        collaborateur_id INTEGER REFERENCES collaborateurs(id) ON DELETE SET NULL,
        est_occupe BOOLEAN DEFAULT false,
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
        civilite VARCHAR(10),
        date_arrivee DATE,
        date_depart DATE,
        vehicule BOOLEAN DEFAULT false,
        chien BOOLEAN DEFAULT false,
        lit_id INTEGER REFERENCES lits(id),
        clefs VARCHAR(50),
        role VARCHAR(50) DEFAULT 'user',
        est_actif BOOLEAN DEFAULT true,
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
        yousign_request_id VARCHAR(255),
        signature_link VARCHAR(500),
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

    // Table des signalements (problèmes reportés par les collaborateurs)
    await client.query(`
      CREATE TABLE IF NOT EXISTS signalements (
        id SERIAL PRIMARY KEY,
        collaborateur_id INTEGER REFERENCES collaborateurs(id) ON DELETE CASCADE,
        sujet VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        statut VARCHAR(50) DEFAULT 'en_attente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des paramètres de configuration
    await client.query(`
      CREATE TABLE IF NOT EXISTS parametres (
        id SERIAL PRIMARY KEY,
        cle VARCHAR(255) UNIQUE NOT NULL,
        valeur TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des notifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        collaborateur_id INTEGER REFERENCES collaborateurs(id) ON DELETE CASCADE,
        type VARCHAR(100),
        titre VARCHAR(255),
        message TEXT,
        lu BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table d'audit trail pour tracer les actions
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_trail (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES collaborateurs(id) ON DELETE SET NULL,
        user_email VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id INTEGER,
        changes JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des modèles de convention
    await client.query(`
      CREATE TABLE IF NOT EXISTS modeles_convention (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(255) NOT NULL,
        contenu TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table pour gérer les occupants des lits (many-to-many)
    // Permet à un lit d'avoir plusieurs collaborateurs (ex: couples)
    await client.query(`
      CREATE TABLE IF NOT EXISTS lit_occupants (
        id SERIAL PRIMARY KEY,
        lit_id INTEGER REFERENCES lits(id) ON DELETE CASCADE,
        collaborateur_id INTEGER REFERENCES collaborateurs(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(lit_id, collaborateur_id)
      )
    `);

    console.log('✅ Tables créées avec succès !');
    
    await client.end();
  } catch (err) {
    console.error('❌ Erreur:', err.message);
  }
}

setupDatabase();