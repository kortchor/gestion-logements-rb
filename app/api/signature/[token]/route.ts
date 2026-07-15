import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET - Récupérer les infos du bail à signer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token manquant' }, { status: 400 });
    }

    const result = await query(
      `SELECT 
        b.id as bail_id,
        b.signature_token,
        b.signe,
        c.nom,
        c.prenom,
        c.email,
        l.adresse,
        l.ville,
        l.nom_logement,
        b.date_debut,
        b.date_fin,
        b.participation_mensuelle
      FROM baux b
      LEFT JOIN collaborateurs c ON b.collaborateur_id = c.id
      LEFT JOIN logements l ON b.logement_id = l.id
      WHERE b.signature_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Lien de signature invalide ou expiré.' }, { status: 404 });
    }

    const data = result.rows[0];

    if (data.signe) {
      return NextResponse.json({ success: false, error: 'Cette convention a déjà été signée.' }, { status: 400 });
    }

    // Vérifier l'expiration du token (7 jours)
    const bailResult = await query(
      'SELECT created_at FROM baux WHERE id = $1',
      [data.bail_id]
    );
    const createdAt = new Date(bailResult.rows[0].created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 7) {
      return NextResponse.json({ success: false, error: 'Ce lien de signature a expiré (plus de 7 jours). Veuillez contacter votre administrateur.' }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      data: {
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        adresse: data.adresse,
        ville: data.ville,
        nom_logement: data.nom_logement,
        date_debut: data.date_debut ? new Date(data.date_debut).toLocaleDateString('fr-FR') : 'N/A',
        date_fin: data.date_fin ? new Date(data.date_fin).toLocaleDateString('fr-FR') : 'Non définie',
        participation_mensuelle: data.participation_mensuelle,
      }
    });
  } catch (error) {
    console.error('❌ Erreur GET signature:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Signer la convention
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token manquant' }, { status: 400 });
    }

    // Vérifier que le token est valide
    const result = await query(
      `SELECT b.id, b.signe FROM baux b WHERE b.signature_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Lien de signature invalide.' }, { status: 404 });
    }

    const bail = result.rows[0];

    if (bail.signe) {
      return NextResponse.json({ success: false, error: 'Cette convention a déjà été signée.' }, { status: 400 });
    }

    // Marquer comme signé
    await query(
      'UPDATE baux SET signe = true, date_signature = CURRENT_TIMESTAMP WHERE id = $1',
      [bail.id]
    );

    console.log(`✅ Bail ${bail.id} signé avec succès`);

    return NextResponse.json({
      success: true,
      message: 'Convention signée avec succès !',
    });
  } catch (error) {
    console.error('❌ Erreur POST signature:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la signature' }, { status: 500 });
  }
}
