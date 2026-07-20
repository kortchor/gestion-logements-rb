import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcryptjs from 'bcryptjs';
import { logAuth, logSecurityEvent } from '@/lib/logger';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/auth/change-password
 * Change le mot de passe de l'utilisateur authentifié
 * Nécessite l'authentification (token JWT)
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const token = request.cookies.get('token')?.value;
    if (!token) {
      logSecurityEvent('change_password_unauthorized', {
        ip: request.ip || 'unknown',
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier le token JWT
    const payload = await verifyToken(token);
    if (!payload) {
      logSecurityEvent('change_password_invalid_token', {
        ip: request.ip || 'unknown',
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }

    const userId = payload.id;
    const email = payload.email;

    // Récupérer les données du formulaire
    const body = await request.json();
    const { ancien_mot_de_passe, nouveau_mot_de_passe } = body;

    // Validation
    if (!ancien_mot_de_passe || !nouveau_mot_de_passe) {
      logSecurityEvent('change_password_missing_fields', {
        userId,
        email,
        ip: request.ip || 'unknown',
      });
      return NextResponse.json(
        { error: 'Les anciens et nouveaux mots de passe sont requis' },
        { status: 400 }
      );
    }

    if (nouveau_mot_de_passe.length < 4) {
      logSecurityEvent('change_password_weak_password', {
        userId,
        email,
        ip: request.ip || 'unknown',
      });
      return NextResponse.json(
        { error: 'Le nouveau mot de passe doit contenir au moins 4 caractères' },
        { status: 400 }
      );
    }

    // Récupérer le collaborateur
    const userResult = await query(
      `SELECT id, email, mot_de_passe FROM collaborateurs WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      logAuth(userId, email, 'change_password', false);
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Vérifier l'ancien mot de passe
    const isPasswordValid = await bcryptjs.compare(
      ancien_mot_de_passe,
      user.mot_de_passe
    );

    if (!isPasswordValid) {
      logSecurityEvent('change_password_invalid_old_password', {
        userId,
        email,
        ip: request.ip || 'unknown',
      });
      logAuth(userId, email, 'change_password', false);
      return NextResponse.json(
        { error: 'Ancien mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Hasher le nouveau mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcryptjs.hash(
      nouveau_mot_de_passe,
      saltRounds
    );

    // Mettre à jour le mot de passe
    await query(
      `UPDATE collaborateurs SET mot_de_passe = $1, updated_at = NOW() WHERE id = $2`,
      [hashedPassword, userId]
    );

    // Logger l'action
    logAuth(userId, email, 'change_password', true);

    return NextResponse.json({
      success: true,
      message: 'Mot de passe changé avec succès',
    });
  } catch (error) {
    console.error('❌ Erreur change-password:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
