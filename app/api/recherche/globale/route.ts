import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withReadAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 25;

const getHandler = async (request: NextRequest, payload: TokenPayload) => {
  void payload;

  try {
    const { searchParams } = new URL(request.url);
    const rawQ = (searchParams.get('q') || '').trim();
    const parsedLimit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10);
    const ville = (searchParams.get('ville') || '').trim();
    const onlyActiveCollaborateurs = searchParams.get('only_active_collaborateurs') === 'true';
    const onlyActiveLogements = searchParams.get('only_active_logements') === 'true';
    const onlyFreeLits = searchParams.get('only_free_lits') === 'true';
    const onlyActiveBaux = searchParams.get('only_active_baux') === 'true';
    const limit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(parsedLimit, MAX_LIMIT))
      : DEFAULT_LIMIT;

    if (!rawQ || rawQ.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          collaborateurs: [],
          logements: [],
          baux: [],
          lits: [],
        },
      });
    }

    const q = `%${rawQ}%`;

    const collaborateursParams: unknown[] = [q];
    let collaborateursIndex = 2;
    let collaborateursSql = `
      SELECT
        c.id,
        c.prenom,
        c.nom,
        c.email,
        c.est_actif,
        c.role
      FROM collaborateurs c
      WHERE (
        c.prenom ILIKE $1
        OR c.nom ILIKE $1
        OR c.email ILIKE $1
      )`;

    if (onlyActiveCollaborateurs) {
      collaborateursSql += ` AND c.est_actif = true`;
    }
    collaborateursSql += ` ORDER BY c.est_actif DESC, c.nom ASC, c.prenom ASC LIMIT $${collaborateursIndex}`;
    collaborateursParams.push(limit);

    const logementsParams: unknown[] = [q];
    let logementsIndex = 2;
    let logementsSql = `
      SELECT
        l.id,
        l.nom_logement,
        l.adresse,
        l.ville,
        l.est_actif
      FROM logements l
      WHERE (
        l.nom_logement ILIKE $1
        OR l.adresse ILIKE $1
        OR l.ville ILIKE $1
      )`;

    if (ville) {
      logementsSql += ` AND l.ville = $${logementsIndex}`;
      logementsParams.push(ville);
      logementsIndex++;
    }
    if (onlyActiveLogements) {
      logementsSql += ` AND COALESCE(l.est_actif, true) = true`;
    }
    logementsSql += ` ORDER BY COALESCE(l.est_actif, true) DESC, l.nom_logement ASC, l.adresse ASC LIMIT $${logementsIndex}`;
    logementsParams.push(limit);

    const bauxParams: unknown[] = [q];
    let bauxIndex = 2;
    let bauxSql = `
      SELECT
        b.id,
        b.date_debut,
        b.date_fin,
        b.participation_mensuelle,
        c.id AS collaborateur_id,
        c.prenom,
        c.nom,
        l.id AS logement_id,
        l.nom_logement,
        l.ville
      FROM baux b
      LEFT JOIN collaborateurs c ON c.id = b.collaborateur_id
      LEFT JOIN logements l ON l.id = b.logement_id
      WHERE (
        CAST(b.id AS TEXT) ILIKE $1
        OR (c.prenom || ' ' || c.nom) ILIKE $1
        OR c.email ILIKE $1
        OR l.nom_logement ILIKE $1
        OR l.ville ILIKE $1
      )`;

    if (ville) {
      bauxSql += ` AND l.ville = $${bauxIndex}`;
      bauxParams.push(ville);
      bauxIndex++;
    }
    if (onlyActiveLogements) {
      bauxSql += ` AND COALESCE(l.est_actif, true) = true`;
    }
    if (onlyActiveBaux) {
      bauxSql += ` AND b.date_debut <= CURRENT_DATE AND (b.date_fin IS NULL OR b.date_fin >= CURRENT_DATE)`;
    }
    bauxSql += ` ORDER BY b.date_fin DESC NULLS LAST, b.id DESC LIMIT $${bauxIndex}`;
    bauxParams.push(limit);

    const litsParams: unknown[] = [q];
    let litsIndex = 2;
    let litsSql = `
      SELECT
        li.id,
        li.numero,
        li.type_lit,
        li.est_occupe,
        ch.id AS chambre_id,
        ch.nom AS chambre_nom,
        lo.id AS logement_id,
        lo.nom_logement,
        lo.adresse,
        lo.ville
      FROM lits li
      LEFT JOIN chambres ch ON ch.id = li.chambre_id
      LEFT JOIN logements lo ON lo.id = ch.logement_id
      WHERE (
        li.numero ILIKE $1
        OR ch.nom ILIKE $1
        OR lo.nom_logement ILIKE $1
        OR lo.adresse ILIKE $1
        OR lo.ville ILIKE $1
      )`;

    if (ville) {
      litsSql += ` AND lo.ville = $${litsIndex}`;
      litsParams.push(ville);
      litsIndex++;
    }
    if (onlyActiveLogements) {
      litsSql += ` AND COALESCE(lo.est_actif, true) = true`;
    }
    if (onlyFreeLits) {
      litsSql += ` AND li.est_occupe = false`;
    }
    litsSql += ` ORDER BY li.est_occupe ASC, lo.nom_logement ASC, ch.nom ASC, li.numero ASC LIMIT $${litsIndex}`;
    litsParams.push(limit);

    const [collaborateursResult, logementsResult, bauxResult, litsResult] = await Promise.all([
      query(collaborateursSql, collaborateursParams),
      query(logementsSql, logementsParams),
      query(bauxSql, bauxParams),
      query(litsSql, litsParams),
    ]);

    const [collaborateursCountResult, logementsCountResult, bauxCountResult, litsCountResult] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS total FROM collaborateurs c WHERE (c.prenom ILIKE $1 OR c.nom ILIKE $1 OR c.email ILIKE $1)${onlyActiveCollaborateurs ? ' AND c.est_actif = true' : ''}`,
        [q]
      ),
      query(
        `SELECT COUNT(*)::int AS total FROM logements l WHERE (l.nom_logement ILIKE $1 OR l.adresse ILIKE $1 OR l.ville ILIKE $1)${ville ? ' AND l.ville = $2' : ''}${onlyActiveLogements ? ` AND COALESCE(l.est_actif, true) = true` : ''}`,
        ville ? [q, ville] : [q]
      ),
      query(
        `SELECT COUNT(*)::int AS total
         FROM baux b
         LEFT JOIN collaborateurs c ON c.id = b.collaborateur_id
         LEFT JOIN logements l ON l.id = b.logement_id
         WHERE (
           CAST(b.id AS TEXT) ILIKE $1
           OR (c.prenom || ' ' || c.nom) ILIKE $1
           OR c.email ILIKE $1
           OR l.nom_logement ILIKE $1
           OR l.ville ILIKE $1
         )${ville ? ' AND l.ville = $2' : ''}${onlyActiveLogements ? ' AND COALESCE(l.est_actif, true) = true' : ''}${onlyActiveBaux ? " AND b.date_debut <= CURRENT_DATE AND (b.date_fin IS NULL OR b.date_fin >= CURRENT_DATE)" : ''}`,
        ville ? [q, ville] : [q]
      ),
      query(
        `SELECT COUNT(*)::int AS total
         FROM lits li
         LEFT JOIN chambres ch ON ch.id = li.chambre_id
         LEFT JOIN logements lo ON lo.id = ch.logement_id
         WHERE (
           li.numero ILIKE $1
           OR ch.nom ILIKE $1
           OR lo.nom_logement ILIKE $1
           OR lo.adresse ILIKE $1
           OR lo.ville ILIKE $1
         )${ville ? ' AND lo.ville = $2' : ''}${onlyActiveLogements ? ' AND COALESCE(lo.est_actif, true) = true' : ''}${onlyFreeLits ? ' AND li.est_occupe = false' : ''}`,
        ville ? [q, ville] : [q]
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        collaborateurs: collaborateursResult.rows,
        logements: logementsResult.rows,
        baux: bauxResult.rows,
        lits: litsResult.rows,
      },
      totals: {
        collaborateurs: collaborateursCountResult.rows[0]?.total || 0,
        logements: logementsCountResult.rows[0]?.total || 0,
        baux: bauxCountResult.rows[0]?.total || 0,
        lits: litsCountResult.rows[0]?.total || 0,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/recherche/globale', method: 'GET' });
    }

    return NextResponse.json(
      { error: 'Erreur lors de la recherche globale' },
      { status: 500 }
    );
  }
};

export const GET = withReadAuth(getHandler);
