import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { withSuperAdminAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { generatePassword } from '@/lib/password-utils';
import { sendEmail } from '@/lib/email';
import { getAdminCredentialsEmailTemplate } from '@/lib/emailTemplates';
import logger, { logError } from '@/lib/logger';
import { verifyCsrfMiddleware } from '@/lib/csrf';

// ✅ GET - Récupérer tous les utilisateurs (Super Admin uniquement)
const getHandler = async () => {
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
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/users', method: 'GET' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
};

// ✅ POST - Créer un utilisateur avec mot de passe généré automatiquement
const postHandler = async (request: NextRequest) => {
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json({ error: 'CSRF token invalide' }, { status: 403 });
    }

    const body = await request.json();
    const { nom, prenom, email, role, est_actif } = body;

    // Validation: nom, prenom, email requis (pas mot_de_passe)
    if (!nom || !prenom || !email) {
      return NextResponse.json(
        { error: 'Le nom, prénom et email sont requis' },
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

    // Générer automatiquement un mot de passe sécurisé
    const generatedPassword = generatePassword(12);

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Créer l'utilisateur
    const result = await query(
      `INSERT INTO collaborateurs 
       (nom, prenom, email, mot_de_passe, role, est_actif, date_arrivee, date_debut_contrat)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, CURRENT_DATE)
       RETURNING id, nom, prenom, email, role, est_actif`,
      [nom, prenom, email, hashedPassword, role || 'user', est_actif !== undefined ? est_actif : true]
    );

    const newUser = result.rows[0];

    // Envoyer un email avec les credentials
    try {
      const emailTemplate = getAdminCredentialsEmailTemplate({
        nom,
        prenom,
        email,
        motDePasse: generatedPassword,
        siteUrl: process.env.NEXTAUTH_URL || 'https://gestion-logements-rb.vercel.app',
      });

      await sendEmail({
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      logger.info({ route: '/api/admin/users', action: 'send-credentials-email' }, 'Email de credentials envoye');
    } catch (emailError) {
      if (emailError instanceof Error) {
        logError(emailError, { route: '/api/admin/users', action: 'send-credentials-email', targetEmail: email });
      }
      // L'utilisateur est créé même si l'email échoue
      // Le super admin peut renvoyer les credentials manuellement
    }

    return NextResponse.json({ success: true, data: newUser }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/users', method: 'POST' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la création' },
      { status: 500 }
    );
  }
};

// ✅ PUT - Modifier un utilisateur
const putHandler = async (request: NextRequest) => {
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json({ error: 'CSRF token invalide' }, { status: 403 });
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
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/users', method: 'PUT' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la modification' },
      { status: 500 }
    );
  }
};

// ✅ DELETE - Supprimer un utilisateur
const deleteHandler = async (request: NextRequest, payload: TokenPayload) => {
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json({ error: 'CSRF token invalide' }, { status: 403 });
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
    if (parseInt(id) === payload.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer votre propre compte' },
        { status: 400 }
      );
    }

    await query('DELETE FROM collaborateurs WHERE id = $1', [parseInt(id)]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/users', method: 'DELETE' });
    }
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