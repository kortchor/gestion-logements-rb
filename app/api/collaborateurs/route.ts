import { query, pool } from '@/lib/db';
import { NextResponse } from 'next/server';
import { createCollaborateurSchema } from '@/lib/validation';
import { verifyCsrfMiddleware } from '@/lib/csrf';
import logger, { logError } from '@/lib/logger';
import { logAudit } from '@/lib/audit';

let collaborateursSchemaChecked = false;

async function ensureCollaborateursSchema(client: Awaited<ReturnType<typeof pool.connect>>) {
  if (collaborateursSchemaChecked) {
    return;
  }

  await client.query(`
    ALTER TABLE collaborateurs
    ADD COLUMN IF NOT EXISTS civilite VARCHAR(50),
    ADD COLUMN IF NOT EXISTS telephone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS genre VARCHAR(10),
    ADD COLUMN IF NOT EXISTS date_debut_contrat DATE,
    ADD COLUMN IF NOT EXISTS date_fin_contrat DATE,
    ADD COLUMN IF NOT EXISTS commentaire TEXT,
    ADD COLUMN IF NOT EXISTS centre_principal VARCHAR(255),
    ADD COLUMN IF NOT EXISTS centre_affectation VARCHAR(255),
    ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS est_actif BOOLEAN DEFAULT true
  `);

  collaborateursSchemaChecked = true;
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return value == null ? null : String(value);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return value == null ? null : String(value);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// ✅ GET - Récupérer tous les collaborateurs ou un seul avec ?id=
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    let queryText = `
      SELECT 
        c.id,
        c.nom,
        c.prenom,
        c.email,
        c.civilite,
        c.date_arrivee,
        c.date_depart,
        c.vehicule,
        c.est_actif,
        c.created_at
      FROM collaborateurs c`;

    const queryParams = [];

    if (id) {
      queryText += ' WHERE c.id = $1';
      queryParams.push(id);
    } else {
      queryText += ' ORDER BY c.id';
    }

    const result = await query(queryText, queryParams);
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/collaborateurs', method: 'GET' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}

// ✅ POST - Créer un collaborateur (SANS mot de passe)
export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json(
        { error: 'CSRF token invalide' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Vérifier si l'email existe déjà
    const validation = createCollaborateurSchema.validate(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', errors: validation.errors },
        { status: 400 }
      );
    }

    const validatedData = validation.data;
    const dateDepart = toNullableDate(validatedData.date_depart);
    const dateFinContrat = toNullableDate(validatedData.date_fin_contrat);

    await ensureCollaborateursSchema(client);
    await client.query('BEGIN');

    // Vérifier si l'email existe déjà
    const checkResult = await client.query(
      'SELECT id FROM collaborateurs WHERE email = $1',
      [validatedData.email]
    );

    if (checkResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Un collaborateur avec cet email existe déjà' },
        { status: 400 }
      );
    }

    // Créer le collaborateur (SANS mot de passe)
    const result = await client.query(
      `INSERT INTO collaborateurs 
       (nom, prenom, email, civilite, telephone, genre, date_arrivee, date_depart, 
        date_debut_contrat, date_fin_contrat, vehicule, animal, commentaire,
        centre_principal, centre_affectation, est_actif, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, 'user')
       RETURNING id`,
      [
        toNullableString(validatedData.nom),
        toNullableString(validatedData.prenom),
        toNullableString(validatedData.email),
        toNullableString(validatedData.civilite),
        toNullableString(validatedData.telephone),
        validatedData.genre,
        toNullableDate(validatedData.date_arrivee),
        dateDepart,
        toNullableDate(validatedData.date_debut_contrat),
        dateFinContrat,
        validatedData.vehicule,
        validatedData.animal,
        toNullableString(validatedData.commentaire),
        toNullableString(validatedData.centre_principal),
        toNullableString(validatedData.centre_affectation),
      ]
    );

    const collaborateurId = result.rows[0].id;

    // Assigner à un lit si spécifié
    if (body.lit_id) {
      const litResult = await client.query(
        'SELECT id FROM lits WHERE id = $1 AND est_occupe = false',
        [parseInt(body.lit_id)]
      );

      if (litResult.rows.length > 0) {
        await client.query(
          'UPDATE lits SET est_occupe = true, collaborateur_id = $1 WHERE id = $2',
          [collaborateurId, parseInt(body.lit_id)]
        );
      }
    }

    await client.query('COMMIT');

    await logAudit({
      action: 'create',
      entityType: 'collaborateur',
      entityId: collaborateurId,
      changes: {
        email: validatedData.email,
        nom: validatedData.nom,
        prenom: validatedData.prenom,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ success: true, id: collaborateurId }, { status: 201 });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors
    }
    if (error instanceof Error) {
      logError(error, { route: '/api/collaborateurs', method: 'POST' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la création' },
      { status: 500 }
    );
  } finally {
    try {
      client.release();
    } catch {
      // Client already released or error, ignore
    }
  }
}

// ✅ DELETE - Supprimer un collaborateur
export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json(
        { error: 'CSRF token invalide' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID du collaborateur requis' },
        { status: 400 }
      );
    }

    const collaborateurId = parseInt(id);
    if (isNaN(collaborateurId)) {
      return NextResponse.json(
        { error: 'ID du collaborateur invalide' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Vérifier que le collaborateur existe
    const collaborateurResult = await client.query(
      'SELECT id, nom, prenom FROM collaborateurs WHERE id = $1',
      [collaborateurId]
    );

    if (collaborateurResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Collaborateur non trouvé' },
        { status: 404 }
      );
    }

    const collaborateur = collaborateurResult.rows[0];

    // Vérifier s'il n'a pas de baux actifs
    const bauxResult = await client.query(
      `SELECT COUNT(*) as count FROM baux WHERE collaborateur_id = $1 AND date_fin >= CURRENT_DATE`,
      [collaborateurId]
    );

    if (parseInt(bauxResult.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Impossible de supprimer ce collaborateur. Il a des baux actifs. Veuillez d\'abord le désassigner.' },
        { status: 400 }
      );
    }

    // Libérer les lits occupés
    await client.query(
      'UPDATE lits SET est_occupe = false, collaborateur_id = NULL WHERE collaborateur_id = $1',
      [collaborateurId]
    );

    // Supprimer les baux historiques
    await client.query(
      'DELETE FROM baux WHERE collaborateur_id = $1',
      [collaborateurId]
    );

    // Supprimer le collaborateur
    await client.query(
      'DELETE FROM collaborateurs WHERE id = $1',
      [collaborateurId]
    );

    await client.query('COMMIT');

    await logAudit({
      action: 'delete',
      entityType: 'collaborateur',
      entityId: collaborateurId,
      changes: {
        nom: collaborateur.nom,
        prenom: collaborateur.prenom,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    logger.info(
      { route: '/api/collaborateurs', method: 'DELETE', collaborateurId },
      'Collaborateur supprime avec succes'
    );

    return NextResponse.json(
      { success: true, message: `${collaborateur.prenom} ${collaborateur.nom} a été supprimé avec succès` },
      { status: 200 }
    );
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors
    }
    if (error instanceof Error) {
      logError(error, { route: '/api/collaborateurs', method: 'DELETE' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du collaborateur' },
      { status: 500 }
    );
  } finally {
    try {
      client.release();
    } catch {
      // Client already released or error, ignore
    }
  }
}
