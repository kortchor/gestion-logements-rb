import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3003';
    const results = [];

    // 1. Alerte 1 mois avant (30 jours)
    console.log('📧 Envoi des alertes 1 mois avant...');
    const res30 = await fetch(
      `${baseUrl}/api/email/alerte-fin-bail?jours=30&type=premiere`,
      { cache: 'no-store' }
    );
    const data30 = await res30.json();
    results.push({ type: '1 mois (30j)', ...data30 });

    // 2. Alerte 2 semaines avant (14 jours)
    console.log('📧 Envoi des alertes 2 semaines avant...');
    const res14 = await fetch(
      `${baseUrl}/api/email/alerte-fin-bail?jours=14&type=relance`,
      { cache: 'no-store' }
    );
    const data14 = await res14.json();
    results.push({ type: '2 semaines (14j)', ...data14 });

    // 3. Alerte 1 semaine avant (7 jours)
    console.log('📧 Envoi des alertes 1 semaine avant...');
    const res7 = await fetch(
      `${baseUrl}/api/email/alerte-fin-bail?jours=7&type=derniere`,
      { cache: 'no-store' }
    );
    const data7 = await res7.json();
    results.push({ type: '1 semaine (7j)', ...data7 });

    // 4. Alerte quotidienne (1 jour avant)
    console.log('📧 Envoi des alertes quotidiennes...');
    const res1 = await fetch(
      `${baseUrl}/api/email/alerte-fin-bail?jours=1&type=quotidienne`,
      { cache: 'no-store' }
    );
    const data1 = await res1.json();
    results.push({ type: '1 jour (1j)', ...data1 });

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erreur cron:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'exécution du cron' },
      { status: 500 }
    );
  }
}