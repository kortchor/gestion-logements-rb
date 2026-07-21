const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Lire le fichier de migration
const migrationPath = path.join(__dirname, 'migration-yousign-20260721.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

// Créer le client PostgreSQL
const client = new Client({
  user: 'postgres',
  password: '111876354',
  host: 'localhost',
  port: 5432,
  database: 'gestion_logements',
});

async function runMigration() {
  try {
    console.log('🔄 Connexion à la base de données...');
    await client.connect();
    console.log('✅ Connecté à PostgreSQL');

    console.log('\n🔄 Exécution de la migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration exécutée avec succès');

    // Vérifier que les colonnes ont été ajoutées
    console.log('\n🔄 Vérification des colonnes...');
    const result = await client.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'baux' 
       AND column_name IN ('yousign_request_id', 'signature_status')
       ORDER BY column_name`
    );

    if (result.rows.length === 2) {
      console.log('✅ Les colonnes ont été ajoutées avec succès:');
      result.rows.forEach(row => console.log(`   - ${row.column_name}`));
    } else {
      console.log('⚠️ Certaines colonnes n\'ont pas été trouvées');
    }

    console.log('\n✅ Migration terminée avec succès!');
  } catch (err) {
    console.error('❌ Erreur lors de la migration:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
