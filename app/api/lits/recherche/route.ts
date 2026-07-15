import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withReadAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const getHandler = async (request: NextRequest, payload: TokenPayload) => {
  try {
    const { searchParams } = new URL(request.url);
    const ville = searchParams.get('ville');
    const type_lit = searchParams.get('type_lit');
    const type_occupation = searchParams.get('type_occupation');

    let sql = `
      SELECT 
        l.id,
        l.numero,
        l.chambre_id,
        ch.nom as chambre_nom,
        ch.type_lit,
        ch.logement_id,
        log.nom_logement,
        log.adresse as logement_adresse,
        log.ville,
        log.mixte_autorise,
        log.type_occupation_effectif as type_occupation
      FROM lits l
      LEFT JOIN chambres ch ON l.chambre_id = ch.id
      LEFT JOIN logements log ON ch.logement_id = log.id
      WHERE l.est_occupe = false
        AND log.est_visible = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (ville) {
      sql += ` AND log.ville = $${paramIndex}`;
      params.push(ville);
      paramIndex++;
    }

    if (type_lit) {
      sql += ` AND ch.type_lit = $${paramIndex}`;
      params.push(type_lit);
      paramIndex++;
    }

    if (type_occupation) {
      if (type_occupation === 'mixte') {
        sql += ` AND log.mixte_autorise = true`;
      } else if (type_occupation === 'fille') {
        sql += ` AND (log.type_occupation_effectif = 'F' OR log.mixte_autorise = true)`;
      } else if (type_occupation === 'garçon') {
        sql += ` AND (log.type_occupation_effectif = 'M' OR log.mixte_autorise = true)`;
      }
    }

    sql += ` ORDER BY log.ville, log.adresse, ch.nom, l.numero`;

    const result = await query(sql, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recherche' },
      { status: 500 }
    );
  }
};

export const GET = withReadAuth(getHandler);
