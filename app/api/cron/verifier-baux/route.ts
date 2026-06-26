import { NextResponse } from 'next/server';

// Cette route sera appelée par un cron job (tous les jours)
export async function GET() {
  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/email/alerte-fin-bail?mois=4`,
      { cache: 'no-store' }
    );
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      result: data,
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