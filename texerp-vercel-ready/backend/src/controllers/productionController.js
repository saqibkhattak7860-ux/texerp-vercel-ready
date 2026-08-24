import { query } from '../db/index.js';
import { StockEngine } from '../services/stockEngine.js';
import { logAudit } from '../middleware/auditLogger.js';

export async function getGarmentCategories(req, res) {
  try {
    const result = await query('SELECT * FROM garment_categories WHERE company_id = $1 ORDER BY name ASC', [req.user.company_id]);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch garment categories.' });
  }
}

export async function createGarmentCategory(req, res) {
  try {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required.' });
    const result = await query(
      'INSERT INTO garment_categories (company_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.company_id, name]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Category already exists or is invalid.' });
  }
}

export async function updateGarmentCategory(req, res) {
  try {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required.' });
    const result = await query(
      'UPDATE garment_categories SET name = $1 WHERE id = $2 AND company_id = $3 RETURNING *',
      [name, req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Category not found.' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Category already exists or is invalid.' });
  }
}

export async function deleteGarmentCategory(req, res) {
  try {
    const used = await query('SELECT COUNT(*) as count FROM finished_products WHERE category = (SELECT name FROM garment_categories WHERE id = $1 AND company_id = $2) AND company_id = $2', [req.params.id, req.user.company_id]);
    if (parseInt(used.rows[0]?.count || 0, 10) > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete a category used by finished products.' });
    }
    const result = await query('DELETE FROM garment_categories WHERE id = $1 AND company_id = $2 RETURNING id', [req.params.id, req.user.company_id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Category not found.' });
    return res.json({ success: true, message: 'Garment category deleted successfully.' });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Unable to delete this garment category.' });
  }
}

// --- FINISHED PRODUCTS MASTER ---
export async function getFinishedProducts(req, res) {
  try {
    const companyId = req.user.company_id;
    const { search } = req.query;
    let sql = `
      SELECT fp.*, u.symbol as unit_symbol,
        (fp.quantity_available * fp.production_cost) as total_inventory_cost,
        (fp.quantity_available * fp.selling_price) as total_market_value
      FROM finished_products fp
      LEFT JOIN units u ON fp.unit_id = u.id
      WHERE fp.company_id = $1
    `;
    const params = [companyId];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(fp.name) LIKE $${params.length} OR LOWER(fp.product_code) LIKE $${params.length})`;
    }

    sql += ` ORDER BY fp.id DESC`;
    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch finished products.' });
  }
}

export async function createFinishedProduct(req, res) {
  try {
    const companyId = req.user.company_id;
    const { product_code, name, category, unit_id, production_cost, selling_price, description } = req.body;
    if (!name || !unit_id) {
      return res.status(400).json({ success: false, message: 'Product name and unit are required.' });
    }

    const pCode = product_code || `FP-${Date.now().toString().slice(-5)}`;
    const cost = parseFloat(production_cost || 0);
    const price = parseFloat(selling_price || 0);

    const result = await query(
      `INSERT INTO finished_products (company_id, product_code, name, category, unit_id, quantity_available, production_cost, selling_price, description)
       VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8)
       RETURNING *`,
      [companyId, pCode.trim().toUpperCase(), name.trim(), category || 'Finished Goods', unit_id, cost, price, description || null]
    );

    return res.status(201).json({ success: true, message: 'Finished product created', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteFinishedProduct(req, res) {
  try {
    const companyId = req.user.company_id;
    const [productionCheck, salesCheck] = await Promise.all([
      query('SELECT COUNT(*) as count FROM production_orders WHERE finished_product_id = $1 AND company_id = $2', [req.params.id, companyId]),
      query('SELECT COUNT(*) as count FROM sales_order_items WHERE product_id = $1 AND company_id = $2', [req.params.id, companyId])
    ]);
    if (parseInt(productionCheck.rows[0]?.count || 0, 10) || parseInt(salesCheck.rows[0]?.count || 0, 10)) {
      return res.status(400).json({ success: false, message: 'Cannot delete a product used in production or sales records.' });
    }
    const result = await query('DELETE FROM finished_products WHERE id = $1 AND company_id = $2 RETURNING id', [req.params.id, companyId]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Finished product not found.' });
    return res.json({ success: true, message: 'Finished product deleted successfully.' });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Unable to delete this finished product.' });
  }
}

// --- PRODUCTION ORDERS ---
export async function getProductionOrders(req, res) {
  try {
    const companyId = req.user.company_id;
    const { status } = req.query;
    let sql = `
      SELECT 
        po.*,
        fp.name as finished_product_name,
        fp.product_code as finished_product_code,
        u.symbol as unit_symbol,
        pc.material_cost,
        pc.labour_cost,
        pc.machine_cost,
        pc.other_cost,
        pc.total_production_cost,
        pc.cost_per_unit,
        usr.name as created_by_name
      FROM production_orders po
      JOIN finished_products fp ON po.finished_product_id = fp.id AND fp.company_id = po.company_id
      LEFT JOIN units u ON fp.unit_id = u.id
      LEFT JOIN production_costs pc ON po.id = pc.production_order_id AND pc.company_id = po.company_id
      LEFT JOIN users usr ON po.created_by = usr.id
      WHERE po.company_id = $1
    `;
    const params = [companyId];

    if (status) {
      params.push(status);
      sql += ` AND po.status = $${params.length}`;
    }

    sql += ` ORDER BY po.start_date DESC, po.id DESC`;
    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch production orders.' });
  }
}

export async function getProductionOrderById(req, res) {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;
    const poRes = await query(
      `SELECT po.*, fp.name as finished_product_name, fp.product_code as finished_product_code, fp.production_cost as std_cost,
              fp.selling_price as std_price, u.symbol as unit_symbol, usr.name as created_by_name
       FROM production_orders po
       JOIN finished_products fp ON po.finished_product_id = fp.id AND fp.company_id = po.company_id
       LEFT JOIN units u ON fp.unit_id = u.id
       LEFT JOIN users usr ON po.created_by = usr.id
       WHERE po.id = $1 AND po.company_id = $2`,
      [id, companyId]
    );

    if (poRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Production order not found.' });
    }

    // Materials issued / planned (BOM)
    const materialsRes = await query(
      `SELECT pm.*, i.name as item_name, i.item_code, i.current_stock, u.symbol as unit_symbol, c.name as category_name
       FROM production_materials pm
       JOIN items i ON pm.item_id = i.id AND i.company_id = pm.company_id
       LEFT JOIN units u ON i.unit_id = u.id
       LEFT JOIN categories c ON i.category_id = c.id
       WHERE pm.production_order_id = $1 AND pm.company_id = $2`,
      [id, companyId]
    );

    // Production costs
    const costsRes = await query(
      `SELECT * FROM production_costs WHERE production_order_id = $1 AND company_id = $2`,
      [id, companyId]
    );

    return res.json({
      success: true,
      data: {
        ...poRes.rows[0],
        materials: materialsRes.rows,
        costs: costsRes.rows[0] || {}
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createProductionOrder(req, res) {
  try {
    const companyId = req.user.company_id;
    const {
      finished_product_id,
      planned_quantity,
      start_date,
      completion_date,
      target_warehouse_id,
      notes,
      materials,
      labour_cost,
      machine_cost,
      other_cost
    } = req.body;

    if (!finished_product_id || !planned_quantity) {
      return res.status(400).json({ success: false, message: 'Finished product and planned quantity are required.' });
    }

    const prodNum = `PROD-${Date.now().toString().slice(-5)}`;
    const plannedQty = parseFloat(planned_quantity);

    // Lookup FG warehouse and Main warehouse
    let targetWh = target_warehouse_id;
    if (!targetWh) {
      const fgWh = await query(`SELECT id FROM warehouses WHERE company_id = $1 AND type = 'Finished Goods' LIMIT 1`, [companyId]);
      targetWh = fgWh.rows[0]?.id || 1;
    }

    const mainWh = await query(`SELECT id FROM warehouses WHERE company_id = $1 AND type = 'Main Warehouse' LIMIT 1`, [companyId]);
    const mainWhId = mainWh.rows[0]?.id || 1;

    const prodWh = await query(`SELECT id FROM warehouses WHERE company_id = $1 AND type = 'Production Department' LIMIT 1`, [companyId]);
    const prodWhId = prodWh.rows[0]?.id || mainWhId;

    const sDate = start_date || new Date().toISOString().split('T')[0];

    // 1. Create Production Order Header
    const orderRes = await query(
      `INSERT INTO production_orders 
       (company_id, production_number, finished_product_id, target_warehouse_id, planned_quantity, actual_quantity, start_date, completion_date, status, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, 0, $6, $7, 'In Progress', $8, $9)
       RETURNING *`,
      [companyId, prodNum, finished_product_id, targetWh, plannedQty, sDate, completion_date || null, notes || null, req.user?.id]
    );
    const order = orderRes.rows[0];

    let totalMaterialCost = 0;

    // 2. Issue Raw Materials & Deduct from Raw Material Warehouse
    if (materials && Array.isArray(materials) && materials.length > 0) {
      for (const mat of materials) {
        const matQty = parseFloat(mat.planned_quantity);
        const uCost = parseFloat(mat.unit_cost || 0);
        const tCost = matQty * uCost;
        totalMaterialCost += tCost;

        await query(
          `INSERT INTO production_materials (company_id, production_order_id, item_id, planned_quantity, issued_quantity, unit_cost, total_cost)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [companyId, order.id, mat.item_id, matQty, matQty, uCost, tCost]
        );

        // Deduct raw material from Main Warehouse and move to Production Dept
        await StockEngine.recordMovement({
          companyId,
          itemId: mat.item_id,
          movementType: 'Production Issue',
          quantity: matQty,
          fromWarehouseId: mainWhId,
          toWarehouseId: prodWhId,
          referenceType: 'Production Order',
          referenceId: order.id,
          referenceNumber: prodNum,
          unitCost: uCost,
          notes: `Material issued for production order: ${prodNum}`,
          userId: req.user?.id,
          userName: req.user?.name
        });
      }
    }

    // 3. Insert Production Cost Breakdown
    const labCost = parseFloat(labour_cost || 0);
    const machCost = parseFloat(machine_cost || 0);
    const othCost = parseFloat(other_cost || 0);
    const totalProdCost = totalMaterialCost + labCost + machCost + othCost;
    const costPerUnit = plannedQty > 0 ? (totalProdCost / plannedQty) : 0;

    await query(
      `INSERT INTO production_costs (company_id, production_order_id, material_cost, labour_cost, machine_cost, other_cost, total_production_cost, cost_per_unit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [companyId, order.id, totalMaterialCost, labCost, machCost, othCost, totalProdCost, costPerUnit]
    );

    await logAudit({
      companyId,
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE',
      module: 'PRODUCTION',
      recordId: order.id,
      referenceNumber: prodNum,
      details: `Started production order for ${plannedQty} units. Total Est Cost: Rs. ${totalProdCost}`
    });

    return res.status(201).json({
      success: true,
      message: 'Production order created and materials issued from warehouse',
      data: order
    });
  } catch (err) {
    console.error('Create Production Order Error:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function completeProductionOrder(req, res) {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;
    const { actual_quantity, completion_date, final_notes } = req.body;

    const poRes = await query(`SELECT * FROM production_orders WHERE id = $1 AND company_id = $2`, [id, companyId]);
    if (poRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Production order not found.' });
    }
    const po = poRes.rows[0];

    if (po.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'Order is already marked as completed.' });
    }

    const actualQty = parseFloat(actual_quantity || po.planned_quantity);
    const compDate = completion_date || new Date().toISOString().split('T')[0];

    // 1. Update Production Order Status
    await query(
      `UPDATE production_orders 
       SET status = 'Completed', actual_quantity = $1, completion_date = $2, notes = COALESCE($3, notes)
       WHERE id = $4 AND company_id = $5`,
      [actualQty, compDate, final_notes || null, id, companyId]
    );

    // 2. Increase Finished Goods Inventory
    await query(
      `UPDATE finished_products 
       SET quantity_available = quantity_available + $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND company_id = $3`,
      [actualQty, po.finished_product_id, companyId]
    );

    // Recalculate cost per unit based on actual yield
    const costRes = await query(`SELECT * FROM production_costs WHERE production_order_id = $1 AND company_id = $2`, [id, companyId]);
    if (costRes.rows.length > 0) {
      const totalCost = parseFloat(costRes.rows[0].total_production_cost);
      const newCostPerUnit = actualQty > 0 ? (totalCost / actualQty) : 0;
      await query(
        `UPDATE production_costs SET cost_per_unit = $1 WHERE production_order_id = $2 AND company_id = $3`,
        [newCostPerUnit, id, companyId]
      );
      // Update standard production cost on finished product
      await query(
        `UPDATE finished_products SET production_cost = $1 WHERE id = $2 AND company_id = $3`,
        [newCostPerUnit, po.finished_product_id, companyId]
      );
    }

    await logAudit({
      companyId,
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'STATUS_CHANGE',
      module: 'PRODUCTION',
      recordId: id,
      referenceNumber: po.production_number,
      details: `Completed production of ${actualQty} units into Finished Goods Inventory`
    });

    return res.json({
      success: true,
      message: `Production completed successfully! ${actualQty} units added to Finished Goods inventory.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
