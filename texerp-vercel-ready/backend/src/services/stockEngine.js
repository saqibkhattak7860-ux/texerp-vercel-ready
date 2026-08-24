import { query } from '../db/index.js';
import { logAudit } from '../middleware/auditLogger.js';

export class StockEngine {
  /**
   * Records a stock movement between locations, strictly guarding against negative inventory.
   */
  static async recordMovement({
    companyId,
    itemId,
    movementType,
    quantity,
    fromWarehouseId = null,
    toWarehouseId = null,
    referenceType = null,
    referenceId = null,
    referenceNumber = null,
    unitCost = 0,
    notes = '',
    userId = null,
    userName = 'System'
  }) {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error(`Invalid stock movement quantity: ${quantity}. Must be greater than zero.`);
    }

    // 1. If moving FROM a warehouse, check available balance
    if (fromWarehouseId) {
      const currentStockRes = await query(
        `SELECT quantity FROM item_warehouse_stocks WHERE item_id = $1 AND warehouse_id = $2 AND company_id = $3`,
        [itemId, fromWarehouseId, companyId]
      );
      
      const availableQty = parseFloat(currentStockRes.rows[0]?.quantity || 0);
      if (availableQty < qty) {
        // Fetch item and warehouse name for descriptive error message
        const itemInfo = await query(`SELECT name, item_code FROM items WHERE id = $1 AND company_id = $2`, [itemId, companyId]);
        const whInfo = await query(`SELECT name FROM warehouses WHERE id = $1 AND company_id = $2`, [fromWarehouseId, companyId]);
        const itemName = itemInfo.rows[0]?.name || `Item #${itemId}`;
        const whName = whInfo.rows[0]?.name || `Warehouse #${fromWarehouseId}`;

        throw new Error(
          `Negative Stock Prevented: Cannot deduct ${qty} of "${itemName}" from "${whName}". Current Available: ${availableQty}.`
        );
      }

      // Deduct from source warehouse
      await query(
        `UPDATE item_warehouse_stocks 
         SET quantity = quantity - $1 
         WHERE item_id = $2 AND warehouse_id = $3 AND company_id = $4`,
        [qty, itemId, fromWarehouseId, companyId]
      );
    }

    // 2. If moving TO a warehouse, increase balance (or insert if row does not exist)
    if (toWarehouseId) {
      const destStockRes = await query(
        `SELECT id FROM item_warehouse_stocks WHERE item_id = $1 AND warehouse_id = $2 AND company_id = $3`,
        [itemId, toWarehouseId, companyId]
      );

      if (destStockRes.rows.length > 0) {
        await query(
          `UPDATE item_warehouse_stocks 
           SET quantity = quantity + $1 
           WHERE item_id = $2 AND warehouse_id = $3 AND company_id = $4`,
          [qty, itemId, toWarehouseId, companyId]
        );
      } else {
        await query(
          `INSERT INTO item_warehouse_stocks (company_id, item_id, warehouse_id, quantity)
           VALUES ($1, $2, $3, $4)`,
          [companyId, itemId, toWarehouseId, qty]
        );
      }
    }

    // 3. Update cached current_stock in items table
    // (Sum of non-wastage warehouses or active inventory)
    const totalStockRes = await query(
      `SELECT COALESCE(SUM(iws.quantity), 0) as total
       FROM item_warehouse_stocks iws
       JOIN warehouses w ON iws.warehouse_id = w.id AND w.company_id = iws.company_id
       WHERE iws.item_id = $1 AND iws.company_id = $2 AND w.type != 'Wastage'`,
      [itemId, companyId]
    );
    const newTotalStock = parseFloat(totalStockRes.rows[0]?.total || 0);

    await query(
      `UPDATE items SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3`,
      [newTotalStock, itemId, companyId]
    );

    // 4. Insert immutable entry into stock_movements ledger
    const movementInsertRes = await query(
      `INSERT INTO stock_movements 
       (company_id, item_id, movement_type, quantity, from_warehouse_id, to_warehouse_id, reference_type, reference_id, reference_number, unit_cost, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        companyId,
        itemId,
        movementType,
        qty,
        fromWarehouseId,
        toWarehouseId,
        referenceType,
        referenceId,
        referenceNumber,
        unitCost,
        notes,
        userId
      ]
    );

    const movementId = movementInsertRes.rows[0]?.id;

    // 5. Log audit
    await logAudit({
      companyId,
      userId,
      userName,
      action: 'STOCK_MOVE',
      module: 'STOCK',
      recordId: movementId,
      referenceNumber: referenceNumber || `${movementType} #${movementId}`,
      details: {
        itemId,
        movementType,
        quantity: qty,
        fromWarehouseId,
        toWarehouseId,
        newTotalStock
      }
    });

    return {
      movementId,
      itemId,
      quantity: qty,
      newTotalStock
    };
  }

  /**
   * Returns item stock breakdown across all locations and movement history.
   */
  static async getItemStockBreakdown(itemId, companyId) {
    const locationsRes = await query(
      `SELECT w.id as warehouse_id, w.name as warehouse_name, w.type as warehouse_type, COALESCE(iws.quantity, 0) as quantity
       FROM warehouses w
       LEFT JOIN item_warehouse_stocks iws ON w.id = iws.warehouse_id AND iws.item_id = $1 AND iws.company_id = w.company_id
       WHERE w.company_id = $2
       ORDER BY w.id ASC`,
      [itemId, companyId]
    );

    const metricsRes = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN movement_type = 'Purchase Received' THEN quantity ELSE 0 END), 0) as total_purchased,
        COALESCE(SUM(CASE WHEN movement_type = 'Sent for Printing' THEN quantity ELSE 0 END), 0) as total_sent_for_printing,
        COALESCE(SUM(CASE WHEN movement_type = 'Printed Fabric Received' THEN quantity ELSE 0 END), 0) as total_printed_received,
        COALESCE(SUM(CASE WHEN movement_type = 'Production Issue' THEN quantity ELSE 0 END), 0) as total_used_in_production,
        COALESCE(SUM(CASE WHEN movement_type = 'Sales Delivery' THEN quantity ELSE 0 END), 0) as total_sold,
        COALESCE(SUM(CASE WHEN movement_type = 'Wastage' THEN quantity ELSE 0 END), 0) as total_wastage
       FROM stock_movements
       WHERE item_id = $1 AND company_id = $2`,
      [itemId, companyId]
    );

    return {
      locations: locationsRes.rows,
      metrics: metricsRes.rows[0]
    };
  }
}
