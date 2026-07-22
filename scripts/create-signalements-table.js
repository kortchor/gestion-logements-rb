/**
 * Script pour créer la table `signalements` en production
 * Usage: node scripts/create-signalements-table.js
 */

const { Client } = require('pg');

async function createSignalementsTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('📋 Création de la table signalements...');

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

    console.log('✅ Table signalements créée avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createSignalementsTable();
