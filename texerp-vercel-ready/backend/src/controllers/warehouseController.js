import { query } from '../db/index.js';

export async function getWarehouses(req, res) {
  try {
    const result = await query(
      `SELECT w.id, w.name, w.code, w.type, w.address, w.is_active, w.created_at,
        COUNT(DISTINCT iws.item_id) as total_items_stored,
        COALESCE(SUM(iws.quantity), 0) as total_stock_volume
       FROM warehouses w
       LEFT JOIN item_warehouse_stocks iws ON w.id = iws.warehouse_id
       GROUP BY w.id, w.name, w.code, w.type, w.address, w.is_active, w.created_at
       ORDER BY w.id ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch warehouses.' });
  }
}

export async function getWarehouseStock(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT iws.item_id, i.item_code, i.name as item_name, c.name as category_name, u.symbol as unit, iws.quantity, i.purchase_price
       FROM item_warehouse_stocks iws
       JOIN items i ON iws.item_id = i.id
       LEFT JOIN categories c ON i.category_id = c.id
       LEFT JOIN units u ON i.unit_id = u.id
       WHERE iws.warehouse_id = $1 AND iws.quantity > 0
       ORDER BY iws.quantity DESC`,
      [id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch warehouse stock details.' });
  }
}

export async function createWarehouse(req, res) {
  try {
    const { name, code, type, address } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Name and Code are required.' });
    }

    const result = await query(
      `INSERT INTO warehouses (name, code, type, address) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), code.trim().toUpperCase(), type || 'Warehouse', address || null]
    );

    return res.status(201).json({ success: true, message: 'Warehouse created successfully', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
