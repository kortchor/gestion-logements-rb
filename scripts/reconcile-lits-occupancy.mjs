import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const target = process.argv.find((arg) => arg.startsWith('--logement='));
  const logementKeyword = target ? target.split('=')[1] : null;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lit_occupants (
      id SERIAL PRIMARY KEY,
      lit_id INTEGER NOT NULL REFERENCES lits(id) ON DELETE CASCADE,
      collaborateur_id INTEGER NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(lit_id, collaborateur_id)
    )
  `);

  const reconcileSql = `
    WITH current_occupants AS (
      SELECT
        l.id AS lit_id,
        COALESCE(lo_counts.occupants_count, CASE WHEN l.collaborateur_id IS NOT NULL THEN 1 ELSE 0 END) AS occupants_count,
        COALESCE(primary_lo.collaborateur_id, l.collaborateur_id) AS primary_collaborateur_id
      FROM lits l
      LEFT JOIN (
        SELECT lit_id, COUNT(*)::int AS occupants_count
        FROM lit_occupants
        GROUP BY lit_id
      ) lo_counts ON lo_counts.lit_id = l.id
      LEFT JOIN LATERAL (
        SELECT lo.collaborateur_id
        FROM lit_occupants lo
        WHERE lo.lit_id = l.id
        ORDER BY lo.created_at
        LIMIT 1
      ) primary_lo ON true
    )
    UPDATE lits l
    SET est_occupe = (co.occupants_count > 0),
        collaborateur_id = co.primary_collaborateur_id
    FROM current_occupants co
    WHERE l.id = co.lit_id
    RETURNING l.id;
  `;

  const updated = await pool.query(reconcileSql);
  console.log(`Reconciliation terminee: ${updated.rowCount} lit(s) synchronise(s).`);

  if (logementKeyword) {
    const result = await pool.query(
      `SELECT
        COALESCE(NULLIF(TRIM(log.nom_logement), ''), log.adresse) AS logement,
        ch.nom AS chambre,
        l.numero AS lit,
        l.est_occupe,
        l.collaborateur_id,
        COALESCE(lo_counts.occupants_count, 0) AS occupants_count
      FROM logements log
      JOIN chambres ch ON ch.logement_id = log.id
      JOIN lits l ON l.chambre_id = ch.id
      LEFT JOIN (
        SELECT lit_id, COUNT(*)::int AS occupants_count
        FROM lit_occupants
        GROUP BY lit_id
      ) lo_counts ON lo_counts.lit_id = l.id
      WHERE log.nom_logement ILIKE $1 OR log.adresse ILIKE $1
      ORDER BY logement, chambre, lit`,
      [`%${logementKeyword}%`]
    );

    console.log(`\nEtat des lits pour "${logementKeyword}":`);
    console.log(JSON.stringify(result.rows, null, 2));
  }
}

run()
  .catch((error) => {
    console.error('Erreur reconciliation:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
