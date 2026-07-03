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
          l.id as lit_id,
          l.numero as lit_numero,
          ch.nom as chambre_nom,
          ch.type_lit,
          log.id as logement_id,
          log.adresse as logement_adresse,
          log.ville as logement_ville,
          log.type_occupation_effectif as logement_type_occupation,
          b.participation_mensuelle
        FROM collaborateurs c
        LEFT JOIN lits l ON c.id = l.collaborateur_id
        LEFT JOIN chambres ch ON l.chambre_id = ch.id
        LEFT JOIN logements log ON ch.logement_id = log.id
        LEFT JOIN baux b ON c.id = b.collaborateur_id AND b.logement_id = log.id AND b.date_fin >= CURRENT_DATE
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
        c.est_actif,
        l.id as lit_id,
        l.numero as lit_numero,
        ch.nom as chambre_nom,
        log.adresse as logement_adresse,
        log.ville as logement_ville,
        log.type_occupation_effectif as logement_type_occupation,
        b.participation_mensuelle
      FROM collaborateurs c
      LEFT JOIN lits l ON c.id = l.collaborateur_id
      LEFT JOIN chambres ch ON l.chambre_id = ch.id
      LEFT JOIN logements log ON ch.logement_id = log.id
      LEFT JOIN baux b ON c.id = b.collaborateur_id AND b.logement_id = log.id AND b.date_fin >= CURRENT_DATE
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