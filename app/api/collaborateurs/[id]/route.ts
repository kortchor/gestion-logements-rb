import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

const getCollaborateurHandler = async (
  request: NextRequest,
  payload: TokenPayload,
  { params }: { params: { id: string } }
) => {
  try {
    const collaborateurId = parseInt(params.id, 10);

    if (isNaN(collaborateurId)) {
      return NextResponse.json({ success: false, error: 'ID de collaborateur invalide' }, { status: 400 });
    }

    const result = await query(
      'SELECT * FROM collaborateurs WHERE id = $1',
      [collaborateurId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Collaborateur non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Erreur GET /api/collaborateurs/[id]:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
};

// Exporter la méthode GET protégée par l'authentification
export const GET = withAuth(getCollaborateurHandler, ['admin', 'super_admin', 'user']);