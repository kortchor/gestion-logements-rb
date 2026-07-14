import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// ✅ GET - Récupérer tous les collaborateurs ou un seul avec ?id=
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    let queryText = `
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
      FROM collaborateurs c`;

    const queryParams = [];

    if (id) {
      queryText += ' WHERE c.id = $1';
      queryParams.push(id);
    } else {
      queryText += ' ORDER BY c.id';
    }

    const result = await query(queryText, queryParams);
    
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
  const client = await query.pool.connect();
  try {
    const body = await request.json();
    await client.query('BEGIN');

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
    const checkResult = await client.query(
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
    const result = await client.query(
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
      const litResult = await client.query(
        'SELECT id FROM lits WHERE id = $1 AND est_occupe = false',
        [parseInt(lit_id)]
      );

      if (litResult.rows.length > 0) {
        await client.query(
          'UPDATE lits SET est_occupe = true, collaborateur_id = $1 WHERE id = $2',
          [collaborateurId, parseInt(lit_id)]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, id: collaborateurId }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur POST:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}