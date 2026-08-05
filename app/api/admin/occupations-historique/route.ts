import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { query } from '@/lib/db';
import { verifyCsrfMiddleware } from '@/lib/csrf';
import { logError } from '@/lib/logger';

async function ensureHistorySchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS lit_occupations_historique (
      id SERIAL PRIMARY KEY,
      lit_id INTEGER NOT NULL REFERENCES lits(id) ON DELETE CASCADE,
      collaborateur_id INTEGER NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
      date_debut DATE NOT NULL,
      date_fin DATE NOT NULL,
      commentaire TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

const getHandler = async (_request: NextRequest, payload: TokenPayload) => {
  if (!['admin', 'super_admin'].includes(payload.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  try {
    await ensureHistorySchema();

    const [logementsRes, collaborateursRes, historiqueRes] = await Promise.all([
      query(
        `SELECT
          log.id AS logement_id,
          COALESCE(NULLIF(TRIM(log.nom_logement), ''), log.adresse) AS logement_label,
          ch.id AS chambre_id,
          ch.nom AS chambre_nom,
          l.id AS lit_id,
          l.numero AS lit_numero
         FROM logements log
         JOIN chambres ch ON ch.logement_id = log.id
         JOIN lits l ON l.chambre_id = ch.id
         WHERE COALESCE(log.est_actif, true) = true
         ORDER BY logement_label, ch.nom, l.numero`
      ),
      query(
        `SELECT id, prenom, nom
         FROM collaborateurs
         ORDER BY nom, prenom`
      ),
      query(
        `SELECT
          h.id,
          h.lit_id,
          h.collaborateur_id,
          h.date_debut,
          h.date_fin,
          h.commentaire,
          h.created_at,
          l.numero AS lit_numero,
          ch.nom AS chambre_nom,
          COALESCE(NULLIF(TRIM(log.nom_logement), ''), log.adresse) AS logement_label,
          c.prenom,
          c.nom
         FROM lit_occupations_historique h
         JOIN lits l ON l.id = h.lit_id
         JOIN chambres ch ON ch.id = l.chambre_id
         JOIN logements log ON log.id = ch.logement_id
         JOIN collaborateurs c ON c.id = h.collaborateur_id
         ORDER BY h.date_debut DESC, h.id DESC
         LIMIT 200`
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        beds: logementsRes.rows,
        collaborateurs: collaborateursRes.rows,
        history: historiqueRes.rows,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/occupations-historique', method: 'GET' });
    }
    return NextResponse.json({ error: 'Erreur lors du chargement des données.' }, { status: 500 });
  }
};

const postHandler = async (request: NextRequest, payload: TokenPayload) => {
  if (!['admin', 'super_admin'].includes(payload.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json({ error: 'CSRF token invalide' }, { status: 403 });
    }

    await ensureHistorySchema();

    const body = await request.json();
    const litId = Number.parseInt(String(body.lit_id), 10);
    const collaborateurId = Number.parseInt(String(body.collaborateur_id), 10);
    const dateDebut = String(body.date_debut || '');
    const dateFin = String(body.date_fin || '');
    const commentaire = typeof body.commentaire === 'string' ? body.commentaire.trim() : null;

    if (!Number.isInteger(litId) || !Number.isInteger(collaborateurId) || !dateDebut || !dateFin) {
      return NextResponse.json(
        { error: 'lit_id, collaborateur_id, date_debut et date_fin sont obligatoires.' },
        { status: 400 }
      );
    }

    if (dateDebut > dateFin) {
      return NextResponse.json(
        { error: 'La date de début doit être antérieure ou égale à la date de fin.' },
        { status: 400 }
      );
    }

    const checkLit = await query('SELECT id FROM lits WHERE id = $1', [litId]);
    if (checkLit.rows.length === 0) {
      return NextResponse.json({ error: 'Lit introuvable.' }, { status: 404 });
    }

    const checkCollab = await query('SELECT id FROM collaborateurs WHERE id = $1', [collaborateurId]);
    if (checkCollab.rows.length === 0) {
      return NextResponse.json({ error: 'Collaborateur introuvable.' }, { status: 404 });
    }

    const overlap = await query(
      `SELECT id
       FROM lit_occupations_historique
       WHERE lit_id = $1
         AND collaborateur_id = $2
         AND daterange(date_debut, date_fin, '[]') && daterange($3::date, $4::date, '[]')
       LIMIT 1`,
      [litId, collaborateurId, dateDebut, dateFin]
    );

    if (overlap.rows.length > 0) {
      return NextResponse.json(
        { error: 'Un historique similaire existe déjà pour ce collaborateur sur ce lit dans cette période.' },
        { status: 409 }
      );
    }

    const insertResult = await query(
      `INSERT INTO lit_occupations_historique (lit_id, collaborateur_id, date_debut, date_fin, commentaire)
       VALUES ($1, $2, $3::date, $4::date, $5)
       RETURNING id`,
      [litId, collaborateurId, dateDebut, dateFin, commentaire || null]
    );

    return NextResponse.json({ success: true, id: insertResult.rows[0].id });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/occupations-historique', method: 'POST' });
    }
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement de l\'historique.' }, { status: 500 });
  }
};

export const GET = withAuth(getHandler, ['admin', 'super_admin']);
export const POST = withAuth(postHandler, ['admin', 'super_admin']);
