import { NextResponse } from 'next/server';
import { verifyCsrfMiddleware } from '@/lib/csrf';

export async function POST(request: Request) {
  if (!verifyCsrfMiddleware(request)) {
    return NextResponse.json(
      { error: 'CSRF token invalide' },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ success: true });
  
  // ✅ Supprimer le cookie
  response.cookies.set({
    name: 'token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  
  return response;
}