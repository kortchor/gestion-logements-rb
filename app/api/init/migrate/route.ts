/**
 * Endpoint API pour exécuter les migrations de base de données
 * POST /api/init/migrate
 * Protégé par clé secrète pour éviter les abus
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import logger, { logError } from '@/lib/logger';

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
      logger.info({ route: '/api/init/migrate' }, 'Execution des migrations');

      // Ajouter les colonnes manquantes à logements
      await client.query(`
        ALTER TABLE logements
        ADD COLUMN IF NOT EXISTS nom_logement VARCHAR(255),
        ADD COLUMN IF NOT EXISTS ville VARCHAR(100),
        ADD COLUMN IF NOT EXISTS centre_analytique VARCHAR(100),
        ADD COLUMN IF NOT EXISTS est_actif BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS date_debut_contrat DATE,
        ADD COLUMN IF NOT EXISTS date_fin_contrat DATE
      `);
      logger.info({ route: '/api/init/migrate', step: 'logements' }, 'Migration logements terminee');

      // Ajouter les colonnes manquantes à chambres
      await client.query(`
        ALTER TABLE chambres
        ADD COLUMN IF NOT EXISTS type_lit VARCHAR(50),
        ADD COLUMN IF NOT EXISTS nombre_lits INTEGER DEFAULT 1
      `);
      logger.info({ route: '/api/init/migrate', step: 'chambres' }, 'Migration chambres terminee');

      // Ajouter les colonnes manquantes à lits
      await client.query(`
        ALTER TABLE lits
        ADD COLUMN IF NOT EXISTS type_lit VARCHAR(50),
        ADD COLUMN IF NOT EXISTS collaborateur_id INTEGER REFERENCES collaborateurs(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS est_occupe BOOLEAN DEFAULT false
      `);
      logger.info({ route: '/api/init/migrate', step: 'lits' }, 'Migration lits terminee');

      // Ajouter les colonnes manquantes à collaborateurs
      await client.query(`
        ALTER TABLE collaborateurs
        ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user',
        ADD COLUMN IF NOT EXISTS est_actif BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS civilite VARCHAR(10)
      `);
      logger.info({ route: '/api/init/migrate', step: 'collaborateurs' }, 'Migration collaborateurs terminee');

      // Ajouter les colonnes manquantes à baux
      await client.query(`
        ALTER TABLE baux
        ADD COLUMN IF NOT EXISTS yousign_request_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS signature_link VARCHAR(500)
      `);
      logger.info({ route: '/api/init/migrate', step: 'baux' }, 'Migration baux terminee');

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
      logger.info({ route: '/api/init/migrate', step: 'parametres' }, 'Table parametres verifiee');

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
      logger.info({ route: '/api/init/migrate', step: 'notifications' }, 'Table notifications verifiee');

      await client.query(`
        CREATE TABLE IF NOT EXISTS modeles_convention (
          id SERIAL PRIMARY KEY,
          nom VARCHAR(255) NOT NULL,
          contenu TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      logger.info({ route: '/api/init/migrate', step: 'modeles_convention' }, 'Table modeles_convention verifiee');

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
      logger.info({ route: '/api/init/migrate', step: 'signalements' }, 'Table signalements verifiee');

      await client.query(`
        CREATE TABLE IF NOT EXISTS lit_occupants (
          id SERIAL PRIMARY KEY,
          lit_id INTEGER REFERENCES lits(id) ON DELETE CASCADE,
          collaborateur_id INTEGER REFERENCES collaborateurs(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(lit_id, collaborateur_id)
        )
      `);
      logger.info({ route: '/api/init/migrate', step: 'lit_occupants' }, 'Table lit_occupants verifiee');

      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_trail (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES collaborateurs(id) ON DELETE SET NULL,
          user_email VARCHAR(255),
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100),
          entity_id INTEGER,
          changes JSONB,
          ip_address VARCHAR(45),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      logger.info({ route: '/api/init/migrate', step: 'audit_trail' }, 'Table audit_trail verifiee');

      return NextResponse.json({
        success: true,
        message: 'Migrations exécutées avec succès',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/init/migrate', method: 'POST' });
    }
    return NextResponse.json(
      { error: 'Erreur interne lors de la migration' },
      { status: 500 }
    );
  }
}
