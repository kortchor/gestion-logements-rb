import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// ✅ GET - Récupérer un collaborateur par son ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const collaborateurId = parseInt(params.id);

    if (isNaN(collaborateurId)) {
      return NextResponse.json(
        { error: 'ID de collaborateur invalide' },
        { status: 400 }
      );
    }

    // ✅ Utiliser la requête complète qui joint les informations du logement actif
    const result = await query(
      `SELECT 
        c.*,
        COALESCE(l.id, NULL) as lit_id,
        COALESCE(l.numero, NULL) as lit_numero,
        COALESCE(ch.nom, NULL) as chambre_nom,
        COALESCE(log.id, NULL) as logement_id,
        COALESCE(log.adresse, NULL) as logement_adresse,
        COALESCE(b.id, NULL) as bail_id
      FROM collaborateurs c
      LEFT JOIN baux b ON c.id = b.collaborateur_id AND b.date_fin >= CURRENT_DATE
      LEFT JOIN lits l ON b.lit_id = l.id
      LEFT JOIN chambres ch ON l.chambre_id = ch.id
      LEFT JOIN logements log ON ch.logement_id = log.id
      WHERE c.id = $1`,
      [collaborateurId]
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

// ✅ PUT - Mettre à jour un collaborateur
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const collaborateurId = parseInt(params.id);

    if (isNaN(collaborateurId)) {
      return NextResponse.json(
        { error: 'ID de collaborateur invalide' },
        { status: 400 }
      );
    }

    const body = await request.json();
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

    const result = await query(
      `UPDATE collaborateurs 
       SET nom = $1, prenom = $2, email = $3, telephone = $4, genre = $5,
           date_arrivee = $6, date_depart = $7, date_debut_contrat = $8, date_fin_contrat = $9,
           vehicule = $10, animal = $11, commentaire = $12,
           centre_principal = $13, centre_affectation = $14
       WHERE id = $15
       RETURNING *`,
      [
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
        collaborateurId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Collaborateur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Erreur PUT:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
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
    const collaborateurId = parseInt(params.id);

    if (isNaN(collaborateurId)) {
      return NextResponse.json(
        { error: 'ID de collaborateur invalide' },
        { status: 400 }
      );
    }

    const checkResult = await query(
      'SELECT id FROM collaborateurs WHERE id = $1',
      [collaborateurId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Collaborateur non trouvé' },
        { status: 404 }
      );
    }

    await query(
      'UPDATE lits SET est_occupe = false, collaborateur_id = NULL WHERE collaborateur_id = $1',
      [collaborateurId]
    );

    await query('DELETE FROM collaborateurs WHERE id = $1', [collaborateurId]);

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