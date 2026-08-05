import { pool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { verifyCsrfMiddleware } from '@/lib/csrf';
import { logError } from '@/lib/logger';
import * as XLSX from 'xlsx';

function isValidDateObject(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function toIsoDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseExcelDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  // Excel serial date (number of days since 1899-12-30)
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed || !parsed.y || !parsed.m || !parsed.d) {
      throw new Error('Date invalide (numéro Excel non reconnu)');
    }
    return `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }

  if (value instanceof Date) {
    if (!isValidDateObject(value)) {
      throw new Error('Date invalide');
    }
    return toIsoDate(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // dd/mm/yyyy or d/m/yyyy
    const frMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (frMatch) {
      const day = Number(frMatch[1]);
      const month = Number(frMatch[2]);
      const year = Number(frMatch[3]);
      const date = new Date(year, month - 1, day);
      if (
        !isValidDateObject(date) ||
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        throw new Error('Date invalide (format jj/mm/aaaa incorrect)');
      }
      return toIsoDate(date);
    }

    // yyyy-mm-dd
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);
      const date = new Date(year, month - 1, day);
      if (
        !isValidDateObject(date) ||
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        throw new Error('Date invalide (format yyyy-mm-dd incorrect)');
      }
      return toIsoDate(date);
    }

    // fallback Date parser
    const fallback = new Date(trimmed);
    if (!isValidDateObject(fallback)) {
      throw new Error('Date invalide (format non reconnu)');
    }
    return toIsoDate(fallback);
  }

  throw new Error('Date invalide (type non reconnu)');
}

function parseGenre(value: unknown): 'M' | 'F' | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;

  if (['m', 'h', 'homme', 'male', 'masculin'].includes(normalized)) {
    return 'M';
  }

  if (['f', 'femme', 'female', 'feminin', 'féminin'].includes(normalized)) {
    return 'F';
  }

  return null;
}

async function findAvailableBedId(client: any, logementId: number): Promise<number | null> {
  const bedResult = await client.query(
    `SELECT bed_state.id
     FROM (
       SELECT
         l.id,
         l.numero,
         l.chambre_id,
         CASE
           WHEN LOWER(TRIM(COALESCE(ch.type_lit, 'simple'))) = 'double' THEN 2
           ELSE 1
         END AS capacity,
         COALESCE(lo_counts.occupants_count, CASE WHEN l.collaborateur_id IS NOT NULL THEN 1 ELSE 0 END) AS occupants_count
       FROM lits l
       JOIN chambres ch ON ch.id = l.chambre_id
       LEFT JOIN (
         SELECT lit_id, COUNT(*)::int AS occupants_count
         FROM lit_occupants
         GROUP BY lit_id
       ) lo_counts ON lo_counts.lit_id = l.id
       WHERE ch.logement_id = $1
     ) AS bed_state
     WHERE bed_state.occupants_count < bed_state.capacity
     ORDER BY bed_state.occupants_count ASC, bed_state.numero ASC
     LIMIT 1`,
    [logementId]
  );

  if (bedResult.rows.length === 0) return null;
  return Number(bedResult.rows[0].id);
}

async function syncLitOccupancyState(client: any, litId: number) {
  await client.query(
    `WITH current_occupants AS (
       SELECT collaborateur_id
       FROM lit_occupants
       WHERE lit_id = $1
       ORDER BY created_at
     )
     UPDATE lits
     SET est_occupe = EXISTS(SELECT 1 FROM current_occupants),
         collaborateur_id = (
           SELECT collaborateur_id
           FROM current_occupants
           LIMIT 1
         )
     WHERE id = $1`,
    [litId]
  );
}

const postHandler = async (
  request: NextRequest,
  payload: TokenPayload
) => {
  // Vérifier que l'utilisateur est admin ou super_admin
  if (!['admin', 'super_admin'].includes(payload.role)) {
    return NextResponse.json(
      { error: 'Accès refusé. Administrateur requis.' },
      { status: 403 }
    );
  }

  const client = await pool.connect();
  try {
    if (!verifyCsrfMiddleware(request)) {
      return NextResponse.json({ error: 'CSRF token invalide' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Vérifier le type de fichier
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Le fichier doit être au format Excel (.xlsx ou .xls)' },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Le fichier ne contient pas de données' },
        { status: 400 }
      );
    }

    // Colonnes attendues
    const requiredColumns = ['Nom', 'Prénom', 'Email'];
    const firstRow = rows[0];
    const missingColumns = requiredColumns.filter((col) => !(col in firstRow));

    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          error: `Colonnes manquantes: ${missingColumns.join(', ')}`,
          expectedColumns: requiredColumns,
        },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const nom = row['Nom']?.trim();
        const prenom = row['Prénom']?.trim();
        const email = row['Email']?.trim().toLowerCase();
        const telephone = row['Téléphone']?.trim() || null;
        const genre = parseGenre(row['Genre']);
        const civilite = row['Civilité'] || null;
        const centre_principal = row['Centre principal']?.trim() || null;
        const centre_affectation = row['Centre affectation']?.trim() || null;
        let date_arrivee: string | null = null;
        let date_fin_contrat: string | null = null;

        try {
          date_arrivee = parseExcelDate(row['Début contrat']);
        } catch (error) {
          const detail = error instanceof Error ? error.message : 'Date de début invalide';
          errors.push({
            row: i + 2,
            error: `Début contrat invalide: ${detail}`,
          });
          failed++;
          continue;
        }

        try {
          date_fin_contrat = parseExcelDate(row['Fin contrat']);
        } catch (error) {
          const detail = error instanceof Error ? error.message : 'Date de fin invalide';
          errors.push({
            row: i + 2,
            error: `Fin contrat invalide: ${detail}`,
          });
          failed++;
          continue;
        }

        if (date_arrivee && date_fin_contrat && date_arrivee > date_fin_contrat) {
          errors.push({
            row: i + 2,
            error: 'Début contrat postérieur à fin contrat',
          });
          failed++;
          continue;
        }
        const logement_nom = row['Logement']?.trim() || null;

        // Valider les données requises
        if (!nom || !prenom || !email) {
          errors.push({
            row: i + 2,
            error: 'Nom, Prénom et Email sont obligatoires',
          });
          failed++;
          continue;
        }

        // Vérifier si l'email existe
        const checkResult = await client.query(
          'SELECT id FROM collaborateurs WHERE email = $1',
          [email]
        );

        if (checkResult.rows.length > 0) {
          // Update existant
          const collaborateurId = checkResult.rows[0].id;
          await client.query(
            `UPDATE collaborateurs 
             SET nom = $1, prenom = $2, telephone = $3, genre = COALESCE($4, genre), civilite = $5,
                 centre_principal = $6, centre_affectation = $7, date_debut_contrat = $8,
                 date_fin_contrat = $9, updated_at = NOW()
             WHERE id = $10`,
            [
              nom,
              prenom,
              telephone,
              genre,
              civilite,
              centre_principal,
              centre_affectation,
              date_arrivee,
              date_fin_contrat,
              collaborateurId,
            ]
          );

          // Si logement_nom est fourni, assigner le lit
          if (logement_nom) {
            const logementResult = await client.query(
              'SELECT id FROM logements WHERE nom_logement ILIKE $1 LIMIT 1',
              [logement_nom]
            );

            if (logementResult.rows.length > 0) {
              const logementId = logementResult.rows[0].id;
              const litId = await findAvailableBedId(client, logementId);
              if (litId) {
                await client.query(
                  `INSERT INTO lit_occupants (lit_id, collaborateur_id)
                   VALUES ($1, $2)
                   ON CONFLICT (lit_id, collaborateur_id) DO NOTHING`,
                  [litId, collaborateurId]
                );
                await syncLitOccupancyState(client, litId);
              }
            }
          }

          updated++;
        } else {
          // Créer nouveau
          const createResult = await client.query(
            `INSERT INTO collaborateurs 
             (nom, prenom, email, telephone, genre, civilite, centre_principal, centre_affectation,
              date_debut_contrat, date_fin_contrat, est_actif, role)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, 'user')
             RETURNING id`,
            [
              nom,
              prenom,
              email,
              telephone,
              genre,
              civilite,
              centre_principal,
              centre_affectation,
              date_arrivee,
              date_fin_contrat,
            ]
          );

          const newCollaborateurId = createResult.rows[0].id;

          // Si logement_nom est fourni, assigner le lit
          if (logement_nom) {
            const logementResult = await client.query(
              'SELECT id FROM logements WHERE nom_logement ILIKE $1 LIMIT 1',
              [logement_nom]
            );

            if (logementResult.rows.length > 0) {
              const logementId = logementResult.rows[0].id;
              const litId = await findAvailableBedId(client, logementId);
              if (litId) {
                await client.query(
                  'INSERT INTO lit_occupants (lit_id, collaborateur_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                  [litId, newCollaborateurId]
                );
                await syncLitOccupancyState(client, litId);
              }
            }
          }

          created++;
        }
      } catch (error) {
        if (error instanceof Error) {
          logError(error, { route: '/api/admin/collaborateurs/import', row: i + 2 });
        }
        errors.push({
          row: i + 2,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        });
        failed++;
      }
    }

    await client.query('COMMIT');

    // Log audit
    await logAudit({
      userId: payload.id,
      userEmail: payload.email,
      action: 'import',
      entityType: 'collaborateurs',
      changes: {
        created,
        updated,
        failed,
        total: rows.length,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({
      success: true,
      summary: {
        total: rows.length,
        created,
        updated,
        failed,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors
    }
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/collaborateurs/import', method: 'POST' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de l\'import' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
};

export const POST = withAuth(postHandler, ['admin', 'super_admin']);
