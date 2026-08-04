import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { TokenPayload } from '@/lib/auth';
import { logError } from '@/lib/logger';

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  if (/[,"\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(rows: Array<Record<string, unknown>>): string {
  const header = [
    'id',
    'created_at',
    'user_email',
    'prenom',
    'nom',
    'action',
    'entity_type',
    'entity_id',
    'ip_address',
    'changes',
  ];

  const lines = [header.join(',')];

  for (const row of rows) {
    lines.push([
      csvEscape(row.id),
      csvEscape(row.created_at),
      csvEscape(row.user_email),
      csvEscape(row.prenom),
      csvEscape(row.nom),
      csvEscape(row.action),
      csvEscape(row.entity_type),
      csvEscape(row.entity_id),
      csvEscape(row.ip_address),
      csvEscape(row.changes ? JSON.stringify(row.changes) : ''),
    ].join(','));
  }

  return lines.join('\n');
}

let auditTrailSchemaChecked = false;

async function ensureAuditTrailSchema() {
  if (auditTrailSchemaChecked) return;

  await query(`
    CREATE TABLE IF NOT EXISTS audit_trail (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      user_email VARCHAR(255),
      action VARCHAR(50) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id INTEGER,
      changes JSONB,
      ip_address VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Garantit la compatibilite avec d'anciennes versions de schema.
  await query(`ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS user_id INTEGER`);
  await query(`ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS user_email VARCHAR(255)`);
  await query(`ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS action VARCHAR(50)`);
  await query(`ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100)`);
  await query(`ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS entity_id INTEGER`);
  await query(`ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS changes JSONB`);
  await query(`ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100)`);
  await query(`ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

  auditTrailSchemaChecked = true;
}

const getHandler = async (request: NextRequest, payload: TokenPayload) => {
  // Vérifier que l'utilisateur est super_admin
  if (payload.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'Accès refusé. Super administrateur requis.' },
      { status: 403 }
    );
  }

  try {
    await ensureAuditTrailSchema();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const entityType = searchParams.get('entity_type');
    const action = searchParams.get('action');
    const userEmail = searchParams.get('user_email');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const format = searchParams.get('format');

    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (entityType) {
      whereClause += ` AND a.entity_type = $${paramIndex}`;
      params.push(entityType);
      paramIndex++;
    }

    if (action) {
      whereClause += ` AND a.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (userEmail) {
      whereClause += ` AND a.user_email ILIKE $${paramIndex}`;
      params.push(`%${userEmail}%`);
      paramIndex++;
    }

    if (startDate) {
      whereClause += ` AND a.created_at >= $${paramIndex}::date`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND a.created_at < ($${paramIndex}::date + INTERVAL '1 day')`;
      params.push(endDate);
      paramIndex++;
    }

    if (format === 'csv') {
      const csvResult = await query(
        `SELECT
          a.id,
          a.created_at,
          a.user_email,
          c.prenom,
          c.nom,
          a.action,
          a.entity_type,
          a.entity_id,
          a.ip_address,
          a.changes
        FROM audit_trail a
        LEFT JOIN collaborateurs c ON a.user_id = c.id
        ${whereClause}
        ORDER BY a.created_at DESC`,
        params
      );

      const csv = buildCsv(csvResult.rows);
      const filename = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // Récupérer le total
    const countResult = await query(
      `SELECT COUNT(*) as total FROM audit_trail a ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || 0);

    // Récupérer les entrées
    const result = await query(
      `SELECT 
        a.id,
        a.user_id,
        a.user_email,
        a.action,
        a.entity_type,
        a.entity_id,
        a.changes,
        a.ip_address,
        a.created_at,
        c.prenom,
        c.nom
      FROM audit_trail a
      LEFT JOIN collaborateurs c ON a.user_id = c.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, pageSize, offset]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    if (error instanceof Error) {
      logError(error, { route: '/api/admin/audit-trail', method: 'GET' });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'audit trail' },
      { status: 500 }
    );
  }
};

export const GET = withAuth(getHandler, ['super_admin']);
