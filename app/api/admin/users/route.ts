import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { withSuperAdminAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

// ✅ GET - Récupérer tous les utilisateurs (Super Admin uniquement)
const getHandler = async (request: NextRequest, payload: TokenPayload) => {
  try {
    const result = await query(`
      SELECT 
        id,
        nom,
        prenom,
        email,
        role,
        est_actif,
        created_at
      FROM collaborateurs
      ORDER BY id
    `);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
};

// ✅ POST - Créer un utilisateur
const postHandler = async (request: NextRequest, payload: TokenPayload) => {
  try {
    const body = await request.json();
    const { nom, prenom, email, mot_de_passe, role, est_actif } = body;

    if (!nom || !prenom || !email || !mot_de_passe) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const checkResult = await query(
      'SELECT id FROM collaborateurs WHERE email = $1',
      [email]
    );

    if (checkResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      );
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    // Créer l'utilisateur
    const result = await query(
      `INSERT INTO collaborateurs 
       (nom, prenom, email, mot_de_passe, role, est_actif, date_arrivee, date_debut_contrat)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, CURRENT_DATE)
       RETURNING id, nom, prenom, email, role, est_actif`,
      [nom, prenom, email, hashedPassword, role || 'user', est_actif !== undefined ? est_actif : true]
    );

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création' },
      { status: 500 }
    );
  }
};

// ✅ PUT - Modifier un utilisateur
const putHandler = async (request: NextRequest, payload: TokenPayload) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID requis' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { nom, prenom, email, role, est_actif, mot_de_passe } = body;

    let updateQuery = `
      UPDATE collaborateurs 
      SET nom = $1, prenom = $2, email = $3, role = $4, est_actif = $5
    `;
    const params = [nom, prenom, email, role || 'user', est_actif !== undefined ? est_actif : true];

    if (mot_de_passe) {
      const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
      updateQuery += `, mot_de_passe = $6`;
      params.push(hashedPassword);
    }

    updateQuery += ` WHERE id = $${params.length + 1} RETURNING id, nom, prenom, email, role, est_actif`;
    params.push(parseInt(id));

    const result = await query(updateQuery, params);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification' },
      { status: 500 }
    );
  }
};

// ✅ DELETE - Supprimer un utilisateur
const deleteHandler = async (request: NextRequest, payload: TokenPayload) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID requis' },
        { status: 400 }
      );
    }

    // Empêcher la suppression de son propre compte
    if (parseInt(id) === payload.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer votre propre compte' },
        { status: 400 }
      );
    }

    await query('DELETE FROM collaborateurs WHERE id = $1', [parseInt(id)]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
};

export const GET = withSuperAdminAuth(getHandler);
export const POST = withSuperAdminAuth(postHandler);
export const PUT = withSuperAdminAuth(putHandler);
export const DELETE = withSuperAdminAuth(deleteHandler);