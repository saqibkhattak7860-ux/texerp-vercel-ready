import { query } from '../db/index.js';

export async function getAuditLogs(req, res) {
  try {
    const { module, action, search } = req.query;
    let sql = `SELECT * FROM audit_logs WHERE action <> 'LOGIN'`;
    const params = [];

    // If company Admin, restrict to company logs
    if (req.user.role_name === 'Admin' && req.user.company_id) {
      params.push(req.user.company_id);
      sql += ` AND company_id = $${params.length}`;
    }

    if (module) {
      params.push(module);
      sql += ` AND module = $${params.length}`;
    }

    if (action) {
      params.push(action);
      sql += ` AND action = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(details) LIKE $${params.length} OR LOWER(reference_number) LIKE $${params.length} OR LOWER(user_name) LIKE $${params.length})`;
    }

    sql += ` ORDER BY created_at DESC LIMIT 200`;

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
}
