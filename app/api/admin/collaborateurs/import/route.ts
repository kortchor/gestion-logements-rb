import { query, pool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import * as XLSX from 'xlsx';

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
        const genre = row['Genre'] === 'M' ? 'M' : 'F';
        const civilite = row['Civilité'] || null;
        const centre_principal = row['Centre principal']?.trim() || null;
        const centre_affectation = row['Centre affectation']?.trim() || null;
        const date_arrivee = row['Début contrat'] ? new Date(row['Début contrat']).toISOString().split('T')[0] : null;
        const date_fin_contrat = row['Fin contrat'] ? new Date(row['Fin contrat']).toISOString().split('T')[0] : null;
        const participation_logement = row['Participation logement']
          ? parseFloat(row['Participation logement'].toString()) || null
          : null;
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
             SET nom = $1, prenom = $2, telephone = $3, genre = $4, civilite = $5,
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
              const litsResult = await client.query(
                'SELECT l.id FROM lits l JOIN chambres c ON l.chambre_id = c.id WHERE c.logement_id = $1 LIMIT 1',
                [logementId]
              );

              if (litsResult.rows.length > 0) {
                const litId = litsResult.rows[0].id;
                const occupancyResult = await client.query(
                  'SELECT COUNT(*) as count FROM lit_occupants WHERE lit_id = $1',
                  [litId]
                );

                if (occupancyResult.rows[0].count === 0) {
                  await client.query(
                    'INSERT INTO lit_occupants (lit_id, collaborateur_id) VALUES ($1, $2)',
                    [litId, collaborateurId]
                  );
                }
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
              const litsResult = await client.query(
                'SELECT l.id FROM lits l JOIN chambres c ON l.chambre_id = c.id WHERE c.logement_id = $1 LIMIT 1',
                [logementId]
              );

              if (litsResult.rows.length > 0) {
                const litId = litsResult.rows[0].id;
                await client.query(
                  'INSERT INTO lit_occupants (lit_id, collaborateur_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                  [litId, newCollaborateurId]
                );
              }
            }
          }

          created++;
        }
      } catch (error) {
        console.error(`Erreur ligne ${i + 2}:`, error);
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
      userId: payload.sub,
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
    await client.query('ROLLBACK');
    console.error('❌ Erreur import collaborateurs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'import' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
};

export const POST = withAuth(postHandler, ['admin', 'super_admin']);
