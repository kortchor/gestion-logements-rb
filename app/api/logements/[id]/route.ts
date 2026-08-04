import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { verifyCsrfMiddleware } from '@/lib/csrf';
import { logError } from '@/lib/logger';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import {
  computeRemovedPhotoPublicIds,
  deleteEtatLieuxPhotosFromCloudinary,
  normalizeEtatLieuxPhotosForStorage,
  parseEtatLieuxPhotosInput,
} from '@/lib/etat-lieux-photos';

// ✅ GET - Récupérer un logement avec ses chambres
const getHandler = async (
  request: NextRequest,
  _payload: TokenPayload,
  context: { params: Record<string, string | string[] | undefined> }
) => {
  try {
    const idParam = context.params.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    const logementId = parseInt(id || '', 10);

    if (isNaN(logementId)) {
      return NextResponse.json(
        { error: 'ID de logement invalide' },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT * FROM logements WHERE id = $1`,
      [logementId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Logement non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/logements/[id]', method: 'GET' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
};

// ✅ PUT - Mettre à jour un logement
const putHandler = async (
  request: NextRequest,
  _payload: TokenPayload,
  context: { params: Record<string, string | string[] | undefined> }
) => {
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json(
        { error: 'CSRF token invalide' },
        { status: 403 }
      );
    }

    const idParam = context.params.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    const logementId = parseInt(id || '', 10);

    if (isNaN(logementId)) {
      return NextResponse.json(
        { error: 'ID de logement invalide' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      nom_logement,
      adresse,
      ville,
      type,
      prix_loyer,
      proprietaire,
      contact_proprietaire,
      fournisseur_edf,
      fournisseur_eau,
      fournisseur_gaz,
      nom_assureur,
      assurance,
      assurance_pdf,
      assurance_nom,
      bail_pdf,
      bail_nom,
      etat_lieux_pdf,
      etat_lieux_nom,
      etat_lieux_photos,
      date_debut_contrat,
      date_fin_contrat,
      est_visible,
      mixte_autorise,
      description_detaillee,
      chambres,
    } = body;

    const currentResult = await query('SELECT etat_lieux_photos FROM logements WHERE id = $1', [logementId]);
    if (currentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Logement non trouvé' },
        { status: 404 }
      );
    }

    const previousPhotos = parseEtatLieuxPhotosInput(currentResult.rows[0]?.etat_lieux_photos);
    const normalizedEtatLieuxPhotos = await normalizeEtatLieuxPhotosForStorage(etat_lieux_photos);

    // Mettre à jour le logement
    await query(
      `UPDATE logements 
       SET nom_logement = $1, adresse = $2, ville = $3, type = $4, prix_loyer = $5,
           proprietaire = $6, contact_proprietaire = $7,
           fournisseur_edf = $8, fournisseur_eau = $9, fournisseur_gaz = $10,
           nom_assureur = $11, assurance = $12, assurance_pdf = $13, assurance_nom = $14,
           bail_pdf = $15, bail_nom = $16,
           etat_lieux_pdf = $17, etat_lieux_nom = $18, etat_lieux_photos = $19,
           date_debut_contrat = $20, date_fin_contrat = $21,
           est_visible = $22, mixte_autorise = $23, description_detaillee = $24
       WHERE id = $25`,
      [
        nom_logement || null,
        adresse,
        ville,
        type,
        prix_loyer || null,
        proprietaire || null,
        contact_proprietaire || null,
        fournisseur_edf || null,
        fournisseur_eau || null,
        fournisseur_gaz || null,
        nom_assureur || null,
        assurance || null,
        assurance_pdf || null,
        assurance_nom || null,
        bail_pdf || null,
        bail_nom || null,
        etat_lieux_pdf || null,
        etat_lieux_nom || null,
        normalizedEtatLieuxPhotos.length ? JSON.stringify(normalizedEtatLieuxPhotos) : null,
        date_debut_contrat || null,
        date_fin_contrat || null,
        est_visible !== undefined ? est_visible : true,
        mixte_autorise || false,
        description_detaillee || null,
        logementId,
      ]
    );

    // Mettre à jour les chambres (supprimer et recréer)
    await query('DELETE FROM chambres WHERE logement_id = $1', [logementId]);

    if (chambres && chambres.length > 0) {
      for (const chambre of chambres) {
        // Créer la chambre
        const chambreResult = await query(
          `INSERT INTO chambres (logement_id, nom, type_lit, nombre_lits)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [logementId, chambre.nom, chambre.type_lit, chambre.nombre_lits || 1]
        );

        const chambreId = chambreResult.rows[0].id;

        // Créer les lits automatiquement
        const nombreLits = chambre.nombre_lits || 1;
        for (let i = 1; i <= nombreLits; i++) {
          await query(
            `INSERT INTO lits (chambre_id, numero, type_lit)
             VALUES ($1, $2, $3)`,
            [chambreId, `${chambre.nom}-L${i}`, chambre.type_lit]
          );
        }
      }
    }

    const removedPublicIds = computeRemovedPhotoPublicIds(previousPhotos, normalizedEtatLieuxPhotos);
    try {
      await deleteEtatLieuxPhotosFromCloudinary(removedPublicIds);
    } catch (cleanupError) {
      if (cleanupError instanceof Error) {
        logError(cleanupError, {
          route: '/api/logements/[id]',
          method: 'PUT',
          context: 'cloudinary-photo-cleanup',
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Logement mis à jour' });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/logements/[id]', method: 'PUT' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
};

export const GET = withAuth(getHandler, ['admin', 'super_admin', 'admin_readonly']);
export const PUT = withAuth(putHandler, ['admin', 'super_admin']);