const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:111876354@localhost:5432/gestion_logements",
});

async function main() {
  const client = await pool.connect();
  try {
    const check1 = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='logements' AND column_name='est_actif'"
    );
    if (check1.rows.length === 0) {
      await client.query('ALTER TABLE logements ADD COLUMN est_actif BOOLEAN DEFAULT true');
      console.log('✅ Colonne est_actif ajoutée à logements');
    } else {
      console.log('ℹ️  Colonne est_actif existe déjà');
    }
    console.log('✅ Migration terminée');
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
