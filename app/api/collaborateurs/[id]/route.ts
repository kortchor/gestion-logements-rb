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
        log.type_occupation as logement_type_occupation,
        b.participation_mensuelle
      FROM collaborateurs c
      LEFT JOIN lits l ON c.id = l.collaborateur_id
      LEFT JOIN chambres ch ON l.chambre_id = ch.id
      LEFT JOIN logements log ON ch.logement_id = log.id
      LEFT JOIN baux b ON c.id = b.collaborateur_id AND b.logement_id = log.id AND b.date_fin >= CURRENT_DATE
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

// ✅ PUT - Modifier un collaborateur
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    console.log('📦 Données reçues pour modification collaborateur:', body);

    const {
      nom,
      prenom,
      email,
      telephone,
      genre,
      date_arrivee,
      date_depart,
      date_debut_contrat,
      date_fin_contrat,
      vehicule,
      animal,
      commentaire,
      centre_principal,
      centre_affectation,
    } = body;

    // Vérifier si l'email est déjà utilisé par un autre collaborateur
    const checkResult = await query(
      'SELECT id FROM collaborateurs WHERE email = $1 AND id != $2',
      [email, id]
    );

    if (checkResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé par un autre collaborateur' },
        { status: 400 }
      );
    }

    await query(
      `UPDATE collaborateurs 
       SET nom = $1, prenom = $2, email = $3, telephone = $4, genre = $5,
           date_arrivee = $6, date_depart = $7, date_debut_contrat = $8, date_fin_contrat = $9,
           vehicule = $10, animal = $11, commentaire = $12,
           centre_principal = $13, centre_affectation = $14
       WHERE id = $15`,
      [
        nom,
        prenom,
        email,
        telephone || null,
        genre,
        date_arrivee,
        date_depart || null,
        date_debut_contrat || null,
        date_fin_contrat || null,
        vehicule || false,
        animal || false,
        commentaire || null,
        centre_principal || null,
        centre_affectation || null,
        id
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur PUT:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification' },
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
      { success: true, message: 'Collaborateur supprimé avec succès' },
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