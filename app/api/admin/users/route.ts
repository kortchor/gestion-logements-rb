import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_change_me';

// ✅ GET - Récupérer tous les utilisateurs (Super Admin uniquement)
export async function GET(request: Request) {
  try {
    // Vérifier le token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est Super Admin
    if (decoded.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Accès refusé. Super Admin uniquement.' },
        { status: 403 }
      );
    }

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
}

// ✅ POST - Créer un utilisateur
export async function POST(request: Request) {
  try {
    // Vérifier le token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Accès refusé. Super Admin uniquement.' },
        { status: 403 }
      );
    }

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
}

// ✅ PUT - Modifier un utilisateur
export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Accès refusé. Super Admin uniquement.' },
        { status: 403 }
      );
    }

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
}

// ✅ DELETE - Supprimer un utilisateur
export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Accès refusé. Super Admin uniquement.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID requis' },
        { status: 400 }
      );
    }

    // Empêcher la suppression de son propre compte
    if (parseInt(id) === decoded.id) {
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
}