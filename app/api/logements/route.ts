import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { verifyCsrfMiddleware } from '@/lib/csrf';
import { logError } from '@/lib/logger';
import { logAudit } from '@/lib/audit';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { logApiTransferMetrics } from '@/lib/api-transfer-metrics';
import {
  deleteEtatLieuxPhotosFromCloudinary,
  normalizeEtatLieuxPhotosForStorage,
  parseEtatLieuxPhotosInput,
} from '@/lib/etat-lieux-photos';

let logementsSchemaChecked = false;

async function ensureLogementsSchema() {
  if (logementsSchemaChecked) {
    return;
  }

  await query(`
    ALTER TABLE logements
    ADD COLUMN IF NOT EXISTS nom_logement VARCHAR(255),
    ADD COLUMN IF NOT EXISTS fournisseur_gaz VARCHAR(255),
    ADD COLUMN IF NOT EXISTS nom_assureur VARCHAR(255),
    ADD COLUMN IF NOT EXISTS bail_pdf TEXT,
    ADD COLUMN IF NOT EXISTS bail_nom VARCHAR(255),
    ADD COLUMN IF NOT EXISTS etat_lieux_pdf TEXT,
    ADD COLUMN IF NOT EXISTS etat_lieux_nom VARCHAR(255),
    ADD COLUMN IF NOT EXISTS etat_lieux_photos TEXT,
    ADD COLUMN IF NOT EXISTS date_debut_contrat DATE,
    ADD COLUMN IF NOT EXISTS date_fin_contrat DATE,
    ADD COLUMN IF NOT EXISTS mixte_autorise BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS description_detaillee TEXT,
    ADD COLUMN IF NOT EXISTS est_actif BOOLEAN DEFAULT true
  `);

  logementsSchemaChecked = true;
}

// ✅ GET - Récupérer tous les logements ou un seul avec ?id=
const getHandler = async (request: NextRequest, _payload: TokenPayload) => {
  const startedAt = Date.now();
  void _payload;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const view = (searchParams.get('view') || 'summary').toLowerCase();
    const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '100', 10), 500));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    if (id) {
      const result = await query(
        `SELECT 
          l.id,
          l.nom_logement,
          l.adresse,
          l.ville,
          l.type,
          l.prix_loyer,
          l.proprietaire,
          l.contact_proprietaire,
          l.fournisseur_edf,
          l.fournisseur_eau,
          l.fournisseur_gaz,
          l.nom_assureur,
          l.assurance,
          l.assurance_pdf,
          l.assurance_nom,
          l.bail_pdf,
          l.bail_nom,
          l.etat_lieux_pdf,
          l.etat_lieux_nom,
          l.etat_lieux_photos,
          l.date_debut_contrat,
          l.date_fin_contrat,
          l.est_visible,
          l.mixte_autorise,
          l.description_detaillee,
          l.est_actif,
          l.created_at,
          l.updated_at,
          COUNT(c.id) as nombre_chambres,
          COALESCE(SUM(c.nombre_lits), 0) as total_lits
         FROM logements l
         LEFT JOIN chambres c ON l.id = c.logement_id
         WHERE l.id = $1
         GROUP BY l.id`,
        [parseInt(id)]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Logement non trouvé' },
          { status: 404 }
        );
      }
      
      const payload = { success: true, data: result.rows[0] };
      logApiTransferMetrics('/api/logements', payload, { startedAt });
      return NextResponse.json(payload);
    }

    const listQuery = view === 'full'
      ? `SELECT 
          l.id,
          l.nom_logement,
          l.adresse,
          l.ville,
          l.type,
          l.prix_loyer,
          l.proprietaire,
          l.contact_proprietaire,
          l.fournisseur_edf,
          l.fournisseur_eau,
          l.fournisseur_gaz,
          l.nom_assureur,
          l.assurance,
          l.assurance_pdf,
          l.assurance_nom,
          l.bail_pdf,
          l.bail_nom,
          l.etat_lieux_pdf,
          l.etat_lieux_nom,
          l.etat_lieux_photos,
          l.date_debut_contrat,
          l.date_fin_contrat,
          l.est_visible,
          l.mixte_autorise,
          l.description_detaillee,
          l.est_actif,
          l.created_at,
          l.updated_at,
          COUNT(c.id) as nombre_chambres,
          COALESCE(SUM(c.nombre_lits), 0) as total_lits
        FROM logements l
        LEFT JOIN chambres c ON l.id = c.logement_id
        GROUP BY l.id
        ORDER BY l.id`
      : `SELECT 
          l.id,
          l.nom_logement,
          l.adresse,
          l.ville,
          l.type,
          l.prix_loyer,
          l.est_visible,
          l.mixte_autorise,
          l.est_actif,
          l.date_debut_contrat,
          l.date_fin_contrat,
          COUNT(c.id) as nombre_chambres,
          COALESCE(SUM(c.nombre_lits), 0) as total_lits
        FROM logements l
        LEFT JOIN chambres c ON l.id = c.logement_id
        GROUP BY l.id
        ORDER BY l.id`;

    const [result, countResult] = await Promise.all([
      query(`${listQuery} LIMIT $1 OFFSET $2`, [limit, offset]),
      query(
        `SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE COALESCE(est_actif, true) = true)::int AS actifs
         FROM logements`
      ),
    ]);

    const total = parseInt(countResult.rows[0]?.total || '0', 10);
    const actifs = parseInt(countResult.rows[0]?.actifs || '0', 10);
    const payload = {
      success: true,
      data: result.rows,
      counts: {
        total,
        actifs,
      },
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + result.rows.length < total,
      },
    };
    logApiTransferMetrics('/api/logements', payload, { startedAt });
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/logements', method: 'GET' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
};

