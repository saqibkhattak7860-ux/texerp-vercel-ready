import { query } from '../db/index.js';
import { StockEngine } from '../services/stockEngine.js';
import { logAudit } from '../middleware/auditLogger.js';

export async function getItems(req, res) {
  try {
    const companyId = req.user.company_id;
    const { category_id, search, low_stock } = req.query;
    let sql = `
      SELECT 
        i.*,
        c.name as category_name,
        u.name as unit_name,
        u.symbol as unit_symbol,
        (i.current_stock * i.purchase_price) as stock_valuation,
        CASE WHEN i.current_stock <= i.min_stock_level THEN true ELSE false END as is_low_stock
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN units u ON i.unit_id = u.id
      WHERE i.company_id = $1
    `;
    const params = [companyId];

    if (category_id) {
      params.push(category_id);
      sql += ` AND i.category_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(i.name) LIKE $${params.length} OR LOWER(i.item_code) LIKE $${params.length})`;
    }

    if (low_stock === 'true') {
      sql += ` AND i.current_stock <= i.min_stock_level`;
    }

    sql += ` ORDER BY i.id DESC`;

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get Items Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch items.' });
  }
}

export async function getItemById(req, res) {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;
    const itemRes = await query(
      `SELECT i.*, c.name as category_name, u.name as unit_name, u.symbol as unit_symbol
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       LEFT JOIN units u ON i.unit_id = u.id
       WHERE i.id = $1 AND i.company_id = $2`,
      [id, companyId]
    );

    if (itemRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    // Get multi-location breakdown & metrics
    const breakdown = await StockEngine.getItemStockBreakdown(id, companyId);

    // Get recent movements for this item
    const movementsRes = await query(
      `SELECT sm.*, fw.name as from_warehouse_name, tw.name as to_warehouse_name, u.name as user_name
       FROM stock_movements sm
       LEFT JOIN warehouses fw ON sm.from_warehouse_id = fw.id
       LEFT JOIN warehouses tw ON sm.to_warehouse_id = tw.id
       LEFT JOIN users u ON sm.created_by = u.id
       WHERE sm.item_id = $1 AND sm.company_id = $2
       ORDER BY sm.created_at DESC
       LIMIT 25`,
      [id, companyId]
    );

    return res.json({
      success: true,
      data: {
        ...itemRes.rows[0],
        locations: breakdown.locations,
        metrics: breakdown.metrics,
        movements: movementsRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createItem(req, res) {
  try {
    const companyId = req.user.company_id;
    const {
      item_code,
      name,
      category_id,
      unit_id,
      min_stock_level,
      purchase_price,
      selling_price,
      opening_stock,
      warehouse_id,
      description
    } = req.body;

    if (!item_code || !name || !category_id || !unit_id) {
      return res.status(400).json({ success: false, message: 'Item code, name, category, and unit are required.' });
    }

    const itemRes = await query(
      `INSERT INTO items (company_id, item_code, name, category_id, unit_id, min_stock_level, purchase_price, selling_price, current_stock, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9)
       RETURNING *`,
      [
        companyId,
        item_code.trim().toUpperCase(),
        name.trim(),
        category_id,
        unit_id,
        min_stock_level || 0,
        purchase_price || 0,
        selling_price || 0,
        description || null
      ]
    );

    const newItem = itemRes.rows[0];

    // If opening stock provided, record it via StockEngine
    const initialQty = parseFloat(opening_stock || 0);
    if (initialQty > 0) {
      // Find default warehouse for this company if not provided
      let targetWh = warehouse_id;
      if (!targetWh) {
        const whRes = await query(`SELECT id FROM warehouses WHERE company_id = $1 ORDER BY id ASC LIMIT 1`, [companyId]);
        targetWh = whRes.rows[0]?.id;
      }

      if (targetWh) {
        await StockEngine.recordMovement({
          companyId,
          itemId: newItem.id,
          movementType: 'Purchase Received',
          quantity: initialQty,
          fromWarehouseId: null,
          toWarehouseId: targetWh,
          referenceType: 'Opening Stock',
          referenceNumber: 'INIT-STOCK',
          unitCost: parseFloat(purchase_price || 0),
          notes: 'Initial Opening Stock Entry',
          userId: req.user?.id,
          userName: req.user?.name
        });
      }
    }

    await logAudit({
      companyId,
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE',
      module: 'ITEM',
      recordId: newItem.id,
      referenceNumber: newItem.item_code,
      details: `Created item: ${name} (${newItem.item_code})`
    });

    return res.status(201).json({ success: true, message: 'Item created successfully', data: newItem });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateItem(req, res) {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;
    const {
      item_code,
      name,
      category_id,
      unit_id,
      min_stock_level,
      purchase_price,
      selling_price,
      description,
      is_active
    } = req.body;

    const result = await query(
      `UPDATE items 
       SET item_code = $1, name = $2, category_id = $3, unit_id = $4, min_stock_level = $5, 
           purchase_price = $6, selling_price = $7, description = $8, is_active = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND company_id = $11
       RETURNING *`,
      [
        item_code.trim().toUpperCase(),
        name.trim(),
        category_id,
        unit_id,
        min_stock_level || 0,
        purchase_price || 0,
        selling_price || 0,
        description || null,
        is_active !== undefined ? is_active : true,
        id,
        companyId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    await logAudit({
      companyId,
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'UPDATE',
      module: 'ITEM',
      recordId: id,
      referenceNumber: item_code,
      details: `Updated item details: ${name}`
    });

    return res.json({ success: true, message: 'Item updated successfully', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteItem(req, res) {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;

    // Check if item has movement history
    const movesCheck = await query(`SELECT COUNT(*) as count FROM stock_movements WHERE item_id = $1 AND company_id = $2`, [id, companyId]);
    if (parseInt(movesCheck.rows[0]?.count || 0, 10) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete item with existing stock transactions. You may mark it as inactive instead.'
      });
    }

    await query(`DELETE FROM items WHERE id = $1 AND company_id = $2`, [id, companyId]);
    return res.json({ success: true, message: 'Item deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
