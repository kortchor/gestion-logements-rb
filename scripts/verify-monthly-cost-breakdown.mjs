#!/usr/bin/env node

/**
 * Vérifie le détail du coût mensuel des logements actifs avec prorata.
 * Usage:
 *   node scripts/verify-monthly-cost-breakdown.mjs
 *   node scripts/verify-monthly-cost-breakdown.mjs 2026 08
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

dotenv.config();

function parseArgs() {
  const [, , yearArg, monthArg] = process.argv;
  const now = new Date();

  const year = yearArg ? Number(yearArg) : now.getFullYear();
  const month = monthArg ? Number(monthArg) : now.getMonth() + 1;

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Arguments invalides. Utiliser: node scripts/verify-monthly-cost-breakdown.mjs [YYYY] [MM]');
  }

  return { year, month };
}

function toYmd(year, month, day) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatSqlDate(value) {
  if (!value) return 'Indetermine';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) {
    return toYmd(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  return String(value);
}

function euro(value) {
  return Number(value || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

async function main() {
  const { year, month } = parseArgs();

  const daysInMonth = new Date(year, month, 0).getDate();
  const startDate = toYmd(year, month, 1);
  const endDate = toYmd(year, month, daysInMonth);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL non défini dans l\'environnement.');
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
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
          l.date_fin_contrat::DATE AS date_fin
        FROM logements l
        WHERE COALESCE(l.est_actif, true) = true
          AND COALESCE(l.prix_loyer, 0) > 0
          AND l.date_debut_contrat IS NOT NULL
          AND l.date_debut_contrat <= $2::DATE
          AND COALESCE(l.date_fin_contrat, 'infinity'::DATE) >= $1::DATE
      ),
      overlap AS (
        SELECT
          e.id,
          e.nom_logement,
          e.adresse,
          e.ville,
          e.prix_loyer,
          e.date_debut,
          e.date_fin,
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
    const rows = result.rows;

    console.log(`\nVerification cout mensuel proratisé - ${year}-${String(month).padStart(2, '0')}`);
    console.log(`Periode: ${startDate} -> ${endDate}`);
    console.log(`Logements retenus: ${rows.length}\n`);

    if (rows.length === 0) {
      console.log('Aucun logement éligible trouvé.');
      return;
    }

    let total = 0;
    for (const row of rows) {
      const cout = Number(row.cout_mois || 0);
      total += cout;
      console.log(`- [${row.id}] ${row.nom_logement} (${row.ville})`);
      console.log(`  Loyer mensuel: ${euro(row.prix_loyer)}`);
      console.log(`  Contrat: ${formatSqlDate(row.date_debut)} -> ${row.date_fin ? formatSqlDate(row.date_fin) : 'Indetermine'}`);
      console.log(`  Chevauchement: ${formatSqlDate(row.overlap_start)} -> ${formatSqlDate(row.overlap_end)}`);
      console.log(`  Jours actifs: ${row.overlap_days}/${row.days_in_month}`);
      console.log(`  Coût retenu: ${euro(cout)}\n`);
    }

    console.log(`TOTAL RECONSTITUE: ${euro(total)}`);

    const apiSql = `
      WITH period AS (
        SELECT $1::DATE AS month_start, $2::DATE AS month_end, ($2::DATE - $1::DATE + 1) AS days_in_month
      ),
      eligible AS (
        SELECT COALESCE(l.prix_loyer, 0)::numeric AS prix_loyer,
               l.date_debut_contrat::DATE AS date_debut,
               l.date_fin_contrat::DATE AS date_fin
        FROM logements l
        WHERE COALESCE(l.est_actif, true) = true
          AND COALESCE(l.prix_loyer, 0) > 0
          AND l.date_debut_contrat IS NOT NULL
          AND l.date_debut_contrat <= $2::DATE
          AND COALESCE(l.date_fin_contrat, 'infinity'::DATE) >= $1::DATE
      ),
      overlap AS (
        SELECT e.prix_loyer,
               GREATEST(e.date_debut, p.month_start) AS overlap_start,
               LEAST(COALESCE(e.date_fin, p.month_end), p.month_end) AS overlap_end,
               p.days_in_month
        FROM eligible e
        CROSS JOIN period p
      )
      SELECT COALESCE(SUM(
        CASE
          WHEN overlap_end < overlap_start THEN 0
          ELSE prix_loyer * ((overlap_end - overlap_start + 1)::numeric / NULLIF(days_in_month, 0)::numeric)
        END
      ), 0) AS total_loyer
      FROM overlap;
    `;

    const apiResult = await pool.query(apiSql, [startDate, endDate]);
    const apiTotal = Number(apiResult.rows[0]?.total_loyer || 0);
    console.log(`TOTAL API THEORIQUE: ${euro(apiTotal)}`);
    console.log(`ECART (reconstitue - API): ${euro(total - apiTotal)}\n`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Erreur:', error.message);
  process.exit(1);
});
