/**
 * Script de migration pour ajouter les colonnes manquantes
 * Usage: node scripts/migrate-add-missing-columns.js
 */

const { Client } = require('pg');

async function migrateDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('📋 Migration: Ajout des colonnes manquantes...');

    // Ajouter les colonnes manquantes à la table logements
    console.log('  → logements...');
    await client.query(`
      ALTER TABLE logements
      ADD COLUMN IF NOT EXISTS nom_logement VARCHAR(255),
      ADD COLUMN IF NOT EXISTS ville VARCHAR(100),
      ADD COLUMN IF NOT EXISTS centre_analytique VARCHAR(100),
      ADD COLUMN IF NOT EXISTS est_actif BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS date_debut_contrat DATE,
      ADD COLUMN IF NOT EXISTS date_fin_contrat DATE
    `);

    // Ajouter les colonnes manquantes à la table chambres
    console.log('  → chambres...');
    await client.query(`
      ALTER TABLE chambres
      ADD COLUMN IF NOT EXISTS type_lit VARCHAR(50),
      ADD COLUMN IF NOT EXISTS nombre_lits INTEGER DEFAULT 1
    `);

    // Ajouter les colonnes manquantes à la table lits
    console.log('  → lits...');
    await client.query(`
      ALTER TABLE lits
      ADD COLUMN IF NOT EXISTS type_lit VARCHAR(50),
      ADD COLUMN IF NOT EXISTS collaborateur_id INTEGER REFERENCES collaborateurs(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS est_occupe BOOLEAN DEFAULT false
    `);

    // Ajouter les colonnes manquantes à la table collaborateurs
    console.log('  → collaborateurs...');
    await client.query(`
      ALTER TABLE collaborateurs
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user',
      ADD COLUMN IF NOT EXISTS est_actif BOOLEAN DEFAULT true
    `);

    // Ajouter les colonnes manquantes à la table baux
    console.log('  → baux...');
    await client.query(`
      ALTER TABLE baux
      ADD COLUMN IF NOT EXISTS yousign_request_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS signature_link VARCHAR(500)
    `);

    // Créer les tables manquantes
    console.log('  → parametres...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS parametres (
        id SERIAL PRIMARY KEY,
        cle VARCHAR(255) UNIQUE NOT NULL,
        valeur TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('  → notifications...');
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

    console.log('  → modeles_convention...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS modeles_convention (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(255) NOT NULL,
        contenu TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('  → signalements...');
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

    console.log('  → lit_occupants...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS lit_occupants (
        id SERIAL PRIMARY KEY,
        lit_id INTEGER REFERENCES lits(id) ON DELETE CASCADE,
        collaborateur_id INTEGER REFERENCES collaborateurs(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(lit_id, collaborateur_id)
      )
    `);

    console.log('✅ Migration complétée avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur migration:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateDatabase();
