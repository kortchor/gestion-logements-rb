import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdminAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { verifyCsrfMiddleware } from '@/lib/csrf';
import { logError } from '@/lib/logger';

// GET - Récupérer un paramètre
const getHandler = async (request: NextRequest, payload: TokenPayload) => {
  void payload;
  try {
    const { searchParams } = new URL(request.url);
    const cle = searchParams.get('cle');

    if (!cle) {
      return NextResponse.json(
        { error: 'Clé du paramètre requise' },
        { status: 400 }
      );
    }

    const result = await query(
      'SELECT cle, valeur FROM parametres WHERE cle = $1',
      [cle]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Paramètre non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/parametres', method: 'GET' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
};

// PUT - Mettre à jour un paramètre (Super Admin uniquement)
const putHandler = async (request: NextRequest, payload: TokenPayload) => {
  void payload;
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json({ error: 'CSRF token invalide' }, { status: 403 });
    }

    const body = await request.json();
    const { cle, valeur } = body;

    if (!cle || valeur === undefined) {
      return NextResponse.json(
        { error: 'Clé et valeur requises' },
        { status: 400 }
      );
    }

    await query(
      `INSERT INTO parametres (cle, valeur, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (cle) 
       DO UPDATE SET valeur = EXCLUDED.valeur, updated_at = CURRENT_TIMESTAMP`,
      [cle, valeur]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/parametres', method: 'PUT' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
};

export const GET = withSuperAdminAuth(getHandler);
export const PUT = withSuperAdminAuth(putHandler);