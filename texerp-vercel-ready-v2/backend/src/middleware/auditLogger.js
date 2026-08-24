import { query } from '../db/index.js';

export async function logAudit({ companyId, userId, userName, action, module, recordId, referenceNumber, details }) {
  try {
    await query(
      `INSERT INTO audit_logs (company_id, user_id, user_name, action, module, record_id, reference_number, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        companyId || null,
        userId || null,
        userName || 'System',
        action,
        module,
        recordId || null,
        referenceNumber || null,
        typeof details === 'object' ? JSON.stringify(details) : (details || '')
      ]
    );
  } catch (err) {
    console.error('Audit Log Error:', err.message);
  }
}
