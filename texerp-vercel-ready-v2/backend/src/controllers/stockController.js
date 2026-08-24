import { query } from '../db/index.js';
import { StockEngine } from '../services/stockEngine.js';
import { logAudit } from '../middleware/auditLogger.js';

export async function getStockMovements(req, res) {
  try {
    const companyId = req.user.company_id;
    const { item_id, movement_type, warehouse_id, start_date, end_date } = req.query;
    let sql = `
      SELECT 
        sm.*,
        i.name as item_name,
        i.item_code,
        u.symbol as unit_symbol,
        c.name as category_name,
        fw.name as from_warehouse_name,
        tw.name as to_warehouse_name,
        usr.name as user_name
      FROM stock_movements sm
      JOIN items i ON sm.item_id = i.id
      LEFT JOIN units u ON i.unit_id = u.id
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN warehouses fw ON sm.from_warehouse_id = fw.id
      LEFT JOIN warehouses tw ON sm.to_warehouse_id = tw.id
      LEFT JOIN users usr ON sm.created_by = usr.id
      WHERE sm.company_id = $1
    `;
    const params = [companyId];

    if (item_id) {
      params.push(item_id);
      sql += ` AND sm.item_id = $${params.length}`;
    }

    if (movement_type) {
      params.push(movement_type);
      sql += ` AND sm.movement_type = $${params.length}`;
    }

    if (warehouse_id) {
      params.push(warehouse_id);
      sql += ` AND (sm.from_warehouse_id = $${params.length} OR sm.to_warehouse_id = $${params.length})`;
    }

    if (start_date && end_date) {
      params.push(start_date, end_date);
      sql += ` AND CAST(sm.created_at AS DATE) BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    sql += ` ORDER BY sm.created_at DESC, sm.id DESC LIMIT 100`;

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch stock movements.' });
  }
}

export async function transferStock(req, res) {
  try {
    const companyId = req.user.company_id;
    const { item_id, from_warehouse_id, to_warehouse_id, quantity, notes } = req.body;

    if (!item_id || !from_warehouse_id || !to_warehouse_id || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Item, source warehouse, destination warehouse, and quantity are required.'
      });
    }

    if (from_warehouse_id === to_warehouse_id) {
      return res.status(400).json({
        success: false,
        message: 'Source and destination warehouses cannot be the same.'
      });
    }

    const result = await StockEngine.recordMovement({
      companyId,
      itemId: item_id,
      movementType: 'Transfer',
      quantity: parseFloat(quantity),
      fromWarehouseId: from_warehouse_id,
      toWarehouseId: to_warehouse_id,
      referenceType: 'Direct Transfer',
      notes: notes || 'Warehouse-to-Warehouse Internal Transfer',
      userId: req.user?.id,
      userName: req.user?.name
    });

    return res.json({
      success: true,
      message: 'Stock successfully transferred between warehouses',
      data: result
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function adjustStock(req, res) {
  try {
    const companyId = req.user.company_id;
    const { item_id, warehouse_id, type, quantity, reason } = req.body; // type: 'ADD' or 'DEDUCT'

    if (!item_id || !warehouse_id || !quantity || !type) {
      return res.status(400).json({
        success: false,
        message: 'Item, warehouse, adjustment type (ADD/DEDUCT), and quantity are required.'
      });
    }

    const qty = parseFloat(quantity);
    let result;

    if (type === 'ADD') {
      result = await StockEngine.recordMovement({
        companyId,
        itemId: item_id,
        movementType: 'Stock Adjustment',
        quantity: qty,
        fromWarehouseId: null,
        toWarehouseId: warehouse_id,
        referenceType: 'Adjustment',
        notes: reason || 'Physical inventory positive adjustment',
        userId: req.user?.id,
        userName: req.user?.name
      });
    } else {
      result = await StockEngine.recordMovement({
        companyId,
        itemId: item_id,
        movementType: 'Stock Adjustment',
        quantity: qty,
        fromWarehouseId: warehouse_id,
        toWarehouseId: null,
        referenceType: 'Adjustment',
        notes: reason || 'Physical inventory write-off / adjustment',
        userId: req.user?.id,
        userName: req.user?.name
      });
    }

    return res.json({
      success: true,
      message: 'Stock adjustment applied successfully',
      data: result
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function getStockValuationSummary(req, res) {
  try {
    const companyId = req.user.company_id;
    const result = await query(
      `SELECT 
        c.name as category_name,
        COUNT(i.id) as item_count,
        COALESCE(SUM(i.current_stock), 0) as total_quantity,
        COALESCE(SUM(i.current_stock * i.purchase_price), 0) as total_valuation
       FROM categories c
       LEFT JOIN items i ON c.id = i.category_id AND i.company_id = c.company_id
       WHERE c.company_id = $1
       GROUP BY c.id, c.name
       ORDER BY total_valuation DESC`,
      [companyId]
    );

    const grandTotalRes = await query(
      `SELECT 
        COALESCE(SUM(current_stock), 0) as grand_total_quantity,
        COALESCE(SUM(current_stock * purchase_price), 0) as grand_total_valuation
       FROM items
       WHERE company_id = $1`,
      [companyId]
    );

    return res.json({
      success: true,
      data: {
        byCategory: result.rows,
        grandTotal: grandTotalRes.rows[0]
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
