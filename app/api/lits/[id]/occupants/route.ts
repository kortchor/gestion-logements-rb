import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withReadAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lits/[id]/occupants
 * Récupère les occupants d'un lit
 */
const getHandler = async (request: NextRequest, payload: TokenPayload) => {
  try {
    const { id } = request.nextUrl.pathname.split('/').reduce((acc, segment, idx, arr) => {
      if (segment === 'lits') acc.id = arr[idx + 1];
      return acc;
    }, {} as any);

    const result = await query(`
      SELECT 
        c.id,
        c.nom,
        c.prenom,
        c.email,
        lo.created_at as date_assignation
      FROM lit_occupants lo
      JOIN collaborateurs c ON lo.collaborateur_id = c.id
      WHERE lo.lit_id = $1
      ORDER BY lo.created_at
    `, [id]);

    return NextResponse.json({ 
      success: true, 
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des occupants' },
      { status: 500 }
    );
  }
};

export const GET = withReadAuth(getHandler);
