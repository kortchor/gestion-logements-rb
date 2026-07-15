import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:111876354@localhost:5432/gestion_logements",
});

async function main() {
  const client = await pool.connect();
  try {
    // Check/add signature_token column
    const check1 = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='baux' AND column_name='signature_token'"
    );
    if (check1.rows.length === 0) {
      await client.query('ALTER TABLE baux ADD COLUMN signature_token VARCHAR(255) DEFAULT NULL');
      console.log('✅ Colonne signature_token ajoutée à baux');
    } else {
      console.log('ℹ️  Colonne signature_token existe déjà');
    }

    // Check/add pdf_convention_url column  
    const check2 = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='baux' AND column_name='pdf_convention_url'"
    );
    if (check2.rows.length === 0) {
      await client.query('ALTER TABLE baux ADD COLUMN pdf_convention_url VARCHAR(500) DEFAULT NULL');
      console.log('✅ Colonne pdf_convention_url ajoutée à baux');
    } else {
      console.log('ℹ️  Colonne pdf_convention_url existe déjà');
    }

    console.log('✅ Migration terminée avec succès');
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
