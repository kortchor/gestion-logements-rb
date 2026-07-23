/**
 * Endpoint API pour exécuter les migrations de base de données
 * POST /api/init/migrate
 * Protégé par clé secrète pour éviter les abus
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Vérifier la clé secrète
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.INIT_SECRET_KEY;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const client = await pool.connect();

    try {
      console.log('📋 Exécution des migrations...');

      // Ajouter les colonnes manquantes à logements
      await client.query(`
        ALTER TABLE logements
        ADD COLUMN IF NOT EXISTS nom_logement VARCHAR(255),
        ADD COLUMN IF NOT EXISTS ville VARCHAR(100),
        ADD COLUMN IF NOT EXISTS centre_analytique VARCHAR(100),
        ADD COLUMN IF NOT EXISTS est_actif BOOLEAN DEFAULT true
      `);
      console.log('  ✓ logements');

      // Ajouter les colonnes manquantes à chambres
      await client.query(`
        ALTER TABLE chambres
        ADD COLUMN IF NOT EXISTS type_lit VARCHAR(50),
        ADD COLUMN IF NOT EXISTS nombre_lits INTEGER DEFAULT 1
      `);
      console.log('  ✓ chambres');

      // Ajouter les colonnes manquantes à lits
      await client.query(`
        ALTER TABLE lits
        ADD COLUMN IF NOT EXISTS type_lit VARCHAR(50),
        ADD COLUMN IF NOT EXISTS collaborateur_id INTEGER REFERENCES collaborateurs(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS est_occupe BOOLEAN DEFAULT false
      `);
      console.log('  ✓ lits');

      // Ajouter les colonnes manquantes à collaborateurs
      await client.query(`
        ALTER TABLE collaborateurs
        ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user',
        ADD COLUMN IF NOT EXISTS est_actif BOOLEAN DEFAULT true
      `);
      console.log('  ✓ collaborateurs');

      // Ajouter les colonnes manquantes à baux
      await client.query(`
        ALTER TABLE baux
        ADD COLUMN IF NOT EXISTS yousign_request_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS signature_link VARCHAR(500)
      `);
      console.log('  ✓ baux');

      // Créer les tables manquantes
      await client.query(`
        CREATE TABLE IF NOT EXISTS parametres (
          id SERIAL PRIMARY KEY,
          cle VARCHAR(255) UNIQUE NOT NULL,
          valeur TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('  ✓ parametres');

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
      console.log('  ✓ notifications');

      await client.query(`
        CREATE TABLE IF NOT EXISTS modeles_convention (
          id SERIAL PRIMARY KEY,
          nom VARCHAR(255) NOT NULL,
          contenu TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('  ✓ modeles_convention');

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
      console.log('  ✓ signalements');

      await client.query(`
        CREATE TABLE IF NOT EXISTS lit_occupants (
          id SERIAL PRIMARY KEY,
          lit_id INTEGER REFERENCES lits(id) ON DELETE CASCADE,
          collaborateur_id INTEGER REFERENCES collaborateurs(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(lit_id, collaborateur_id)
        )
      `);
      console.log('  ✓ lit_occupants');

      return NextResponse.json({
        success: true,
        message: 'Migrations exécutées avec succès',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Erreur migration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
