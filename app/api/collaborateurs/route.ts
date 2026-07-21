import { query, pool } from '@/lib/db';
import { NextResponse } from 'next/server';
import { createCollaborateurSchema } from '@/lib/validation';

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
  const client = await pool.connect();
  try {
    const body = await request.json();

    // ✅ Validation des entrées
    const validation = createCollaborateurSchema.validate(body);
    if (!validation.success) {
      await client.release();
      return NextResponse.json(
        { error: 'Données invalides', errors: validation.errors },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    await client.query('BEGIN');

    // Vérifier si l'email existe déjà
    const checkResult = await client.query(
      'SELECT id FROM collaborateurs WHERE email = $1',
      [validatedData.email]
    );

    if (checkResult.rows.length > 0) {
      await client.query('ROLLBACK');
      await client.release();
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
        validatedData.nom,
        validatedData.prenom,
        validatedData.email,
        validatedData.telephone,
        validatedData.genre,
        validatedData.date_arrivee,
        validatedData.date_depart,
        validatedData.date_debut_contrat,
        validatedData.date_fin_contrat,
        validatedData.vehicule,
        validatedData.animal,
        validatedData.commentaire,
        validatedData.centre_principal,
        validatedData.centre_affectation,
      ]
    );

    const collaborateurId = result.rows[0].id;

    // Assigner à un lit si spécifié
    if (body.lit_id) {
      const litResult = await client.query(
        'SELECT id FROM lits WHERE id = $1 AND est_occupe = false',
        [parseInt(body.lit_id)]
      );

      if (litResult.rows.length > 0) {
        await client.query(
          'UPDATE lits SET est_occupe = true, collaborateur_id = $1 WHERE id = $2',
          [collaborateurId, parseInt(body.lit_id)]
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

// ✅ DELETE - Supprimer un collaborateur
export async function DELETE(request: Request) {
  const client = await pool.connect();
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
    if (isNaN(collaborateurId)) {
      return NextResponse.json(
        { error: 'ID du collaborateur invalide' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Vérifier que le collaborateur existe
    const collaborateurResult = await client.query(
      'SELECT id, nom, prenom FROM collaborateurs WHERE id = $1',
      [collaborateurId]
    );

    if (collaborateurResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Collaborateur non trouvé' },
        { status: 404 }
      );
    }

    const collaborateur = collaborateurResult.rows[0];

    // Vérifier s'il n'a pas de baux actifs
    const bauxResult = await client.query(
      `SELECT COUNT(*) as count FROM baux WHERE collaborateur_id = $1 AND date_fin >= CURRENT_DATE`,
      [collaborateurId]
    );

    if (parseInt(bauxResult.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Impossible de supprimer ce collaborateur. Il a des baux actifs. Veuillez d\'abord le désassigner.' },
        { status: 400 }
      );
    }

    // Libérer les lits occupés
    await client.query(
      'UPDATE lits SET est_occupe = false, collaborateur_id = NULL WHERE collaborateur_id = $1',
      [collaborateurId]
    );

    // Supprimer les baux historiques
    await client.query(
      'DELETE FROM baux WHERE collaborateur_id = $1',
      [collaborateurId]
    );

    // Supprimer le collaborateur
    await client.query(
      'DELETE FROM collaborateurs WHERE id = $1',
      [collaborateurId]
    );

    await client.query('COMMIT');

    console.log(`✅ Collaborateur ${collaborateur.prenom} ${collaborateur.nom} (ID: ${collaborateurId}) supprimé avec succès`);

    return NextResponse.json(
      { success: true, message: `${collaborateur.prenom} ${collaborateur.nom} a été supprimé avec succès` },
      { status: 200 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur DELETE:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du collaborateur' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
