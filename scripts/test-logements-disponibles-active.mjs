#!/usr/bin/env node

/**
 * Non-regression check for /api/logements/disponibles
 * Validates:
 * 1) returned logements are active by contract dates
 * 2) each chambre includes type_lit for simple/double UI filter
 */

const BASE_URL = process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000';

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isContractActiveToday(logement, today) {
  const start = toDate(logement.date_debut_contrat);
  const end = toDate(logement.date_fin_contrat);

  if (start && start > today) return false;
  if (end && end < today) return false;
  return true;
}

async function run() {
  console.log('Running non-regression check: /api/logements/disponibles');
  console.log(`Base URL: ${BASE_URL}`);

  const response = await fetch(`${BASE_URL}/api/logements/disponibles`);
  if (!response.ok) {
    throw new Error(`Endpoint failed with status ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Expected an array response from /api/logements/disponibles');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const inactiveByContract = data.filter((logement) => !isContractActiveToday(logement, today));

  const chambresWithoutType = [];
  for (const logement of data) {
    const chambres = Array.isArray(logement.chambres) ? logement.chambres : [];
    for (const chambre of chambres) {
      const typeLit = String(chambre?.type_lit || '').trim().toLowerCase();
      if (!['simple', 'double'].includes(typeLit)) {
        chambresWithoutType.push({ logementId: logement.id, chambreId: chambre?.id, type_lit: chambre?.type_lit });
      }
    }
  }

  const doublesAvailable = data.filter((logement) =>
    (logement.chambres || []).some((chambre) => {
      const isDouble = String(chambre?.type_lit || '').trim().toLowerCase() === 'double';
      const hasFreeBed = (chambre?.lits || []).some((lit) => !lit?.est_occupe);
      return isDouble && hasFreeBed;
    })
  ).length;

  console.log(`Returned logements: ${data.length}`);
  console.log(`Logements with available double beds: ${doublesAvailable}`);

  if (inactiveByContract.length > 0) {
    console.error('Found logements outside active contract window:');
    inactiveByContract.slice(0, 10).forEach((logement) => {
      console.error(`- logement ${logement.id}: start=${logement.date_debut_contrat || 'null'} end=${logement.date_fin_contrat || 'null'}`);
    });
    process.exit(1);
  }

  if (chambresWithoutType.length > 0) {
    console.error('Found chambres missing valid type_lit (simple/double):');
    chambresWithoutType.slice(0, 10).forEach((row) => {
      console.error(`- logement ${row.logementId}, chambre ${row.chambreId}, type_lit=${String(row.type_lit)}`);
    });
    process.exit(1);
  }

  console.log('PASS: endpoint returns active logements and valid chambre type_lit values.');
}

run().catch((error) => {
  console.error('FAIL:', error.message);
  process.exit(1);
});
