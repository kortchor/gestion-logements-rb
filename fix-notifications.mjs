import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:111876354@localhost:5432/gestion_logements'
});

async function fixNotifications() {
  const client = await pool.connect();
  try {
    // Check if created_at exists
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='notifications' AND column_name='created_at'
    `);
    
    if (result.rows.length === 0) {
      console.log('⚠️  Colonne created_at manquante dans notifications, ajout...');
      await client.query(`
        ALTER TABLE notifications 
        ADD COLUMN created_at TIMESTAMP DEFAULT NOW()
      `);
      console.log('✅ Colonne created_at ajoutée');
    } else {
      console.log('✅ Colonne created_at existe déjà');
    }
    
    // Show all columns
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='notifications'
      ORDER BY ordinal_position
    `);
    console.log('\n📋 Colonnes de notifications:');
    cols.rows.forEach((col, i) => {
      console.log(`  ${i+1}. ${col.column_name} (${col.data_type})`);
    });
  } finally {
    client.release();
    await pool.end();
  }
}

fixNotifications().catch(console.error);
