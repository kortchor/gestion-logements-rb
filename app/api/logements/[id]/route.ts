import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    await query('DELETE FROM logements WHERE id = $1', [id]);
    
    return NextResponse.redirect(new URL('/logements', request.url));
  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    await query('DELETE FROM logements WHERE id = $1', [id]);
    
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}