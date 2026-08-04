import dotenv from 'dotenv';
import { Pool } from 'pg';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

const APPLY = process.argv.includes('--apply');
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? Number.parseInt(LIMIT_ARG.split('=')[1], 10) : null;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL manquant dans .env');
  process.exit(1);
}

const requiredCloudinaryVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

const missingCloudinaryVars = requiredCloudinaryVars.filter((name) => !process.env[name]);
if (missingCloudinaryVars.length > 0) {
  console.error(`Variables Cloudinary manquantes: ${missingCloudinaryVars.join(', ')}`);
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function parsePhotos(rawValue) {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return null;
  }
}

function normalizePhotoItem(item, index) {
  if (typeof item === 'string') {
    return {
      name: `photo-${index + 1}.jpg`,
      url: item,
    };
  }

  if (item && typeof item === 'object') {
    const url = typeof item.url === 'string' ? item.url : typeof item.data === 'string' ? item.data : null;
    if (!url) return null;

    return {
      name: typeof item.name === 'string' && item.name.trim().length > 0 ? item.name : `photo-${index + 1}.jpg`,
      url,
      public_id: typeof item.public_id === 'string' ? item.public_id : undefined,
    };
  }

  return null;
}

function isDataUrl(url) {
  return /^data:image\//i.test(url);
}

async function uploadDataUrl(photo) {
  const uploaded = await cloudinary.uploader.upload(photo.url, {
    folder: 'gestion_logements/etat-lieux',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    overwrite: false,
  });

  return {
    name: photo.name,
    url: uploaded.secure_url,
    public_id: uploaded.public_id,
  };
}

async function main() {
  console.log(APPLY
    ? 'Migration des photos etat des lieux vers Cloudinary (mode APPLY)...'
    : 'Migration des photos etat des lieux vers Cloudinary (mode DRY-RUN)...');

  const client = await pool.connect();

  try {
    const queryText = LIMIT && Number.isFinite(LIMIT)
      ? "SELECT id, nom_logement, etat_lieux_photos FROM logements WHERE etat_lieux_photos IS NOT NULL AND etat_lieux_photos <> '' ORDER BY id LIMIT $1"
      : "SELECT id, nom_logement, etat_lieux_photos FROM logements WHERE etat_lieux_photos IS NOT NULL AND etat_lieux_photos <> '' ORDER BY id";

    const result = LIMIT && Number.isFinite(LIMIT)
      ? await client.query(queryText, [LIMIT])
      : await client.query(queryText);

    let logementsScanned = 0;
    let logementsUpdated = 0;
    let logementsSkipped = 0;
    let photosFound = 0;
    let photosToMigrate = 0;
    let photosMigrated = 0;

    for (const row of result.rows) {
      logementsScanned += 1;

      const parsed = parsePhotos(row.etat_lieux_photos);
      if (parsed === null) {
        logementsSkipped += 1;
        console.warn(`- Logement #${row.id}: JSON invalide, ignore.`);
        continue;
      }

      const normalized = parsed
        .map((item, index) => normalizePhotoItem(item, index))
        .filter((item) => item !== null);

      if (normalized.length === 0) {
        logementsSkipped += 1;
        continue;
      }

      photosFound += normalized.length;

      const migratedPhotos = [];
      let rowNeedsUpdate = false;

      for (const photo of normalized) {
        if (isDataUrl(photo.url)) {
          photosToMigrate += 1;
          rowNeedsUpdate = true;

          if (APPLY) {
            const uploaded = await uploadDataUrl(photo);
            migratedPhotos.push(uploaded);
            photosMigrated += 1;
          } else {
            migratedPhotos.push({
              name: photo.name,
              url: '__WILL_BE_CLOUDINARY_URL__',
              public_id: '__WILL_BE_PUBLIC_ID__',
            });
          }
        } else {
          migratedPhotos.push(photo);
        }
      }

      if (!rowNeedsUpdate) {
        logementsSkipped += 1;
        continue;
      }

      if (APPLY) {
        await client.query(
          'UPDATE logements SET etat_lieux_photos = $1 WHERE id = $2',
          [JSON.stringify(migratedPhotos), row.id]
        );
        logementsUpdated += 1;
        console.log(`- Logement #${row.id} (${row.nom_logement || 'sans nom'}): ${migratedPhotos.length} photo(s) normalisee(s).`);
      } else {
        logementsUpdated += 1;
        console.log(`- Logement #${row.id} (${row.nom_logement || 'sans nom'}): ${migratedPhotos.length} photo(s) seraient normalisees.`);
      }
    }

    console.log('');
    console.log('Resume migration:');
    console.log(`- Logements scannes: ${logementsScanned}`);
    console.log(`- Logements a mettre a jour: ${logementsUpdated}`);
    console.log(`- Logements ignores: ${logementsSkipped}`);
    console.log(`- Photos detectees: ${photosFound}`);
    console.log(`- Photos base64 a migrer: ${photosToMigrate}`);
    if (APPLY) {
      console.log(`- Photos migrees vers Cloudinary: ${photosMigrated}`);
    }

    if (!APPLY) {
      console.log('');
      console.log('Aucune ecriture effectuee (dry-run).');
      console.log('Executer avec --apply pour appliquer la migration.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Echec migration:', error.message);
  process.exit(1);
});
