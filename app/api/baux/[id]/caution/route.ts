import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyCsrfMiddleware } from '@/lib/csrf';
import { logError } from '@/lib/logger';

let cautionSchemaChecked = false;

async function ensureCautionSchema() {
  if (cautionSchemaChecked) {
    return;
  }

  await query(`
    ALTER TABLE baux
    ADD COLUMN IF NOT EXISTS montant_caution NUMERIC,
    ADD COLUMN IF NOT EXISTS date_versement_caution DATE,
    ADD COLUMN IF NOT EXISTS date_restitution_caution DATE,
    ADD COLUMN IF NOT EXISTS statut_caution VARCHAR(50) DEFAULT 'en_attente',
    ADD COLUMN IF NOT EXISTS justificatif_caution_url TEXT,
    ADD COLUMN IF NOT EXISTS justificatif_caution_public_id TEXT,
    ADD COLUMN IF NOT EXISTS motif_retenue TEXT
  `);

  cautionSchemaChecked = true;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureCautionSchema();

    const params = await context.params;
    const bailId = parseInt(params.id);

    if (isNaN(bailId)) {
      return NextResponse.json({ error: 'ID de bail invalide' }, { status: 400 });
    }

    const result = await query(
      `SELECT 
        id,
        montant_caution,
        date_versement_caution,
        date_restitution_caution,
        statut_caution,
        justificatif_caution_url,
        justificatif_caution_public_id,
        motif_retenue,
        collaborateur_id,
        logement_id,
        date_debut,
        date_fin
      FROM baux 
      WHERE id = $1`,
      [bailId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Bail non trouvé' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/baux/[id]/caution', method: 'GET' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la caution' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureCautionSchema();

    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json({ error: 'CSRF token invalide' }, { status: 403 });
    }

    const params = await context.params;
    const bailId = parseInt(params.id);

    if (isNaN(bailId)) {
      return NextResponse.json({ error: 'ID de bail invalide' }, { status: 400 });
    }

    const body = await request.json();
    const {
      montant_caution,
      date_versement_caution,
      date_restitution_caution,
      statut_caution,
      motif_retenue,
      justificatif_caution_url,
      justificatif_caution_public_id,
    } = body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (montant_caution !== undefined) {
      updates.push(`montant_caution = $${paramIndex++}`);
      values.push(montant_caution);
    }
    if (date_versement_caution !== undefined) {
      updates.push(`date_versement_caution = $${paramIndex++}`);
      values.push(date_versement_caution || null);
    }
    if (date_restitution_caution !== undefined) {
      updates.push(`date_restitution_caution = $${paramIndex++}`);
      values.push(date_restitution_caution || null);
    }
    if (statut_caution !== undefined) {
      updates.push(`statut_caution = $${paramIndex++}`);
      values.push(statut_caution);
    }
    if (motif_retenue !== undefined) {
      updates.push(`motif_retenue = $${paramIndex++}`);
      values.push(motif_retenue);
    }
    if (justificatif_caution_url !== undefined) {
      updates.push(`justificatif_caution_url = $${paramIndex++}`);
      values.push(justificatif_caution_url);
    }
    if (justificatif_caution_public_id !== undefined) {
      updates.push(`justificatif_caution_public_id = $${paramIndex++}`);
      values.push(justificatif_caution_public_id);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      );
    }

    values.push(bailId);
    const queryText = `
      UPDATE baux 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Bail non trouvé' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/baux/[id]/caution', method: 'PUT' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la caution' },
      { status: 500 }
    );
  }
}