#!/usr/bin/env node

/**
 * Static non-regression guard for collaborator assignment consistency
 * with double-bed occupancy model.
 *
 * Scope:
 * - /api/collaborateurs/[id]/desassigner
 * - /api/collaborateurs/sans-logement
 * - /api/collaborateurs/[id]/historique
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const desassignerPath = path.join(process.cwd(), 'app', 'api', 'collaborateurs', '[id]', 'desassigner', 'route.ts');
const sansLogementPath = path.join(process.cwd(), 'app', 'api', 'collaborateurs', 'sans-logement', 'route.ts');
const historiquePath = path.join(process.cwd(), 'app', 'api', 'collaborateurs', '[id]', 'historique', 'route.ts');

function assertContains(content, required, label) {
  const missing = required.filter((token) => !content.includes(token));
  if (missing.length > 0) {
    console.error(`FAIL: ${label} is missing required logic:`);
    for (const token of missing) {
      console.error(`- missing: ${token}`);
    }
    process.exit(1);
  }
}

async function run() {
  const [desassigner, sansLogement, historique] = await Promise.all([
    readFile(desassignerPath, 'utf8'),
    readFile(sansLogementPath, 'utf8'),
    readFile(historiquePath, 'utf8'),
  ]);

  assertContains(
    desassigner,
    [
      'FROM lit_occupants',
      'DELETE FROM lit_occupants WHERE collaborateur_id = $1',
      'SELECT DISTINCT lit_id',
      'WITH current_occupants AS',
      'SET est_occupe = EXISTS(SELECT 1 FROM current_occupants)',
      'UPDATE lits SET collaborateur_id = NULL WHERE collaborateur_id = $1',
      'COUNT(DISTINCT occ.collaborateur_id) AS nb_occupants',
    ],
    '/api/collaborateurs/[id]/desassigner'
  );

  assertContains(
    sansLogement,
    [
      'AND NOT EXISTS (',
      'FROM lit_occupants lo',
      'WHERE lo.collaborateur_id = c.id',
      'FROM lits l',
      'WHERE l.collaborateur_id = c.id',
    ],
    '/api/collaborateurs/sans-logement'
  );

  assertContains(
    historique,
    [
      'EXISTS (',
      'FROM lit_occupants lo',
      'WHERE lo.lit_id = li.id',
      'WITH candidats AS',
      'WHERE lo.collaborateur_id = $1',
      'WHERE li.collaborateur_id = $1',
      'ORDER BY priority ASC, date_ref DESC',
      'LIMIT 1',
    ],
    '/api/collaborateurs/[id]/historique'
  );

  console.log('PASS: collaborator double-bed assignment guards are in place.');
}

run().catch((error) => {
  console.error('FAIL:', error.message);
  process.exit(1);
});
