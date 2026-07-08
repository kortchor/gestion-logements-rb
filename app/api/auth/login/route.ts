import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { encrypt } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, mot_de_passe } = body;

    if (!email || !mot_de_passe) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    const result = await query(
      'SELECT id, nom, prenom, email, mot_de_passe, role, est_actif FROM collaborateurs WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    if (!user.est_actif) {
      return NextResponse.json(
        { error: 'Votre compte a été désactivé' },
        { status: 401 }
      );
    }

    // ✅ SÉCURITÉ : N'accepter le mot de passe "master" qu'en développement
    let isPasswordValid = false;
    
    if (process.env.NODE_ENV !== 'production' && mot_de_passe === 'admin123') {
      isPasswordValid = true;
      console.warn('🔓 [Login] Connexion avec le mot de passe de test pour:', email);
    } else if (user.mot_de_passe) {
      isPasswordValid = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    const token = await encrypt({
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('❌ Erreur login:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la connexion' },
      { status: 500 }
    );
  }
}