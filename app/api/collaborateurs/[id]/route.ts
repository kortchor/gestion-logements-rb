import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const getCollaborateurHandler = async (
  request: NextRequest,
  payload: TokenPayload,
  { params }: { params: { id: string } }
) => {
  try {
    const collaborateurId = parseInt(params.id, 10);

    if (isNaN(collaborateurId)) {
      return NextResponse.json({ success: false, error: 'ID de collaborateur invalide' }, { status: 400 });
    }

    const result = await query(
      'SELECT * FROM collaborateurs WHERE id = $1',
      [collaborateurId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Collaborateur non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Erreur GET /api/collaborateurs/[id]:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
};

const putCollaborateurHandler = async (
  request: NextRequest,
  payload: TokenPayload,
  { params }: { params: { id: string } }
) => {
  try {
    const collaborateurId = parseInt(params.id, 10);

    if (isNaN(collaborateurId)) {
      return NextResponse.json({ success: false, error: 'ID de collaborateur invalide' }, { status: 400 });
    }

    const body = await request.json();
    const {
      nom,
      prenom,
      email,
      civilite,
      telephone,
      genre,
      date_arrivee,
      date_depart,
      date_debut_contrat,
      date_fin_contrat,
      vehicule,
      animal,
      commentaire,
      centre_principal,
      centre_affectation,
    } = body;

    // Récupérer les données actuelles
    const currentResult = await query(
      'SELECT * FROM collaborateurs WHERE id = $1',
      [collaborateurId]
    );

    if (currentResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Collaborateur non trouvé' }, { status: 404 });
    }

    const currentData = currentResult.rows[0];

    // Préparer les changements
    const changes: Record<string, any> = {};
    if (nom && nom !== currentData.nom) changes.nom = { old: currentData.nom, new: nom };
    if (prenom && prenom !== currentData.prenom) changes.prenom = { old: currentData.prenom, new: prenom };
    if (email && email !== currentData.email) changes.email = { old: currentData.email, new: email };
    if (civilite !== currentData.civilite) changes.civilite = { old: currentData.civilite, new: civilite };

    // Mettre à jour
    const updateResult = await query(
      `UPDATE collaborateurs 
       SET nom = $1, prenom = $2, email = $3, civilite = $4, telephone = $5, genre = $6,
           date_arrivee = $7, date_depart = $8, date_debut_contrat = $9, date_fin_contrat = $10,
           vehicule = $11, animal = $12, commentaire = $13, centre_principal = $14, 
           centre_affectation = $15, updated_at = NOW()
       WHERE id = $16
       RETURNING *`,
      [
        nom,
        prenom,
        email,
        civilite || null,
        telephone || null,
        genre || 'F',
        date_arrivee || null,
        date_depart || null,
        date_debut_contrat || null,
        date_fin_contrat || null,
        vehicule === true || vehicule === 'true',
        animal === true || animal === 'true',
        commentaire || null,
        centre_principal || null,
        centre_affectation || null,
        collaborateurId,
      ]
    );

    // Log audit
    if (Object.keys(changes).length > 0) {
      await logAudit({
        userId: payload.sub,
        userEmail: payload.email,
        action: 'update',
        entityType: 'collaborateur',
        entityId: collaborateurId,
        changes,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      });
    }

    return NextResponse.json({ success: true, data: updateResult.rows[0] });
  } catch (error) {
    console.error('Erreur PUT /api/collaborateurs/[id]:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
};

export const GET = withAuth(getCollaborateurHandler, ['admin', 'super_admin', 'user']);
export const PUT = withAuth(putCollaborateurHandler, ['admin', 'super_admin']);