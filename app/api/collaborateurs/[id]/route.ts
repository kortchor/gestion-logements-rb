import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { verifyCsrfMiddleware } from '@/lib/csrf';
import { logError } from '@/lib/logger';

let collaborateurDetailSchemaChecked = false;

async function ensureCollaborateurDetailSchema() {
  if (collaborateurDetailSchemaChecked) {
    return;
  }

  await query(`
    ALTER TABLE collaborateurs
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS date_arrivee DATE,
    ADD COLUMN IF NOT EXISTS date_depart DATE,
    ADD COLUMN IF NOT EXISTS date_debut_contrat DATE,
    ADD COLUMN IF NOT EXISTS date_fin_contrat DATE
  `);

  collaborateurDetailSchemaChecked = true;
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return value == null ? null : String(value);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return value == null ? null : String(value);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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
    if (error instanceof Error) {
      logError(error, { route: '/api/collaborateurs/[id]', method: 'GET' });
    }
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
};

const putCollaborateurHandler = async (
  request: NextRequest,
  payload: TokenPayload,
  { params }: { params: { id: string } }
) => {
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json({ success: false, error: 'CSRF token invalide' }, { status: 403 });
    }

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

    await ensureCollaborateurDetailSchema();

    if (!nom || typeof nom !== 'string' || nom.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Le nom est requis' }, { status: 400 });
    }
    if (!prenom || typeof prenom !== 'string' || prenom.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Le prénom est requis' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'L\'email est requis' }, { status: 400 });
    }

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
        toNullableString(nom),
        toNullableString(prenom),
        toNullableString(email),
        toNullableString(civilite),
        toNullableString(telephone),
        genre || 'F',
        toNullableDate(date_arrivee),
        toNullableDate(date_depart),
        toNullableDate(date_debut_contrat),
        toNullableDate(date_fin_contrat),
        vehicule === true || vehicule === 'true',
        animal === true || animal === 'true',
        toNullableString(commentaire),
        toNullableString(centre_principal),
        toNullableString(centre_affectation),
        collaborateurId,
      ]
    );

    // Log audit
    if (Object.keys(changes).length > 0) {
      await logAudit({
        userId: payload.id,
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
    if (error instanceof Error) {
      logError(error, { route: '/api/collaborateurs/[id]', method: 'PUT' });
    }
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
};

export const GET = withAuth(getCollaborateurHandler, ['admin', 'super_admin', 'user']);
export const PUT = withAuth(putCollaborateurHandler, ['admin', 'super_admin']);