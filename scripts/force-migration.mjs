import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:111876354@localhost:5432/gestion_logements",
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('🔍 Vérification des colonnes...');
    
    // Vérifier toutes les colonnes de baux
    const bauxSchema = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='baux' ORDER BY ordinal_position"
    );
    console.log('📋 Colonnes baux:', bauxSchema.rows.map(r => r.column_name).join(', '));
    
    const bauxCols = bauxSchema.rows.map(r => r.column_name);
    
    // Ajouter celles qui manquent
    if (!bauxCols.includes('signature_token')) {
      await client.query('ALTER TABLE baux ADD COLUMN signature_token VARCHAR(255) DEFAULT NULL');
      console.log('✅ signature_token ajoutée');
    }
    if (!bauxCols.includes('pdf_convention_url')) {
      await client.query('ALTER TABLE baux ADD COLUMN pdf_convention_url VARCHAR(500) DEFAULT NULL');
      console.log('✅ pdf_convention_url ajoutée');
    }
    if (!bauxCols.includes('date_signature')) {
      await client.query('ALTER TABLE baux ADD COLUMN date_signature TIMESTAMP DEFAULT NULL');
      console.log('✅ date_signature ajoutée');
    }
    
    // Vérifier les colonnes logements
    const logSchema = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='logements' ORDER BY ordinal_position"
    );
    console.log('📋 Colonnes logements:', logSchema.rows.map(r => r.column_name).join(', '));
    
    const logCols = logSchema.rows.map(r => r.column_name);
    if (!logCols.includes('est_actif')) {
      await client.query('ALTER TABLE logements ADD COLUMN est_actif BOOLEAN DEFAULT true');
      console.log('✅ est_actif ajoutée à logements');
    }
    
    console.log('✅ Migration terminée avec succès');
  } catch (err) {
    console.error('❌ Erreur:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
