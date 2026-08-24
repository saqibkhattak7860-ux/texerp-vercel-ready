import { query } from '../db/index.js';
import { logAudit } from '../middleware/auditLogger.js';

export async function getCustomers(req, res) {
  try {
    const companyId = req.user.company_id;
    const { search } = req.query;
    let sql = `SELECT * FROM customers WHERE company_id = $1`;
    const params = [companyId];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(company_name) LIKE $${params.length} OR LOWER(phone) LIKE $${params.length} OR LOWER(code) LIKE $${params.length})`;
    }

    sql += ` ORDER BY id DESC`;
    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch customers.' });
  }
}

export async function getCustomerById(req, res) {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;
    const custRes = await query(`SELECT * FROM customers WHERE id = $1 AND company_id = $2`, [id, companyId]);
    if (custRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Orders by this customer
    const ordersRes = await query(
      `SELECT so.*, u.name as created_by_name 
       FROM sales_orders so 
       LEFT JOIN users u ON so.created_by = u.id 
       WHERE so.customer_id = $1 AND so.company_id = $2
       ORDER BY so.order_date DESC`,
      [id, companyId]
    );

    // Invoices
    const invoicesRes = await query(
      `SELECT inv.*, u.name as created_by_name 
       FROM invoices inv 
       LEFT JOIN users u ON inv.created_by = u.id 
       WHERE inv.customer_id = $1 AND inv.company_id = $2
       ORDER BY inv.invoice_date DESC`,
      [id, companyId]
    );

    // Payments received from this customer
    const paymentsRes = await query(
      `SELECT pay.*, u.name as created_by_name 
       FROM payments pay 
       LEFT JOIN users u ON pay.created_by = u.id 
       WHERE pay.customer_id = $1 AND pay.company_id = $2
       ORDER BY pay.payment_date DESC`,
      [id, companyId]
    );

    return res.json({
      success: true,
      data: {
        ...custRes.rows[0],
        orders: ordersRes.rows,
        invoices: invoicesRes.rows,
        payments: paymentsRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createCustomer(req, res) {
  try {
    const companyId = req.user.company_id;
    const { code, name, company_name, phone, email, address, opening_balance, notes } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Customer name is required.' });
    }

    const custCode = code || `CUST-${Date.now().toString().slice(-4)}`;
    const openBal = parseFloat(opening_balance || 0);

    const result = await query(
      `INSERT INTO customers (company_id, code, name, company_name, phone, email, address, opening_balance, total_receivable, received_amount, pending_amount, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $9, $10)
       RETURNING *`,
      [
        companyId,
        custCode.trim().toUpperCase(),
        name.trim(),
        company_name || null,
        phone || null,
        email || null,
        address || null,
        openBal,
        openBal,
        notes || null
      ]
    );

    await logAudit({
      companyId,
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE',
      module: 'CUSTOMER',
      recordId: result.rows[0].id,
      referenceNumber: result.rows[0].code,
      details: `Created customer: ${name} (${company_name || 'Direct'})`
    });

    return res.status(201).json({ success: true, message: 'Customer created successfully', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateCustomer(req, res) {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;
    const { code, name, company_name, phone, email, address, notes, is_active } = req.body;

    const result = await query(
      `UPDATE customers 
       SET code = COALESCE($1, code), name = $2, company_name = $3, phone = $4, email = $5, address = $6, notes = $7, is_active = $8
       WHERE id = $9 AND company_id = $10
       RETURNING *`,
      [
        code ? code.trim().toUpperCase() : null,
        name.trim(),
        company_name || null,
        phone || null,
        email || null,
        address || null,
        notes || null,
        is_active !== undefined ? is_active : true,
        id,
        companyId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    return res.json({ success: true, message: 'Customer updated successfully', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteCustomer(req, res) {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;
    const invCheck = await query(`SELECT COUNT(*) as count FROM invoices WHERE customer_id = $1 AND company_id = $2`, [id, companyId]);
    if (parseInt(invCheck.rows[0]?.count || 0, 10) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer with existing invoice records.'
      });
    }

    await query(`DELETE FROM customers WHERE id = $1 AND company_id = $2`, [id, companyId]);
    return res.json({ success: true, message: 'Customer deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
