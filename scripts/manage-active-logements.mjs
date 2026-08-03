#!/usr/bin/env node

/**
 * Liste et gère les logements actifs comptés pour le coût mensuel.
 *
 * Usage:
 *   node scripts/manage-active-logements.mjs --list [YYYY MM]
 *   node scripts/manage-active-logements.mjs --deactivate 16,17 --confirm [YYYY MM]
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

dotenv.config();

function toYmd(year, month, day) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatSqlDate(value) {
  if (!value) return 'Indetermine';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return toYmd(value.getFullYear(), value.getMonth() + 1, value.getDate());
  return String(value);
}

function euro(value) {
  return Number(value || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function parseIds(value) {
  return value
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isInteger(v) && v > 0);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const now = new Date();

  const parsed = {
    action: 'list',
    ids: [],
    confirm: false,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--list') {
      parsed.action = 'list';
      i += 1;
      continue;
    }

    if (arg === '--deactivate') {
      const idsArg = args[i + 1];
      if (!idsArg) {
        throw new Error('Option --deactivate requiert une liste d\'IDs (ex: 16,17).');
      }
      parsed.action = 'deactivate';
      parsed.ids = parseIds(idsArg);
      if (parsed.ids.length === 0) {
        throw new Error('Aucun ID valide fourni pour --deactivate.');
      }
      i += 2;
      continue;
    }

    if (arg === '--confirm') {
      parsed.confirm = true;
      i += 1;
      continue;
    }

    // Arguments libres: YYYY MM
    if (/^\d{4}$/.test(arg)) {
      const next = args[i + 1];
      if (!next || !/^\d{1,2}$/.test(next)) {
        throw new Error('Format attendu pour la période: YYYY MM (ex: 2026 08).');
      }
      parsed.year = Number(arg);
      parsed.month = Number(next);
      i += 2;
      continue;
    }

    throw new Error(`Argument inconnu: ${arg}`);
  }

  if (!Number.isInteger(parsed.year) || !Number.isInteger(parsed.month) || parsed.month < 1 || parsed.month > 12) {
    throw new Error('Période invalide. Mois attendu entre 1 et 12.');
  }

  return parsed;
}

async function getEligibleLogements(pool, startDate, endDate) {
  const sql = `
    WITH period AS (
      SELECT
        $1::DATE AS month_start,
        $2::DATE AS month_end,
        ($2::DATE - $1::DATE + 1) AS days_in_month
    ),
    eligible AS (
      SELECT
        l.id,
        COALESCE(NULLIF(TRIM(l.nom_logement), ''), l.adresse) AS nom_logement,
        l.adresse,
        COALESCE(l.ville, 'Non renseignée') AS ville,
        COALESCE(l.prix_loyer, 0)::numeric AS prix_loyer,
        l.date_debut_contrat::DATE AS date_debut,
        l.date_fin_contrat::DATE AS date_fin,
        COALESCE(l.est_actif, true) AS est_actif
      FROM logements l
      WHERE COALESCE(l.est_actif, true) = true
        AND COALESCE(l.prix_loyer, 0) > 0
        AND l.date_debut_contrat IS NOT NULL
        AND l.date_debut_contrat <= $2::DATE
        AND COALESCE(l.date_fin_contrat, 'infinity'::DATE) >= $1::DATE
    ),
    overlap AS (
      SELECT
        e.*,
        GREATEST(e.date_debut, p.month_start) AS overlap_start,
        LEAST(COALESCE(e.date_fin, p.month_end), p.month_end) AS overlap_end,
        p.days_in_month
      FROM eligible e
      CROSS JOIN period p
    )
    SELECT
      id,
      nom_logement,
      adresse,
      ville,
      prix_loyer,
      date_debut,
      date_fin,
      est_actif,
      overlap_start,
      overlap_end,
      days_in_month,
      CASE
        WHEN overlap_end < overlap_start THEN 0
        ELSE (overlap_end - overlap_start + 1)
      END AS overlap_days,
      CASE
        WHEN overlap_end < overlap_start THEN 0::numeric
        ELSE prix_loyer * ((overlap_end - overlap_start + 1)::numeric / NULLIF(days_in_month, 0)::numeric)
      END AS cout_mois
    FROM overlap
    ORDER BY ville, nom_logement;
  `;

  const result = await pool.query(sql, [startDate, endDate]);
  return result.rows;
}

async function deactivateLogements(pool, ids) {
  const sql = `
    UPDATE logements
    SET est_actif = false,
        updated_at = NOW()
    WHERE id = ANY($1::int[])
    RETURNING id, COALESCE(NULLIF(TRIM(nom_logement), ''), adresse) AS nom_logement, ville, est_actif;
  `;
  const result = await pool.query(sql, [ids]);
  return result.rows;
}

async function main() {
  const { action, ids, confirm, year, month } = parseArgs();
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDate = toYmd(year, month, 1);
  const endDate = toYmd(year, month, daysInMonth);

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL non défini dans l\'environnement.');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    const rows = await getEligibleLogements(pool, startDate, endDate);

    console.log(`\nGestion logements actifs - ${year}-${String(month).padStart(2, '0')}`);
    console.log(`Periode: ${startDate} -> ${endDate}`);
    console.log(`Logements actifs comptabilises: ${rows.length}\n`);

    if (rows.length === 0) {
      console.log('Aucun logement actif comptabilisé.');
      return;
    }

    for (const row of rows) {
      console.log(`- [${row.id}] ${row.nom_logement} (${row.ville})`);
      console.log(`  Actif: ${row.est_actif ? 'oui' : 'non'}`);
      console.log(`  Contrat: ${formatSqlDate(row.date_debut)} -> ${row.date_fin ? formatSqlDate(row.date_fin) : 'Indetermine'}`);
      console.log(`  Chevauchement: ${formatSqlDate(row.overlap_start)} -> ${formatSqlDate(row.overlap_end)} (${row.overlap_days}/${row.days_in_month} jours)`);
      console.log(`  Loyer: ${euro(row.prix_loyer)} | Coût retenu mois: ${euro(row.cout_mois)}\n`);
    }

    if (action === 'list') {
      console.log('Mode lecture seule: aucune modification appliquée.');
      return;
    }

    const existingIds = new Set(rows.map((r) => Number(r.id)));
    const invalidIds = ids.filter((id) => !existingIds.has(id));
    if (invalidIds.length > 0) {
      console.log(`IDs non éligibles pour la période ${year}-${String(month).padStart(2, '0')}: ${invalidIds.join(', ')}`);
    }

    const targetIds = ids.filter((id) => existingIds.has(id));
    if (targetIds.length === 0) {
      console.log('Aucun ID éligible à désactiver.');
      return;
    }

    if (!confirm) {
      console.log(`\nSimulation: les logements suivants seraient désactivés: ${targetIds.join(', ')}`);
      console.log('Ajouter --confirm pour appliquer réellement la désactivation.');
      return;
    }

    const updatedRows = await deactivateLogements(pool, targetIds);
    console.log(`\nDésactivation appliquée: ${updatedRows.length} logement(s).`);
    for (const row of updatedRows) {
      console.log(`- [${row.id}] ${row.nom_logement} (${row.ville}) -> est_actif=${row.est_actif}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Erreur:', error.message);
  process.exit(1);
});
