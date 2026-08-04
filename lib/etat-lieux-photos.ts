import { v2 as cloudinary } from 'cloudinary';

export interface EtatLieuxPhotoStored {
  name: string;
  url: string;
  public_id?: string;
}

function getMissingCloudinaryVars(): string[] {
  const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const;
  return required.filter((name) => !process.env[name]);
}

function ensureCloudinaryConfig(): void {
  const missing = getMissingCloudinaryVars();
  if (missing.length > 0) {
    throw new Error(`Configuration Cloudinary incomplète (${missing.join(', ')})`);
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export function parseEtatLieuxPhotosInput(raw: unknown): EtatLieuxPhotoStored[] {
  if (!raw) return [];

  let input: unknown = raw;

  if (typeof raw === 'string') {
    try {
      input = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(input)) {
    return [];
  }

  const mapped: Array<EtatLieuxPhotoStored | null> = input.map((item: unknown, index: number) => {
      if (typeof item === 'string') {
        return {
          name: `photo-${index + 1}.jpg`,
          url: item,
        };
      }

      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const rawUrl = record.url ?? record.data ?? record.secure_url;
        if (typeof rawUrl === 'string') {
          return {
            name:
              typeof record.name === 'string' && record.name.trim().length > 0
                ? record.name
                : `photo-${index + 1}.jpg`,
            url: rawUrl,
            public_id: typeof record.public_id === 'string' ? record.public_id : undefined,
          };
        }
      }

      return null;
    });

  return mapped.filter((item): item is EtatLieuxPhotoStored => item !== null);
}

function isDataUrl(value: string): boolean {
  return /^data:image\//i.test(value);
}

async function uploadDataUrlToCloudinary(dataUrl: string, name: string): Promise<EtatLieuxPhotoStored> {
  ensureCloudinaryConfig();

  const result = await cloudinary.uploader.upload(dataUrl, {
    folder: 'gestion_logements/etat-lieux',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    overwrite: false,
  });

  return {
    name,
    url: result.secure_url,
    public_id: result.public_id,
  };
}

export async function normalizeEtatLieuxPhotosForStorage(raw: unknown): Promise<EtatLieuxPhotoStored[]> {
  const parsed = parseEtatLieuxPhotosInput(raw);

  const normalized: EtatLieuxPhotoStored[] = [];
  for (const photo of parsed) {
    if (isDataUrl(photo.url)) {
      const uploaded = await uploadDataUrlToCloudinary(photo.url, photo.name);
      normalized.push(uploaded);
    } else {
      normalized.push(photo);
    }
  }

  return normalized;
}

export async function deleteEtatLieuxPhotosFromCloudinary(publicIds: Array<string | undefined>): Promise<void> {
  const ids = Array.from(new Set(publicIds.filter((id): id is string => Boolean(id))));
  if (!ids.length) return;

  ensureCloudinaryConfig();

  await Promise.allSettled(
    ids.map((publicId) =>
      cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true,
      })
    )
  );
}

export function computeRemovedPhotoPublicIds(
  previousPhotos: EtatLieuxPhotoStored[],
  nextPhotos: EtatLieuxPhotoStored[]
): string[] {
  const nextSet = new Set(nextPhotos.map((photo) => photo.public_id).filter(Boolean));

  return previousPhotos
    .map((photo) => photo.public_id)
    .filter((publicId): publicId is string => Boolean(publicId) && !nextSet.has(publicId));
}
