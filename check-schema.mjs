import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:111876354@localhost:5432/gestion_logements',
});

async function checkSchema() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking collaborateurs table schema...\n');

    // Get all columns
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='collaborateurs' 
      ORDER BY ordinal_position
    `);

    console.log('✅ Colonnes de la table collaborateurs:');
    result.rows.forEach((row, idx) => {
      const exists = row.column_name === 'civilite' ? ' ✓ FOUND' : '';
      console.log(`  ${idx + 1}. ${row.column_name} (${row.data_type})${exists}`);
    });

    // Check if civilite exists
    const civiliteExists = result.rows.some(r => r.column_name === 'civilite');
    console.log(`\n${civiliteExists ? '✅' : '❌'} Colonne 'civilite': ${civiliteExists ? 'EXISTE' : 'MANQUANTE'}`);

    if (!civiliteExists) {
      console.log('\n⚠️  La migration N\'a PAS été appliquée! En cours de correction...\n');
      await client.query('ALTER TABLE collaborateurs ADD COLUMN civilite VARCHAR(50)');
      console.log('✅ Colonne civilite ajoutée');
    }
  } catch (err) {
    console.error('❌ Erreur:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();
