import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const client = await query.pool.connect();
  try {
    const body = await request.json();
    const { token, mot_de_passe } = body;

    if (!token || !mot_de_passe) {
      client.release();
      return NextResponse.json(
        { error: 'Token et mot de passe requis' },
        { status: 400 }
      );
    }

    if (mot_de_passe.length < 6) {
      client.release();
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      );
    }

    // Vérifier le token
    const result = await client.query(
      `SELECT id, nom, prenom, email FROM collaborateurs 
       WHERE reset_token = $1 AND reset_token_expiry > CURRENT_TIMESTAMP AND est_actif = true`,
      [token]
    );

    if (result.rows.length === 0) {
      client.release();
      return NextResponse.json(
        { error: 'Lien de réinitialisation invalide ou expiré' },
        { status: 400 }
      );
    }

    const user = result.rows[0];

    // Démarrer la transaction
    await client.query('BEGIN');

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    // Mettre à jour le mot de passe et supprimer le token
    await client.query(
      `UPDATE collaborateurs 
       SET mot_de_passe = $1, reset_token = NULL, reset_token_expiry = NULL 
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    // Valider la transaction
    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Mot de passe modifié avec succès',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}