#!/usr/bin/env node

/**
 * Static non-regression guard for caution justificatif upload flow.
 *
 * Verifies key safety and behavior contracts in:
 * - /api/upload (Cloudinary config checks, node runtime, explicit errors)
 * - CautionManager frontend (error surfacing, upload -> bail update -> cleanup path)
 * - /api/baux/[id]/caution (justificatif fields persisted)
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const uploadRoutePath = path.join(process.cwd(), 'app', 'api', 'upload', 'route.ts');
const cautionManagerPath = path.join(process.cwd(), 'app', 'components', 'CautionManager.tsx');
const cautionApiPath = path.join(process.cwd(), 'app', 'api', 'baux', '[id]', 'caution', 'route.ts');

function assertContains(content, required, label) {
  const missing = required.filter((item) => !content.includes(item));
  if (missing.length > 0) {
    console.error(`FAIL: ${label} is missing required logic:`);
    for (const m of missing) {
      console.error(`- missing: ${m}`);
    }
    process.exit(1);
  }
}

async function run() {
  const [uploadContent, cautionManagerContent, cautionApiContent] = await Promise.all([
    readFile(uploadRoutePath, 'utf8'),
    readFile(cautionManagerPath, 'utf8'),
    readFile(cautionApiPath, 'utf8'),
  ]);

  assertContains(
    uploadContent,
    [
      "export const runtime = 'nodejs'",
      'getMissingCloudinaryVars',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      "code: 'CLOUDINARY_CONFIG_MISSING'",
      'MAX_FILE_SIZE_BYTES',
      'verifyCsrfMiddleware(request)',
      "Erreur upload fichier:",
    ],
    '/api/upload route'
  );

  assertContains(
    cautionManagerContent,
    [
      "fetch('/api/upload'",
      'justificatif_caution_url: result.url',
      'justificatif_caution_public_id: result.public_id',
      'Upload incomplet: URL ou public_id manquant dans la réponse.',
      'Upload réussi mais échec de la mise à jour du bail',
      'setError(message)',
      'method: \'DELETE\'',
      'encodeURIComponent(uploadedPublicId)',
    ],
    'CautionManager'
  );

  assertContains(
    cautionApiContent,
    [
      'justificatif_caution_url',
      'justificatif_caution_public_id',
      'updates.push(`justificatif_caution_url =',
      'updates.push(`justificatif_caution_public_id =',
      'RETURNING *',
    ],
    '/api/baux/[id]/caution route'
  );

  console.log('PASS: caution justificatif upload flow guards are in place.');
}

run().catch((error) => {
  console.error('FAIL:', error.message);
  process.exit(1);
});
