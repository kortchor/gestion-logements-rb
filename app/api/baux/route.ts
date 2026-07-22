import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// ✅ GET - Récupérer tous les baux
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    let queryText = `
      SELECT 
        b.id,
        b.logement_id,
        b.collaborateur_id,
        b.date_debut,
        b.date_fin,
        b.participation_mensuelle,
        b.yousign_request_id,
        b.signature_link,
        b.created_at,
        c.nom,
        c.prenom,
        c.email,
        l.adresse,
        l.ville,
        l.prix_loyer
      FROM baux b
      LEFT JOIN collaborateurs c ON b.collaborateur_id = c.id
      LEFT JOIN logements l ON b.logement_id = l.id`;

    const queryParams = [];

    if (id) {
      queryText += ' WHERE b.id = $1';
      queryParams.push(id);
    } else {
      queryText += ' ORDER BY b.date_fin DESC';
    }

    const result = await query(queryText, queryParams);
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows,
      baux: result.rows 
    });
  } catch (error) {
    console.error('❌ Erreur GET baux:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}
