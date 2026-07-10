import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// ✅ GET - Récupérer tous les collaborateurs ou un seul avec ?id=
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const result = await query(
        `SELECT 
          c.*,
          COALESCE(l.id, NULL) as lit_id,
          COALESCE(l.numero, NULL) as lit_numero,
          COALESCE(ch.nom, NULL) as chambre_nom,
          COALESCE(ch.type_lit, NULL) as type_lit,
          COALESCE(log.id, NULL) as logement_id,
          COALESCE(log.adresse, NULL) as logement_adresse,
          COALESCE(log.ville, NULL) as logement_ville,
          COALESCE(log.type_occupation_effectif, NULL) as logement_type_occupation,
          COALESCE(b.id, NULL) as bail_id,
          COALESCE(b.participation_mensuelle, NULL) as participation_mensuelle,
          COALESCE(b.date_fin, NULL) as bail_date_fin
        FROM collaborateurs c
        LEFT JOIN baux b ON c.id = b.collaborateur_id AND b.date_fin >= CURRENT_DATE LEFT JOIN lits l ON b.lit_id = l.id LEFT JOIN chambres ch ON l.chambre_id = ch.id LEFT JOIN logements log ON ch.logement_id = log.id
        WHERE c.id = $1`,
        [parseInt(id)]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Collaborateur non trouvé' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ success: true, data: result.rows[0] });
    }

    const result = await query(`
      SELECT 
        c.id,
        c.nom,
        c.prenom,
        c.email,
        c.telephone,
        c.genre,
        c.date_arrivee,
        c.date_depart,
        c.date_debut_contrat,
        c.date_fin_contrat,
        c.vehicule,
        c.animal,
        c.commentaire,
        c.centre_principal,
        c.centre_affectation,
        c.clefs,
        c.mot_de_passe,
        c.est_actif
      FROM collaborateurs c
      ORDER BY c.id
    `);
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Erreur GET:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}

// ✅ POST - Créer un collaborateur (SANS mot de passe)
export async function POST(request: Request) {
  try {
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
      lit_id,
    } = body;

    // Vérifier si l'email existe déjà
    const checkResult = await query(
      'SELECT id FROM collaborateurs WHERE email = $1',
      [email]
    );

    if (checkResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Un collaborateur avec cet email existe déjà' },
        { status: 400 }
      );
    }

    // Créer le collaborateur (SANS mot de passe)
    const result = await query(
      `INSERT INTO collaborateurs 
       (nom, prenom, email, telephone, genre, date_arrivee, date_depart, 
        date_debut_contrat, date_fin_contrat, vehicule, animal, commentaire,
        centre_principal, centre_affectation, est_actif, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, 'user')
       RETURNING id`,
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
      ]
    );

    const collaborateurId = result.rows[0].id;

    // Assigner à un lit si spécifié
    if (lit_id) {
      const litResult = await query(
        'SELECT id FROM lits WHERE id = $1 AND est_occupe = false',
        [parseInt(lit_id)]
      );

      if (litResult.rows.length > 0) {
        await query(
          'UPDATE lits SET est_occupe = true, collaborateur_id = $1 WHERE id = $2',
          [collaborateurId, parseInt(lit_id)]
        );
      }
    }

    return NextResponse.json({ success: true, id: collaborateurId }, { status: 201 });
  } catch (error) {
    console.error('❌ Erreur POST:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création' },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Supprimer un collaborateur
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID du collaborateur requis' },
        { status: 400 }
      );
    }

    const collaborateurId = parseInt(id);

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