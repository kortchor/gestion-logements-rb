import { query } from '@/lib/db';

export interface AuditLog {
  userId?: number;
  userEmail?: string;
  action: string; // 'create', 'update', 'delete', etc.
  entityType: string; // 'collaborateur', 'logement', 'lit', etc.
  entityId?: number;
  changes?: Record<string, any>;
  ipAddress?: string;
}

/**
 * Enregistrer une action dans l'audit trail
 */
export async function logAudit(auditLog: AuditLog): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_trail (user_id, user_email, action, entity_type, entity_id, changes, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        auditLog.userId || null,
        auditLog.userEmail || null,
        auditLog.action,
        auditLog.entityType,
        auditLog.entityId || null,
        auditLog.changes ? JSON.stringify(auditLog.changes) : null,
        auditLog.ipAddress || null,
      ]
    );
  } catch (error) {
    // Log l'erreur mais ne pas bloquer l'opération principale
    console.error('❌ Erreur lors du logging audit:', error);
  }
}

/**
 * Récupérer l'historique des actions pour un collaborateur
 */
export async function getAuditTrail(
  limit: number = 100,
  offset: number = 0,
  userId?: number
) {
  try {
    let whereClause = '';
    const params: any[] = [];

    if (userId) {
      whereClause = 'WHERE user_id = $1';
      params.push(userId);
    }

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
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return result.rows;
  } catch (error) {
    console.error('❌ Erreur lors de la lecture de l\'audit trail:', error);
    return [];
  }
}

/**
 * Compter le total des enregistrements d'audit trail
 */
export async function countAuditTrail(userId?: number): Promise<number> {
  try {
    let whereClause = '';
    const params: any[] = [];

    if (userId) {
      whereClause = 'WHERE user_id = $1';
      params.push(userId);
    }

    const result = await query(
      `SELECT COUNT(*) as total FROM audit_trail ${whereClause}`,
      params
    );

    return parseInt(result.rows[0]?.total || 0);
  } catch (error) {
    console.error('❌ Erreur lors du comptage de l\'audit trail:', error);
    return 0;
  }
}
