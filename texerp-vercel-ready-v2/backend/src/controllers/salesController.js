import { query } from '../db/index.js';
import { logAudit } from '../middleware/auditLogger.js';

export async function getSalesOrders(req, res) {
  try {
    const companyId = req.user.company_id;
    const { customer_id, status, search } = req.query;
    let sql = `
      SELECT sales_orders.*, c.name as customer_name, c.company_name as customer_company,
        c.phone as customer_phone, u.name as created_by_name
      FROM sales_orders
      JOIN customers c ON sales_orders.customer_id = c.id AND c.company_id = sales_orders.company_id
      LEFT JOIN users u ON sales_orders.created_by = u.id
      WHERE sales_orders.company_id = $1
    `;
    const params = [companyId];

    if (customer_id) {
      params.push(customer_id);
      sql += ` AND sales_orders.customer_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND sales_orders.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(sales_orders.order_number) LIKE $${params.length} OR LOWER(c.name) LIKE $${params.length} OR LOWER(c.company_name) LIKE $${params.length})`;
    }

    sql += ` ORDER BY sales_orders.order_date DESC, sales_orders.id DESC`;
    const result = await query(sql, params);
    const countsRes = await query(
      `SELECT sales_order_id, COUNT(id) as item_count, COALESCE(SUM(quantity), 0) as total_units_ordered,
        COALESCE(SUM(delivered_quantity), 0) as total_units_delivered
       FROM sales_order_items WHERE company_id = $1 GROUP BY sales_order_id`,
      [companyId]
    );
    const counts = new Map(countsRes.rows.map((row) => [row.sales_order_id, row]));
    const rows = result.rows.map((row) => ({ ...row, ...(counts.get(row.id) || { item_count: 0, total_units_ordered: 0, total_units_delivered: 0 }) }));
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sales orders.' });
  }
}

