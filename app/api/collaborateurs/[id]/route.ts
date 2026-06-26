import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// ✅ GET - Récupérer un collaborateur
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    const result = await query(
      `SELECT 
        c.*,
        l.id as lit_id,
        l.numero as lit_numero,
        ch.nom as chambre_nom,
        ch.type_lit,
        log.id as logement_id,
        log.adresse as logement_adresse,
        log.ville as logement_ville,
        log.type_occupation as logement_type_occupation
      FROM collaborateurs c
      LEFT JOIN lits l ON c.id = l.collaborateur_id
      LEFT JOIN chambres ch ON l.chambre_id = ch.id
      LEFT JOIN logements log ON ch.logement_id = log.id
      WHERE c.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Collaborateur non trouvé' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Erreur GET:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Supprimer un collaborateur
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    const checkResult = await query(
      'SELECT id FROM collaborateurs WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Collaborateur non trouvé' },
        { status: 404 }
      );
    }
    
    await query(
      'UPDATE lits SET est_occupe = false, collaborateur_id = NULL WHERE collaborateur_id = $1',
      [id]
    );
    
    await query('DELETE FROM collaborateurs WHERE id = $1', [id]);
    
    return NextResponse.json(
      { success: true, message: 'Collaborateur supprimé' },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Erreur DELETE:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}