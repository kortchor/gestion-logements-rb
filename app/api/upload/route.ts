import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { verifyCsrfMiddleware } from '@/lib/csrf';
import { logError } from '@/lib/logger';

const ALLOWED_FOLDER_PATTERN = /^[a-zA-Z0-9/_-]+$/;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getMissingCloudinaryVars() {
  const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const;
  return required.filter((name) => !process.env[name]);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json(
        { error: 'CSRF token invalide' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'cautions';

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Le fichier dépasse 10MB.' },
        { status: 400 }
      );
    }

    const missingVars = getMissingCloudinaryVars();
    if (missingVars.length > 0) {
      return NextResponse.json(
        {
          error: `Configuration Cloudinary incomplète (${missingVars.join(', ')}).`,
          code: 'CLOUDINARY_CONFIG_MISSING',
        },
        { status: 500 }
      );
    }

    if (!ALLOWED_FOLDER_PATTERN.test(folder)) {
      return NextResponse.json(
        { error: 'Nom de dossier invalide' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `gestion_logements/${folder}`,
          resource_type: 'auto',
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'],
          max_bytes: MAX_FILE_SIZE_BYTES,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({
      success: true,
      url: (result as any).secure_url,
      public_id: (result as any).public_id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    if (error instanceof Error) {
      logError(error, { route: '/api/upload', method: 'POST' });
    }
    return NextResponse.json(
      { error: `Erreur upload fichier: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json(
        { error: 'CSRF token invalide' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('public_id');

    if (!publicId) {
      return NextResponse.json(
        { error: 'public_id manquant' },
        { status: 400 }
      );
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'auto',
      invalidate: true,
    });

    if (result.result !== 'ok' && result.result !== 'not found') {
      return NextResponse.json(
        { error: `Suppression Cloudinary refusée: ${result.result}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, result: result.result });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/upload', method: 'DELETE' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du fichier' },
      { status: 500 }
    );
  }
}