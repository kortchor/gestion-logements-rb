import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

const getHandler = async (request: NextRequest, payload: TokenPayload) => {
  // Vérifier que l'utilisateur est super_admin
  if (payload.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'Accès refusé. Super administrateur requis.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const entityType = searchParams.get('entity_type');
    const action = searchParams.get('action');
    const userEmail = searchParams.get('user_email');

    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (entityType) {
      whereClause += ` AND a.entity_type = $${paramIndex}`;
      params.push(entityType);
      paramIndex++;
    }

    if (action) {
      whereClause += ` AND a.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (userEmail) {
      whereClause += ` AND a.user_email ILIKE $${paramIndex}`;
      params.push(`%${userEmail}%`);
      paramIndex++;
    }

    // Récupérer le total
    const countResult = await query(
      `SELECT COUNT(*) as total FROM audit_trail a ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || 0);

    // Récupérer les entrées
    const result = await query(
      `SELECT 
        a.id,
        a.user_id,
        a.user_email,
        a.action,
        a.entity_type,
        a.entity_id,
        a.changes,
        a.ip_address,
        a.created_at,
        c.prenom,
        c.nom
      FROM audit_trail a
      LEFT JOIN collaborateurs c ON a.user_id = c.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`,
      [...params, pageSize, offset]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('❌ Erreur audit trail:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'audit trail' },
      { status: 500 }
    );
  }
};

export const GET = withAuth(getHandler, ['super_admin']);
