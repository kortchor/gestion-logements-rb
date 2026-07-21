import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

// Collaborateurs sans logement assigné
export const GET = withAuth(async (request: NextRequest, payload: TokenPayload) => {
  try {
    const result = await query(`
      SELECT 
        c.id,
        c.nom,
        c.prenom,
        c.email,
        c.role,
        c.est_actif,
        c.date_arrivee,
        COUNT(b.id) as nombre_baux
      FROM collaborateurs c
      LEFT JOIN baux b ON c.id = b.collaborateur_id AND b.date_fin >= CURRENT_DATE
      WHERE NOT EXISTS (
        SELECT 1 FROM lits l 
        WHERE l.collaborateur_id = c.id
      )
        AND c.role NOT IN ('super_admin', 'admin', 'admin_readonly')
        AND c.est_actif = true
      GROUP BY c.id, c.nom, c.prenom, c.email, c.role, c.est_actif, c.date_arrivee
      ORDER BY c.prenom, c.nom
    `);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des collaborateurs sans logement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
});