export async function getSalesOrderById(req, res) {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;
    const soRes = await query(
      `SELECT sales_order.*, c.name as customer_name, c.company_name as customer_company, c.phone as customer_phone, c.email as customer_email,
              c.address as customer_address, u.name as created_by_name
      FROM sales_orders sales_order
      JOIN customers c ON sales_order.customer_id = c.id AND c.company_id = sales_order.company_id
      LEFT JOIN users u ON sales_order.created_by = u.id
      WHERE sales_order.id = $1 AND sales_order.company_id = $2`,
      [id, companyId]
    );

    if (soRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sales order not found.' });
    }

    const itemsRes = await query(
      `SELECT soi.*, fp.name as product_name, fp.product_code, fp.quantity_available as stock_in_hand, u.symbol as unit_symbol
       FROM sales_order_items soi
       JOIN finished_products fp ON soi.product_id = fp.id AND fp.company_id = soi.company_id
       LEFT JOIN units u ON fp.unit_id = u.id
       WHERE soi.sales_order_id = $1 AND soi.company_id = $2`,
      [id, companyId]
    );

    const deliveriesRes = await query(
      `SELECT d.*, u.name as created_by_name 
       FROM deliveries d 
       LEFT JOIN users u ON d.created_by = u.id 
       WHERE d.sales_order_id = $1 AND d.company_id = $2
       ORDER BY d.delivery_date DESC`,
      [id, companyId]
    );

    const invoicesRes = await query(
      `SELECT inv.*, u.name as created_by_name 
       FROM invoices inv 
       LEFT JOIN users u ON inv.created_by = u.id 
       WHERE inv.sales_order_id = $1 AND inv.company_id = $2`,
      [id, companyId]
    );

    return res.json({
      success: true,
      data: {
        ...soRes.rows[0],
        items: itemsRes.rows,
        deliveries: deliveriesRes.rows,
        invoices: invoicesRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createSalesOrder(req, res) {
  try {
    const companyId = req.user.company_id;
    const {
      customer_id,
      order_date,
      delivery_date,
      notes,
      subtotal,
      discount,
      tax,
      total_amount,
      items
    } = req.body;

    if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Customer and at least one product item are required.' });
    }

    const orderNum = `SO-${Date.now().toString().slice(-5)}`;
    const oDate = order_date || new Date().toISOString().split('T')[0];

    const subTot = parseFloat(subtotal || 0);
    const disc = parseFloat(discount || 0);
    const tx = parseFloat(tax || 0);
    const totalAmt = parseFloat(total_amount || (subTot - disc + tx));

    // 1. Create Sales Order Header
    const soRes = await query(
      `INSERT INTO sales_orders (company_id, order_number, customer_id, order_date, delivery_date, subtotal, discount, tax, total_amount, status, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Confirmed', $10, $11)
       RETURNING *`,
      [companyId, orderNum, customer_id, oDate, delivery_date || null, subTot, disc, tx, totalAmt, notes || null, req.user?.id]
    );
    const order = soRes.rows[0];

    // 2. Insert Order Items
    for (const it of items) {
      const q = parseFloat(it.quantity);
      const r = parseFloat(it.rate);
      const d = parseFloat(it.discount || 0);
      const t = parseFloat(it.tax || 0);
      const rowTotal = parseFloat(it.total_amount || (q * r - d + t));

      await query(
        `INSERT INTO sales_order_items (company_id, sales_order_id, product_id, quantity, delivered_quantity, rate, discount, tax, total_amount)
         VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8)`,
        [companyId, order.id, it.product_id, q, r, d, t, rowTotal]
      );
    }

    await logAudit({
      companyId,
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE',
      module: 'SALES',
      recordId: order.id,
      referenceNumber: orderNum,
      details: `Created sales order for customer #${customer_id}. Value: Rs. ${totalAmt}`
    });

    return res.status(201).json({
      success: true,
      message: 'Sales order created successfully',
      data: order
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateSalesOrderStatus(req, res) {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Draft', 'Confirmed', 'In Production', 'Ready', 'Partially Delivered', 'Delivered', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Valid values: ${validStatuses.join(', ')}` });
    }

    const result = await query(
      `UPDATE sales_orders SET status = $1 WHERE id = $2 AND company_id = $3 RETURNING *`,
      [status, id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sales order not found.' });
    }

    return res.json({ success: true, message: `Order status updated to ${status}`, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// --- DELIVERIES ---
export async function createDelivery(req, res) {
  try {
    const companyId = req.user.company_id;
    const {
      sales_order_id,
      delivery_date,
      transport_details,
      notes,
      items
    } = req.body;

    if (!sales_order_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Sales order and dispatch items are required.' });
    }

    const soRes = await query(`SELECT * FROM sales_orders WHERE id = $1 AND company_id = $2`, [sales_order_id, companyId]);
    if (soRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sales order not found.' });
    }
    const order = soRes.rows[0];

    const delNum = `DEL-CHL-${Date.now().toString().slice(-5)}`;
    const dDate = delivery_date || new Date().toISOString().split('T')[0];

    // Look up FG warehouse
    const whRes = await query(`SELECT id FROM warehouses WHERE company_id = $1 AND type = 'Finished Goods' LIMIT 1`, [companyId]);
    const whId = whRes.rows[0]?.id || 1;

    // 1. Verify Finished Product Stock In Hand
    for (const it of items) {
      const q = parseFloat(it.quantity);
      const fpRes = await query(`SELECT name, quantity_available FROM finished_products WHERE id = $1 AND company_id = $2`, [it.product_id, companyId]);
      const fp = fpRes.rows[0];
      if (!fp || parseFloat(fp.quantity_available) < q) {
        return res.status(400).json({
          success: false,
          message: `Insufficient finished goods stock for "${fp?.name || 'Product'}". Available: ${fp?.quantity_available || 0}, Requested Delivery: ${q}`
        });
      }
    }

    // 2. Create Delivery Header
    const delRes = await query(
      `INSERT INTO deliveries (company_id, delivery_number, sales_order_id, customer_id, delivery_date, from_warehouse_id, transport_details, status, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Delivered', $8, $9)
       RETURNING *`,
      [companyId, delNum, order.id, order.customer_id, dDate, whId, transport_details || null, notes || null, req.user?.id]
    );
    const delivery = delRes.rows[0];

    // 3. Process delivery items & deduct finished product stock
    for (const it of items) {
      const q = parseFloat(it.quantity);

      await query(
        `INSERT INTO delivery_items (company_id, delivery_id, sales_order_item_id, product_id, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [companyId, delivery.id, it.sales_order_item_id, it.product_id, q]
      );

      // Update Sales Order Item delivered quantity
      await query(
        `UPDATE sales_order_items 
         SET delivered_quantity = delivered_quantity + $1 
         WHERE id = $2 AND company_id = $3`,
        [q, it.sales_order_item_id, companyId]
      );

      // Deduct Finished Product inventory
      await query(
        `UPDATE finished_products 
         SET quantity_available = quantity_available - $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 AND company_id = $3`,
        [q, it.product_id, companyId]
      );
    }

    // 4. Update Sales Order Status (Delivered vs Partially Delivered)
    const itemsCheck = await query(
      `SELECT SUM(quantity) as total_req, SUM(delivered_quantity) as total_del FROM sales_order_items WHERE sales_order_id = $1 AND company_id = $2`,
      [order.id, companyId]
    );
    const reqQ = parseFloat(itemsCheck.rows[0]?.total_req || 0);
    const delQ = parseFloat(itemsCheck.rows[0]?.total_del || 0);
    const newStatus = delQ >= reqQ ? 'Delivered' : 'Partially Delivered';

    await query(`UPDATE sales_orders SET status = $1 WHERE id = $2 AND company_id = $3`, [newStatus, order.id, companyId]);

    await logAudit({
      companyId,
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE',
      module: 'DELIVERY',
      recordId: delivery.id,
      referenceNumber: delNum,
      details: `Dispatched delivery challan #${delNum} for Order #${order.order_number}`
    });

    return res.status(201).json({
      success: true,
      message: 'Delivery dispatched and finished goods inventory updated successfully',
      data: delivery
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
