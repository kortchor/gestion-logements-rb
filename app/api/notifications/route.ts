import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET - Récupérer les notifications
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uniquementNonLues = searchParams.get('non_lues') === 'true';
    const limit = parseInt(searchParams.get('limit') || '10');

    // ⚠️ CORRECTION : La colonne s'appelle "texte" ou "message" ? 
    // On va utiliser "message" si elle existe
    let sql = `
      SELECT 
        n.id,
        n.type,
        n.message,
        n.lien,
        n.est_lue,
        n.created_at,
        n.date_envoi,
        c.nom,
        c.prenom
      FROM notifications n
      LEFT JOIN collaborateurs c ON n.collaborateur_id = c.id
    `;

    if (uniquementNonLues) {
      sql += ` WHERE n.est_lue = false`;
    }

    sql += ` ORDER BY n.created_at DESC LIMIT $1`;

    const result = await query(sql, [limit]);
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Erreur notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    );
  }
}

// PUT - Marquer une notification comme lue
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la notification requis' },
        { status: 400 }
      );
    }

    await query(
      'UPDATE notifications SET est_lue = true WHERE id = $1',
      [id]
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

// DELETE - Supprimer une notification
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la notification requis' },
        { status: 400 }
      );
    }

    await query('DELETE FROM notifications WHERE id = $1', [parseInt(id)]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}