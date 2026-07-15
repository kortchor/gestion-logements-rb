import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

/**
 * API de migration à appeler UNE FOIS après le déploiement sur Vercel.
 * URL: GET https://ton-domaine.vercel.app/api/migrate
 */
export async function GET() {
  const client = await pool.connect();
  const logs: string[] = [];

  try {
    logs.push('🔍 Vérification des colonnes...');

    // --- TABLE baux ---
    const bauxCols = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='baux'"
    );
    const bauxNames = bauxCols.rows.map((r: any) => r.column_name);
    logs.push(`📋 baux: ${bauxNames.join(', ')}`);

    if (!bauxNames.includes('signature_token')) {
      await client.query('ALTER TABLE baux ADD COLUMN signature_token VARCHAR(255) DEFAULT NULL');
      logs.push('✅ signature_token ajoutée à baux');
    }
    if (!bauxNames.includes('pdf_convention_url')) {
      await client.query('ALTER TABLE baux ADD COLUMN pdf_convention_url VARCHAR(500) DEFAULT NULL');
      logs.push('✅ pdf_convention_url ajoutée à baux');
    }
    if (!bauxNames.includes('date_signature')) {
      await client.query('ALTER TABLE baux ADD COLUMN date_signature TIMESTAMP DEFAULT NULL');
      logs.push('✅ date_signature ajoutée à baux');
    }

    // --- TABLE logements ---
    const logCols = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='logements'"
    );
    const logNames = logCols.rows.map((r: any) => r.column_name);
    logs.push(`📋 logements: ${logNames.join(', ')}`);

    if (!logNames.includes('est_actif')) {
      await client.query('ALTER TABLE logements ADD COLUMN est_actif BOOLEAN DEFAULT true');
      logs.push('✅ est_actif ajoutée à logements');
    }

    logs.push('✅ Migration terminée avec succès');
    return NextResponse.json({ success: true, logs });

  } catch (error: any) {
    logs.push(`❌ Erreur: ${error.message}`);
    return NextResponse.json({ success: false, error: error.message, logs }, { status: 500 });

  } finally {
    client.release();
  }
}
