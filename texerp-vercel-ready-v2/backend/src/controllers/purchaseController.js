import { query } from '../db/index.js';
import { StockEngine } from '../services/stockEngine.js';
import { logAudit } from '../middleware/auditLogger.js';

export async function getPurchases(req, res) {
  try {
    const { supplier_id, payment_status, search } = req.query;
    let sql = `
      SELECT 
        p.id, p.invoice_number, p.supplier_id, p.warehouse_id, p.purchase_date,
        p.subtotal, p.discount, p.tax, p.total_amount, p.paid_amount, p.due_amount,
        p.payment_status, p.notes, p.created_by, p.created_at,
        s.name as supplier_name,
        s.company_name as supplier_company,
        w.name as warehouse_name,
        u.name as created_by_name,
        COUNT(pi.id) as item_count
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      WHERE 1=1
    `;
    const params = [];

    if (supplier_id) {
      params.push(supplier_id);
      sql += ` AND p.supplier_id = $${params.length}`;
    }

    if (payment_status) {
      params.push(payment_status);
      sql += ` AND p.payment_status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(p.invoice_number) LIKE $${params.length} OR LOWER(s.name) LIKE $${params.length} OR LOWER(s.company_name) LIKE $${params.length})`;
    }

    sql += ` GROUP BY p.id, p.invoice_number, p.supplier_id, p.warehouse_id, p.purchase_date,
      p.subtotal, p.discount, p.tax, p.total_amount, p.paid_amount, p.due_amount,
      p.payment_status, p.notes, p.created_by, p.created_at,
      s.name, s.company_name, w.name, u.name ORDER BY p.purchase_date DESC, p.id DESC`;

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get Purchases Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch purchases.' });
  }
}

export async function getPurchaseById(req, res) {
  try {
    const { id } = req.params;
    const pRes = await query(
      `SELECT p.*, s.name as supplier_name, s.company_name as supplier_company, s.phone as supplier_phone, s.address as supplier_address,
              w.name as warehouse_name, u.name as created_by_name
       FROM purchases p
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       LEFT JOIN warehouses w ON p.warehouse_id = w.id
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (pRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase record not found.' });
    }

    const itemsRes = await query(
      `SELECT pi.*, i.name as item_name, i.item_code, u.symbol as unit_symbol, c.name as category_name
       FROM purchase_items pi
       JOIN items i ON pi.item_id = i.id
       LEFT JOIN units u ON i.unit_id = u.id
       LEFT JOIN categories c ON i.category_id = c.id
       WHERE pi.purchase_id = $1`,
      [id]
    );

    const paymentsRes = await query(
      `SELECT pay.*, u.name as created_by_name 
       FROM payments pay 
       LEFT JOIN users u ON pay.created_by = u.id
       WHERE pay.purchase_id = $1
       ORDER BY pay.payment_date DESC`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...pRes.rows[0],
        items: itemsRes.rows,
        payments: paymentsRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createPurchase(req, res) {
  try {
    const companyId = req.user.company_id;
    const {
      invoice_number,
      supplier_id,
      warehouse_id,
      purchase_date,
      items,
      subtotal,
      discount,
      tax,
      total_amount,
      paid_amount,
      notes
    } = req.body;

    if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Supplier and at least one purchase item are required.' });
    }

    const invNum = invoice_number || `PUR-INV-${Date.now().toString().slice(-6)}`;
    const whId = warehouse_id || 1; // Default to Main Raw Material Warehouse
    const pDate = purchase_date || new Date().toISOString().split('T')[0];

    const subTot = parseFloat(subtotal || 0);
    const disc = parseFloat(discount || 0);
    const tx = parseFloat(tax || 0);
    const totalAmt = parseFloat(total_amount || (subTot - disc + tx));
    const paidAmt = parseFloat(paid_amount || 0);
    const dueAmt = totalAmt - paidAmt;
    const paymentStatus = dueAmt <= 0 ? 'Paid' : (paidAmt > 0 ? 'Partial' : 'Unpaid');

    // 1. Insert Purchase Header
    const purchaseRes = await query(
      `INSERT INTO purchases 
       (company_id, invoice_number, supplier_id, warehouse_id, purchase_date, subtotal, discount, tax, total_amount, paid_amount, due_amount, payment_status, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        companyId,
        invNum.trim(),
        supplier_id,
        whId,
        pDate,
        subTot,
        disc,
        tx,
        totalAmt,
        paidAmt,
        dueAmt,
        paymentStatus,
        notes || null,
        req.user?.id
      ]
    );

    const purchase = purchaseRes.rows[0];

    // 2. Insert Purchase Items & Process Stock Inflow via StockEngine
    for (const it of items) {
      const itemQty = parseFloat(it.quantity);
      const itemRate = parseFloat(it.rate);
      const itemDisc = parseFloat(it.discount || 0);
      const itemTax = parseFloat(it.tax || 0);
      const itemTotal = parseFloat(it.total_amount || (itemQty * itemRate - itemDisc + itemTax));

      await query(
        `INSERT INTO purchase_items (company_id, purchase_id, item_id, quantity, rate, discount, tax, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [companyId, purchase.id, it.item_id, itemQty, itemRate, itemDisc, itemTax, itemTotal]
      );

      // Stock intake to target warehouse
      await StockEngine.recordMovement({
        companyId,
        itemId: it.item_id,
        movementType: 'Purchase Received',
        quantity: itemQty,
        fromWarehouseId: null,
        toWarehouseId: whId,
        referenceType: 'Purchase',
        referenceId: purchase.id,
        referenceNumber: invNum,
        unitCost: itemRate,
        notes: `Purchase from supplier: ${invNum}`,
        userId: req.user?.id,
        userName: req.user?.name
      });
    }

    // 3. Update Supplier Balances
    await query(
      `UPDATE suppliers 
       SET total_payable = total_payable + $1, 
           paid_amount = paid_amount + $2, 
           remaining_balance = remaining_balance + $3
      WHERE id = $4 AND company_id = $5`,
      [totalAmt, paidAmt, dueAmt, supplier_id, companyId]
    );

    // 4. If initial payment made, record in payments table
    if (paidAmt > 0) {
      const payNum = `PAY-SUP-${Date.now().toString().slice(-6)}`;
      await query(
        `INSERT INTO payments (company_id, payment_number, payment_type, party_type, supplier_id, purchase_id, amount, payment_date, payment_method, notes, created_by)
         VALUES ($1, $2, 'Paid', 'Supplier', $3, $4, $5, $6, 'Cash', 'Initial purchase payment', $7)`,
        [companyId, payNum, supplier_id, purchase.id, paidAmt, pDate, req.user?.id]
      );
    }

    await logAudit({
      companyId,
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE',
      module: 'PURCHASE',
      recordId: purchase.id,
      referenceNumber: invNum,
      details: `Created purchase order with ${items.length} items. Total: Rs. ${totalAmt}`
    });

    return res.status(201).json({
      success: true,
      message: 'Purchase created and inventory successfully updated into warehouse',
      data: purchase
    });
  } catch (err) {
    console.error('Create Purchase Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
