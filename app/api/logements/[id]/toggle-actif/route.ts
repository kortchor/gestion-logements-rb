import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withWriteAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';

const toggleHandler = async (
  request: NextRequest,
  payload: TokenPayload,
  { params }: { params: { id: string } }
) => {
  try {
    const logementId = parseInt(params.id);
    if (isNaN(logementId)) {
      return NextResponse.json({ success: false, error: 'ID invalide' }, { status: 400 });
    }

    const result = await query(
      'UPDATE logements SET est_actif = NOT COALESCE(est_actif, true) WHERE id = $1 RETURNING id, adresse, est_actif',
      [logementId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Logement non trouvé' }, { status: 404 });
    }

    const logement = result.rows[0];
    return NextResponse.json({
      success: true,
      message: logement.est_actif ? '✅ Logement réactivé' : '⏸️ Logement désactivé (loyer non compté)',
      data: logement,
    });
  } catch (error) {
    console.error('❌ Erreur toggle logement:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
};

export const POST = withWriteAuth(toggleHandler);
