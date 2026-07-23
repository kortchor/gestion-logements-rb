import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withReadAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lits/assignes
 * Récupère tous les lits assignés avec leurs occupants
 */
const getHandler = async (request: NextRequest, payload: TokenPayload) => {
  try {
    const result = await query(`
      SELECT 
        l.id,
        l.numero,
        ch.nom as chambre_nom,
        ch.type_lit,
        log.nom_logement,
        log.adresse,
        log.ville,
        log.prix_loyer,
        json_agg(
          json_build_object(
            'id', c.id,
            'nom', c.nom,
            'prenom', c.prenom,
            'email', c.email
          )
          ORDER BY lo.created_at
        ) as occupants
      FROM lits l
      JOIN chambres ch ON l.chambre_id = ch.id
      JOIN logements log ON ch.logement_id = log.id
      LEFT JOIN lit_occupants lo ON l.id = lo.lit_id
      LEFT JOIN collaborateurs c ON lo.collaborateur_id = c.id
      WHERE l.est_occupe = true
      GROUP BY l.id, l.numero, ch.nom, ch.type_lit, log.nom_logement, log.adresse, log.ville, log.prix_loyer
      ORDER BY log.adresse, ch.nom, l.numero
    `);

    // Restructurer les données pour éviter les null
    const data = result.rows.map(row => ({
      ...row,
      occupants: row.occupants.filter((o: any) => o.id !== null)
    }));

    return NextResponse.json({ 
      success: true, 
      data
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
};

export const GET = withReadAuth(getHandler);
