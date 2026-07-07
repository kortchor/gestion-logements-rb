import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const collaborateurId = payload.id;

    const result = await query(`
      SELECT 
        l.id,
        l.nom_logement,
        l.adresse,
        l.ville,
        l.description_detaillee,
        l.etat_lieux_photos,
        c.nom as chambre_nom,
        li.numero as lit_numero
      FROM lits li
      LEFT JOIN chambres c ON li.chambre_id = c.id
      LEFT JOIN logements l ON c.logement_id = l.id
      WHERE li.collaborateur_id = $1 AND li.est_occupe = true
    `, [collaborateurId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Aucun logement assigné' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}