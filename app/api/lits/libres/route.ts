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
        l.numero as num_lit,
        ch.type_lit,
        ch.id as chambre_id,
        ch.nom as num_chambre,
        log.id as logement_id,
        log.nom_logement,
        log.adresse,
        log.ville,
        log.prix_loyer
      FROM lits l
      JOIN chambres ch ON l.chambre_id = ch.id
      JOIN logements log ON ch.logement_id = log.id
      WHERE l.est_occupe = false
        AND log.est_actif = true
      ORDER BY log.adresse, ch.nom, l.numero
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
