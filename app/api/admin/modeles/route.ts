import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - Récupérer tous les modèles
export async function GET() {
  try {
    const result = await query(`
      SELECT * FROM modeles_convention
      WHERE est_actif = true
      ORDER BY nom
    `);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}

// POST - Créer un modèle
export async function POST(request: Request) {
  try {
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
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création' },
      { status: 500 }
    );
  }
}

// PUT - Modifier un modèle
export async function PUT(request: Request) {
  try {
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
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un modèle (désactivation)
export async function DELETE(request: Request) {
  try {
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
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}