import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3003';
    
    const response = await fetch(
      `${baseUrl}/api/email/alerte-fin-bail?mois=4`,
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