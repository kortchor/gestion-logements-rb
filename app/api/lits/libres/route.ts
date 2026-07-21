import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

// Lits libres (non assignés)
export const GET = withAuth(async (request: NextRequest, payload: TokenPayload) => {
  try {
    const result = await query(`
      SELECT 
        l.id,
        l.num_lit,
        l.type_lit,
        c.id as chambre_id,
        c.num_chambre,
        lo.id as logement_id,
        lo.adresse,
        lo.ville,
        lo.prix_loyer
      FROM lits l
      JOIN chambres c ON l.chambre_id = c.id
      JOIN logements lo ON c.logement_id = lo.id
      WHERE l.collaborateur_id IS NULL
        AND lo.est_actif = true
      ORDER BY lo.adresse, c.num_chambre, l.num_lit
    `);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des lits libres:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
});
