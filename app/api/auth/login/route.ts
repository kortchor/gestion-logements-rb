import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { encrypt } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { checkRateLimit, LOGIN_RATE_LIMIT } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 🔐 Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const email = body?.email?.toLowerCase().trim() || '';
    const rateLimitKey = `login:${email || clientIp}`;

    if (!checkRateLimit(rateLimitKey, LOGIN_RATE_LIMIT)) {
      console.warn(`⛔ Rate limit dépassé pour: ${email || clientIp}`);
      return NextResponse.json(
        { error: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.' },
        { status: 429 }
      );
    }

    // ✅ Validation des entrées
    const validation = loginSchema.validate(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', errors: validation.errors },
        { status: 400 }
      );
    }

    const { email: validEmail, mot_de_passe } = validation.data;

    const result = await query(
      'SELECT id, nom, prenom, email, mot_de_passe, role, est_actif FROM collaborateurs WHERE email = $1',
      [validEmail]
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

    // 🔐 Vérifier le mot de passe
    let isPasswordValid = false;
    const devPassword = process.env.DEV_PASSWORD || '';
    
    if (process.env.NODE_ENV !== 'production' && devPassword && mot_de_passe === devPassword) {
      isPasswordValid = true;
      console.warn('🔓 [Login] Connexion avec le mot de passe de test pour:', validEmail);
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