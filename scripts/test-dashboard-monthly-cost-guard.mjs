#!/usr/bin/env node

/**
 * Static non-regression guard for dashboard monthly cost logic.
 * Ensures monthly cost query remains based on active logements by contract window,
 * not on active baux assignments.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const routePath = path.join(process.cwd(), 'app', 'api', 'dashboard', 'costs', 'route.ts');

async function run() {
  const content = await readFile(routePath, 'utf8');

  const monthlyStart = content.indexOf('const monthlyHandler');
  const monthlyEnd = content.indexOf('const byAnalyticalCenterHandler');
  if (monthlyStart < 0 || monthlyEnd < 0 || monthlyEnd <= monthlyStart) {
    console.error('FAIL: unable to isolate monthlyHandler section in dashboard costs route.');
    process.exit(1);
  }

  const monthlySection = content.slice(monthlyStart, monthlyEnd);

  const requiredPatterns = [
    'WITH period AS',
    'FROM logements l',
    'l.date_debut_contrat IS NOT NULL',
    "COALESCE(l.date_fin_contrat, 'infinity'::DATE) >= $1::DATE",
    'GREATEST(e.date_debut, p.month_start)',
    'LEAST(COALESCE(e.date_fin, p.month_end), p.month_end)',
    '(overlap_end - overlap_start + 1)::numeric / NULLIF(days_in_month, 0)::numeric',
  ];

  const forbiddenPatterns = [
    'FROM active_baux ab',
    'JOIN logements l ON l.id = ab.logement_id',
  ];

  const missing = requiredPatterns.filter((pattern) => !monthlySection.includes(pattern));
  const presentForbidden = forbiddenPatterns.filter((pattern) => monthlySection.includes(pattern));

  if (missing.length > 0) {
    console.error('FAIL: monthly dashboard cost query is missing required logic:');
    missing.forEach((pattern) => console.error(`- missing: ${pattern}`));
    process.exit(1);
  }

  if (presentForbidden.length > 0) {
    console.error('FAIL: monthly dashboard cost query seems coupled to baux assignments:');
    presentForbidden.forEach((pattern) => console.error(`- forbidden: ${pattern}`));
    process.exit(1);
  }

  console.log('PASS: dashboard monthly cost query is based on active logements and contract dates.');
}

run().catch((error) => {
  console.error('FAIL:', error.message);
  process.exit(1);
});
