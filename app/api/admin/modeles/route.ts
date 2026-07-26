import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdminAuth } from '@/lib/api-helpers';
import { verifyCsrfMiddleware } from '@/lib/csrf';
import { logError } from '@/lib/logger';

// GET - Récupérer tous les modèles
const getHandler = async () => {
  try {
    const result = await query(`
      SELECT * FROM modeles_convention
      WHERE est_actif = true
      ORDER BY nom
    `);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/modeles', method: 'GET' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
};

// POST - Créer un modèle
const postHandler = async (request: NextRequest) => {
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json({ error: 'CSRF token invalide' }, { status: 403 });
    }

    const body = await request.json();
    const { nom, description, contenu } = body;

    if (!nom || !contenu) {
      return NextResponse.json(
        { error: 'Nom et contenu sont requis' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO modeles_convention (nom, description, contenu, est_actif)
       VALUES ($1, $2, $3, true)
       RETURNING id`,
      [nom, description || null, contenu]
    );

    return NextResponse.json({ success: true, id: result.rows[0].id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/modeles', method: 'POST' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la création' },
      { status: 500 }
    );
  }
};

// PUT - Modifier un modèle
const putHandler = async (request: NextRequest) => {
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json({ error: 'CSRF token invalide' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    const { nom, description, contenu } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID du modèle requis' },
        { status: 400 }
      );
    }

    if (!nom || !contenu) {
      return NextResponse.json(
        { error: 'Nom et contenu sont requis' },
        { status: 400 }
      );
    }

    await query(
      `UPDATE modeles_convention
       SET nom = $1, description = $2, contenu = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [nom, description || null, contenu, parseInt(id)]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/modeles', method: 'PUT' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
};

// DELETE - Supprimer un modèle (désactivation)
const deleteHandler = async (request: NextRequest) => {
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json({ error: 'CSRF token invalide' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID du modèle requis' },
        { status: 400 }
      );
    }

    await query(
      'UPDATE modeles_convention SET est_actif = false WHERE id = $1',
      [parseInt(id)]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/modeles', method: 'DELETE' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
};

export const GET = withSuperAdminAuth(getHandler);
export const POST = withSuperAdminAuth(postHandler);
export const PUT = withSuperAdminAuth(putHandler);
export const DELETE = withSuperAdminAuth(deleteHandler);