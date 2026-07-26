/**
 * Endpoint API pour initialiser les tables manquantes
 * POST /api/init/tables
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
      logger.info({ route: '/api/init/tables' }, 'Verification et creation des tables manquantes');

      // Créer la table signalements si elle n'existe pas
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

      logger.info({ route: '/api/init/tables', table: 'signalements' }, 'Table signalements verifiee ou creee');

      return NextResponse.json({
        success: true,
        message: 'Tables initialisées avec succès',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/init/tables', method: 'POST' });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
