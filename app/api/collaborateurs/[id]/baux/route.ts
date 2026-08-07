import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { logApiTransferMetrics } from '@/lib/api-transfer-metrics';

let collaborateurBauxIndexesChecked = false;

async function ensureCollaborateurBauxIndexes() {
  if (collaborateurBauxIndexesChecked) {
    return;
  }

  await query('CREATE INDEX IF NOT EXISTS idx_baux_collaborateur_dates ON baux(collaborateur_id, date_debut DESC, date_fin)');
  await query('CREATE INDEX IF NOT EXISTS idx_baux_collaborateur_date_fin ON baux(collaborateur_id, date_fin)');
  await query('CREATE INDEX IF NOT EXISTS idx_logements_id_nom_adresse ON logements(id, nom_logement, adresse)');

  collaborateurBauxIndexesChecked = true;
}

const getBauxHandler = async (
  request: NextRequest,
  payload: TokenPayload, // Le payload du token est maintenant disponible
  { params }: { params: { id: string } }
) => {
  const startedAt = Date.now();
  void payload;
  try {
    await ensureCollaborateurBauxIndexes();

    const collaborateurId = parseInt(params.id, 10);
    const { searchParams } = new URL(request.url);
    const includePhotos = searchParams.get('include_photos') === 'true';
    const rawStatus = (searchParams.get('status') || 'all').toLowerCase();
    const status: 'all' | 'actif' | 'historique' =
      rawStatus === 'actif' || rawStatus === 'historique' ? rawStatus : 'all';
    const rawLimit = searchParams.get('limit');
    const rawOffset = searchParams.get('offset');
    const usePagination = rawLimit !== null || rawOffset !== null;
    const limit = Math.max(1, Math.min(parseInt(rawLimit || '100', 10), 500));
    const offset = Math.max(0, parseInt(rawOffset || '0', 10));

    if (isNaN(collaborateurId)) {
      return NextResponse.json({ error: 'ID de collaborateur invalide' }, { status: 400 });
    }

    console.log('📋 Récupération des baux pour le collaborateur:', collaborateurId);

    // ✅ AMÉLIORATION : Requête SQL entièrement refactorisée pour être plus robuste et performante
    // en utilisant les fonctions d'agrégation JSON de PostgreSQL.
    const statusFilter =
      status === 'actif'
        ? " AND b.date_fin IS NOT NULL AND b.date_fin::date > CURRENT_DATE"
        : status === 'historique'
          ? ' AND (b.date_fin IS NULL OR b.date_fin::date <= CURRENT_DATE)'
          : '';
    const paginationClause = usePagination ? ' LIMIT $2 OFFSET $3' : '';
    const queryText = includePhotos
      ? `SELECT
          b.id, b.date_debut, b.date_fin, b.participation_mensuelle, b.chambre_privée, b.signe,
          json_build_object(
            'id', l.id,
            'nom', COALESCE(l.nom_logement, 'N/A'),
            'adresse', COALESCE(l.adresse, 'N/A'),
            'etat_lieux_photos', l.etat_lieux_photos
          ) as logement
        FROM baux AS b
        LEFT JOIN logements AS l ON b.logement_id = l.id
        WHERE b.collaborateur_id = $1
        ${statusFilter}
        ORDER BY b.date_debut DESC${paginationClause}`
      : `SELECT
          b.id, b.date_debut, b.date_fin, b.participation_mensuelle, b.chambre_privée, b.signe,
          json_build_object(
            'id', l.id,
            'nom', COALESCE(l.nom_logement, 'N/A'),
            'adresse', COALESCE(l.adresse, 'N/A')
          ) as logement
        FROM baux AS b
        LEFT JOIN logements AS l ON b.logement_id = l.id
        WHERE b.collaborateur_id = $1
        ${statusFilter}
        ORDER BY b.date_debut DESC${paginationClause}`;

    const queryParams = usePagination
      ? [collaborateurId, limit, offset]
      : [collaborateurId];

    const [result, totalsByStatusResult] = await Promise.all([
      query(queryText, queryParams),
      query(
        `SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE b.date_fin IS NOT NULL AND b.date_fin::date > CURRENT_DATE)::int AS actifs,
          COUNT(*) FILTER (WHERE b.date_fin IS NULL OR b.date_fin::date <= CURRENT_DATE)::int AS historique
         FROM baux b
         WHERE b.collaborateur_id = $1`,
        [collaborateurId]
      ),
    ]);
    
    // ✅ Standardiser la réponse pour qu'elle corresponde aux attentes du front-end
    const totalAll = parseInt(totalsByStatusResult.rows[0]?.total || '0', 10);
    const actifsAll = parseInt(totalsByStatusResult.rows[0]?.actifs || '0', 10);
    const historiqueAll = parseInt(totalsByStatusResult.rows[0]?.historique || '0', 10);
    const total = status === 'actif' ? actifsAll : status === 'historique' ? historiqueAll : totalAll;
    const actifs = status === 'actif' ? actifsAll : Math.max(0, total - historiqueAll);
    const historique = status === 'historique' ? historiqueAll : Math.max(0, total - actifsAll);
    const payloadResponse = {
      success: true,
      data: result.rows,
      counts: {
        total,
        actifs,
        historique,
      },
      totalsByStatus: {
        total: totalAll,
        actifs: actifsAll,
        historique: historiqueAll,
      },
      pagination: usePagination
        ? {
            limit,
            offset,
            total,
            hasMore: offset + result.rows.length < total,
          }
        : undefined,
    };
    logApiTransferMetrics('/api/collaborateurs/[id]/baux', payloadResponse, { startedAt });
    return NextResponse.json(payloadResponse, { status: 200 });
  } catch (error) {
    console.error('❌ Erreur GET baux:', error);
    // ✅ CORRECTION : Standardiser la réponse d'erreur pour correspondre aux attentes du front-end
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de la récupération des baux' },
      { status: 500 }
    );
  }
}

// Exporter la méthode GET protégée par l'authentification
export const GET = withAuth(getBauxHandler, ['admin', 'super_admin', 'user']);
