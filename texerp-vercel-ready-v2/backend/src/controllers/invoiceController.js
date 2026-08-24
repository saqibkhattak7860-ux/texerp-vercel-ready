import { query } from '../db/index.js';
import { logAudit } from '../middleware/auditLogger.js';

export async function getInvoices(req, res) {
  try {
    const companyId = req.user.company_id;
    const { customer_id, payment_status, search } = req.query;
    let sql = `
      SELECT invoices.*, c.name as customer_name, c.company_name as customer_company,
        c.phone as customer_phone, s.order_number, u.name as created_by_name
      FROM invoices
      JOIN customers c ON invoices.customer_id = c.id AND c.company_id = invoices.company_id
      LEFT JOIN sales_orders s ON invoices.sales_order_id = s.id AND s.company_id = invoices.company_id
      LEFT JOIN users u ON invoices.created_by = u.id
      WHERE invoices.company_id = $1
    `;
    const params = [companyId];

    if (customer_id) {
      params.push(customer_id);
      sql += ` AND invoices.customer_id = $${params.length}`;
    }

    if (payment_status) {
      params.push(payment_status);
      sql += ` AND invoices.payment_status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(invoices.invoice_number) LIKE $${params.length} OR LOWER(c.name) LIKE $${params.length} OR LOWER(c.company_name) LIKE $${params.length})`;
    }

    sql += ` ORDER BY invoices.invoice_date DESC, invoices.id DESC`;
    const result = await query(sql, params);
    const countsRes = await query(`SELECT invoice_id, COUNT(id) as total_items FROM invoice_items WHERE company_id = $1 GROUP BY invoice_id`, [companyId]);
    const counts = new Map(countsRes.rows.map((row) => [row.invoice_id, row.total_items]));
    const rows = result.rows.map((row) => ({ ...row, total_items: counts.get(row.id) || 0 }));
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch invoices.' });
  }
}

export async function getInvoiceById(req, res) {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;
    const invRes = await query(
      `SELECT i.*, c.name as customer_name, c.company_name as customer_company, c.phone as customer_phone,
            c.email as customer_email, c.address as customer_address, s.order_number, u.name as created_by_name,
            company.name as company_name, company.phone as company_phone, company.address as company_address,
            company.tax_number as company_tax_number, company.logo_url as company_logo_url,
            company.currency as company_currency, company.notes as company_notes
                  FROM invoices i
                  JOIN customers c ON i.customer_id = c.id AND c.company_id = i.company_id
                  LEFT JOIN sales_orders s ON i.sales_order_id = s.id AND s.company_id = i.company_id
                  LEFT JOIN users u ON i.created_by = u.id
                  JOIN companies company ON company.id = i.company_id
                  WHERE i.id = $1 AND i.company_id = $2`,
      [id, companyId]
    );

    if (invRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const itemsRes = await query(
      `SELECT ii.*, fp.name as product_name, fp.product_code, u.symbol as unit_symbol
       FROM invoice_items ii
       JOIN finished_products fp ON ii.product_id = fp.id AND fp.company_id = ii.company_id
       LEFT JOIN units u ON fp.unit_id = u.id
       WHERE ii.invoice_id = $1 AND ii.company_id = $2`,
      [id, companyId]
    );

    const paymentsRes = await query(
      `SELECT pay.*, u.name as created_by_name 
       FROM payments pay 
       LEFT JOIN users u ON pay.created_by = u.id 
       WHERE pay.invoice_id = $1 AND pay.company_id = $2
       ORDER BY pay.payment_date DESC`,
      [id, companyId]
    );

    return res.json({
      success: true,
      data: {
        ...invRes.rows[0],
        company: {
          name: invRes.rows[0].company_name,
          phone: invRes.rows[0].company_phone,
          address: invRes.rows[0].company_address,
          tax_number: invRes.rows[0].company_tax_number,
          logo_url: invRes.rows[0].company_logo_url,
          currency: invRes.rows[0].company_currency,
          notes: invRes.rows[0].company_notes
        },
        items: itemsRes.rows,
        payments: paymentsRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createInvoice(req, res) {
  try {
    const companyId = req.user.company_id;
    const {
      sales_order_id,
      customer_id,
      invoice_date,
      due_date,
      subtotal,
      discount,
      tax,
      total_amount,
      paid_amount,
      notes,
      items
    } = req.body;

    if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Customer and at least one invoice item are required.' });
    }

    const invNum = `INV-${Date.now().toString().slice(-6)}`;
    const iDate = invoice_date || new Date().toISOString().split('T')[0];
    const dDate = due_date || null;

    const subTot = parseFloat(subtotal || 0);
    const disc = parseFloat(discount || 0);
    const tx = parseFloat(tax || 0);
    const totalAmt = parseFloat(total_amount || (subTot - disc + tx));
    const paidAmt = parseFloat(paid_amount || 0);
    const dueAmt = totalAmt - paidAmt;
    const paymentStatus = dueAmt <= 0 ? 'Paid' : (paidAmt > 0 ? 'Partial' : 'Unpaid');

    // 1. Create Invoice Header
    const invRes = await query(
      `INSERT INTO invoices 
       (company_id, invoice_number, sales_order_id, customer_id, invoice_date, due_date, subtotal, discount, tax, total_amount, paid_amount, due_amount, payment_status, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [companyId, invNum, sales_order_id || null, customer_id, iDate, dDate, subTot, disc, tx, totalAmt, paidAmt, dueAmt, paymentStatus, notes || null, req.user?.id]
    );
    const invoice = invRes.rows[0];

    // 2. Insert Invoice Items
    for (const it of items) {
      const q = parseFloat(it.quantity);
      const r = parseFloat(it.rate);
      const d = parseFloat(it.discount || 0);
      const t = parseFloat(it.tax || 0);
      const rowTotal = parseFloat(it.total_amount || (q * r - d + t));

      await query(
        `INSERT INTO invoice_items (company_id, invoice_id, product_id, quantity, rate, discount, tax, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [companyId, invoice.id, it.product_id, q, r, d, t, rowTotal]
      );
    }

    // 3. Update Customer Balances
    await query(
      `UPDATE customers 
       SET total_receivable = total_receivable + $1, 
           received_amount = received_amount + $2, 
           pending_amount = pending_amount + $3 
       WHERE id = $4 AND company_id = $5`,
      [totalAmt, paidAmt, dueAmt, customer_id, companyId]
    );

    // 4. If initial payment made, record in payments table
    if (paidAmt > 0) {
      const payNum = `PAY-CUST-${Date.now().toString().slice(-6)}`;
      await query(
        `INSERT INTO payments (company_id, payment_number, payment_type, party_type, customer_id, invoice_id, amount, payment_date, payment_method, notes, created_by)
         VALUES ($1, $2, 'Received', 'Customer', $3, $4, $5, $6, 'Cash', 'Initial invoice payment', $7)`,
        [companyId, payNum, customer_id, invoice.id, paidAmt, iDate, req.user?.id]
      );
    }

    await logAudit({
      companyId,
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE',
      module: 'INVOICE',
      recordId: invoice.id,
      referenceNumber: invNum,
      details: `Generated invoice #${invNum} for customer #${customer_id}. Amount: Rs. ${totalAmt}`
    });

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
