import { query } from '../db/index.js';

export async function getNotifications(req, res) {
  try {
    const companyId = req.user.company_id;
    // 1. Trigger dynamic system checks
    await syncSystemAlerts(companyId);

    const result = await query(
      `SELECT * FROM notifications WHERE ${companyId ? 'company_id = $1' : 'company_id IS NULL'} ORDER BY is_read ASC, created_at DESC LIMIT 50`,
      companyId ? [companyId] : []
    );
    const unreadCountRes = await query(
      `SELECT COUNT(*) as count FROM notifications WHERE ${companyId ? 'company_id = $1' : 'company_id IS NULL'} AND is_read = false`,
      companyId ? [companyId] : []
    );

    return res.json({
      success: true,
      data: result.rows,
      unreadCount: parseInt(unreadCountRes.rows[0]?.count || 0, 10)
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
}

export async function markAsRead(req, res) {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;
    await query(`UPDATE notifications SET is_read = true WHERE id = $1 AND ${companyId ? 'company_id = $2' : 'company_id IS NULL'}`, companyId ? [id, companyId] : [id]);
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function markAllAsRead(req, res) {
  try {
    const companyId = req.user.company_id;
    await query(`UPDATE notifications SET is_read = true WHERE is_read = false AND ${companyId ? 'company_id = $1' : 'company_id IS NULL'}`, companyId ? [companyId] : []);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function syncSystemAlerts(companyId) {
  if (!companyId) return;
  try {
    // Check low stock items for this company
    const lowStockRes = await query(
      `SELECT id, item_code, name, current_stock, min_stock_level FROM items WHERE company_id = $1 AND current_stock <= min_stock_level LIMIT 5`,
      [companyId]
    );
    for (const item of lowStockRes.rows) {
      const exists = await query(
        `SELECT id FROM notifications WHERE company_id = $1 AND type = 'low_stock' AND reference_id = $2 AND is_read = false`,
        [companyId, item.id]
      );
      if (exists.rows.length === 0) {
        await query(
          `INSERT INTO notifications (company_id, type, title, message, severity, reference_type, reference_id)
           VALUES ($1, 'low_stock', $2, $3, 'warning', 'Item', $4)`,
          [companyId, `Low Stock Alert: ${item.name}`, `Current stock (${item.current_stock}) has dropped below min limit (${item.min_stock_level}).`, item.id]
        );
      }
    }
  } catch (err) {
    // Silent fail for background alert generation
  }
}
