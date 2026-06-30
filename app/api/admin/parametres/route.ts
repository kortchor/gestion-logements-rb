import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_change_me';

// GET - Récupérer un paramètre
export async function GET(request: Request) {
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
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour un paramètre (Super Admin uniquement)
export async function PUT(request: Request) {
  try {
    // Vérifier le token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Accès refusé. Super Admin uniquement.' },
        { status: 403 }
      );
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
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}