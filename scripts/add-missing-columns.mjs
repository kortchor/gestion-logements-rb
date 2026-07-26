import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL est requis pour exécuter add-missing-columns.mjs');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('🔄 Checking for missing columns in collaborateurs table...\n');

    const columnsToAdd = [
      { name: 'civilite', type: 'VARCHAR(50)' },
      { name: 'date_debut_contrat', type: 'DATE' },
      { name: 'date_fin_contrat', type: 'DATE' },
      { name: 'centre_principal', type: 'VARCHAR(100)' },
      { name: 'centre_affectation', type: 'VARCHAR(100)' },
      { name: 'animal', type: 'BOOLEAN DEFAULT false' },
      { name: 'genre', type: 'VARCHAR(10)' },
    ];

    for (const col of columnsToAdd) {
      const result = await client.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name='collaborateurs' AND column_name=$1`,
        [col.name]
      );

      if (result.rows.length === 0) {
        await client.query(`ALTER TABLE collaborateurs ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ Column '${col.name}' added to collaborateurs`);
      } else {
        console.log(`ℹ️  Column '${col.name}' already exists`);
      }
    }

    console.log('\n✅ Migration completed successfully');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
