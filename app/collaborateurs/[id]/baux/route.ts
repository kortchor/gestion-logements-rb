import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const collaborateurId = parseInt(params.id, 10);

    if (isNaN(collaborateurId)) {
      return NextResponse.json(
        { error: 'ID de collaborateur invalide' },
        { status: 400 }
      );
    }

    const result = await query(
      `
      SELECT 
        b.id,
        b.date_debut,
        b.date_fin,
        b.participation_mensuelle,
        b.chambre_privee,
        b.signe,
        b.logement_id,
        l.nom as logement_nom,
        l.adresse as logement_adresse,
        b.chambre_id,
        c.nom as chambre_nom,
        b.lit_id,
        li.numero as lit_numero
      FROM baux b
      JOIN logements l ON b.logement_id = l.id
      JOIN chambres c ON b.chambre_id = c.id
      JOIN lits li ON b.lit_id = li.id
      WHERE b.collaborateur_id = $1
      ORDER BY b.date_debut DESC
      `,
      [collaborateurId]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Erreur GET /api/collaborateurs/[id]/baux:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des baux' },
      { status: 500 }
    );
  }
}