// ✅ POST - Créer un logement avec ses chambres
const postHandler = async (request: NextRequest, _payload: TokenPayload) => {
  void _payload;
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json(
        { error: 'CSRF token invalide' },
        { status: 403 }
      );
    }

    await ensureLogementsSchema();

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

    const normalizedEtatLieuxPhotos = await normalizeEtatLieuxPhotosForStorage(etat_lieux_photos);

    // Insérer le logement
    const result = await query(
      `INSERT INTO logements (
        nom_logement, adresse, ville, type, prix_loyer,
        proprietaire, contact_proprietaire,
        fournisseur_edf, fournisseur_eau, fournisseur_gaz,
        nom_assureur, assurance, assurance_pdf, assurance_nom,
        bail_pdf, bail_nom,
        etat_lieux_pdf, etat_lieux_nom, etat_lieux_photos,
        date_debut_contrat, date_fin_contrat,
        est_visible, mixte_autorise, description_detaillee
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING id`,
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
      ]
    );

    const logementId = result.rows[0].id;

    // Insérer les chambres ET créer les lits automatiquement
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

    await logAudit({
      action: 'create',
      entityType: 'logement',
      entityId: logementId,
      changes: {
        nom_logement: nom_logement || null,
        adresse,
        ville,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json(
      { success: true, id: logementId },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/logements', method: 'POST' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la création' },
      { status: 500 }
    );
  }
};

// ✅ DELETE - Supprimer un logement
const deleteHandler = async (request: NextRequest, _payload: TokenPayload) => {
  void _payload;
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json(
        { error: 'CSRF token invalide' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID du logement requis' },
        { status: 400 }
      );
    }

    const logementId = parseInt(id);

    const checkResult = await query(
      'SELECT id, etat_lieux_photos FROM logements WHERE id = $1',
      [logementId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Logement non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer les chambres (CASCADE gère les lits)
    await query('DELETE FROM chambres WHERE logement_id = $1', [logementId]);
    await query('DELETE FROM logements WHERE id = $1', [logementId]);

    const previousPhotos = parseEtatLieuxPhotosInput(checkResult.rows[0]?.etat_lieux_photos);
    try {
      await deleteEtatLieuxPhotosFromCloudinary(previousPhotos.map((photo) => photo.public_id));
    } catch (cleanupError) {
      if (cleanupError instanceof Error) {
        logError(cleanupError, {
          route: '/api/logements',
          method: 'DELETE',
          context: 'cloudinary-photo-cleanup',
        });
      }
    }

    await logAudit({
      action: 'delete',
      entityType: 'logement',
      entityId: logementId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json(
      { success: true, message: 'Logement supprimé' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/logements', method: 'DELETE' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
};

export const GET = withAuth(getHandler, ['admin', 'super_admin', 'admin_readonly']);
export const POST = withAuth(postHandler, ['admin', 'super_admin']);
export const DELETE = withAuth(deleteHandler, ['admin', 'super_admin']);