import { query } from '../db/index.js';
import { logAudit } from '../middleware/auditLogger.js';

export async function getPayments(req, res) {
  try {
    const companyId = req.user.company_id;
    const { party_type, customer_id, supplier_id, payment_type, search } = req.query;
    let sql = `
      SELECT 
        pay.*,
        c.name as customer_name,
        c.company_name as customer_company,
        s.name as supplier_name,
        s.company_name as supplier_company,
        pv.name as vendor_name,
        inv.invoice_number,
        pur.invoice_number as purchase_invoice_number,
        u.name as created_by_name
      FROM payments pay
      LEFT JOIN customers c ON pay.customer_id = c.id AND c.company_id = pay.company_id
      LEFT JOIN suppliers s ON pay.supplier_id = s.id AND s.company_id = pay.company_id
      LEFT JOIN printing_vendors pv ON pay.printing_vendor_id = pv.id AND pv.company_id = pay.company_id
      LEFT JOIN invoices inv ON pay.invoice_id = inv.id AND inv.company_id = pay.company_id
      LEFT JOIN purchases pur ON pay.purchase_id = pur.id AND pur.company_id = pay.company_id
      LEFT JOIN users u ON pay.created_by = u.id
      WHERE pay.company_id = $1
    `;
    const params = [companyId];

    if (party_type) {
      params.push(party_type);
      sql += ` AND pay.party_type = $${params.length}`;
    }

    if (payment_type) {
      params.push(payment_type);
      sql += ` AND pay.payment_type = $${params.length}`;
    }

    if (customer_id) {
      params.push(customer_id);
      sql += ` AND pay.customer_id = $${params.length}`;
    }

    if (supplier_id) {
      params.push(supplier_id);
      sql += ` AND pay.supplier_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(pay.payment_number) LIKE $${params.length} OR LOWER(pay.reference_number) LIKE $${params.length})`;
    }

    sql += ` ORDER BY pay.payment_date DESC, pay.id DESC`;
    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch payments.' });
  }
}

export async function createPayment(req, res) {
  try {
    const companyId = req.user.company_id;
    const {
      payment_type, // 'Received' (customer), 'Paid' (supplier/vendor)
      party_type,   // 'Customer', 'Supplier', 'Printing Vendor'
      customer_id,
      supplier_id,
      printing_vendor_id,
      invoice_id,
      purchase_id,
      amount,
      payment_date,
      payment_method,
      reference_number,
      notes
    } = req.body;

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
    }

    const payNum = `PAY-${Date.now().toString().slice(-6)}`;
    const pDate = payment_date || new Date().toISOString().split('T')[0];
    const pMethod = payment_method || 'Cash';

    // 1. Insert Payment Record
    const payRes = await query(
      `INSERT INTO payments 
       (company_id, payment_number, payment_type, party_type, customer_id, supplier_id, printing_vendor_id, invoice_id, purchase_id, amount, payment_date, payment_method, reference_number, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        companyId,
        payNum,
        payment_type || (party_type === 'Customer' ? 'Received' : 'Paid'),
        party_type,
        customer_id || null,
        supplier_id || null,
        printing_vendor_id || null,
        invoice_id || null,
        purchase_id || null,
        amt,
        pDate,
        pMethod,
        reference_number || null,
        notes || null,
        req.user?.id
      ]
    );
    const payment = payRes.rows[0];

    // 2. Adjust Ledger & Reference status
    if (party_type === 'Customer' && customer_id) {
      // Update Customer ledger
      await query(
        `UPDATE customers 
         SET received_amount = received_amount + $1, pending_amount = GREATEST(0, pending_amount - $1)
         WHERE id = $2 AND company_id = $3`,
        [amt, customer_id, companyId]
      );

      // If specific invoice is referenced, update invoice paid/due and status
      if (invoice_id) {
        const invRes = await query(`SELECT total_amount, paid_amount FROM invoices WHERE id = $1 AND company_id = $2`, [invoice_id, companyId]);
        if (invRes.rows.length > 0) {
          const newPaid = parseFloat(invRes.rows[0].paid_amount) + amt;
          const totalAmt = parseFloat(invRes.rows[0].total_amount);
          const newDue = Math.max(0, totalAmt - newPaid);
          const status = newDue <= 0 ? 'Paid' : 'Partial';

          await query(
            `UPDATE invoices SET paid_amount = $1, due_amount = $2, payment_status = $3 WHERE id = $4 AND company_id = $5`,
            [newPaid, newDue, status, invoice_id, companyId]
          );
        }
      }
    } else if (party_type === 'Supplier' && supplier_id) {
      // Update Supplier ledger
      await query(
        `UPDATE suppliers 
         SET paid_amount = paid_amount + $1, remaining_balance = GREATEST(0, remaining_balance - $1)
         WHERE id = $2 AND company_id = $3`,
        [amt, supplier_id, companyId]
      );

      // If specific purchase referenced, update purchase paid/due and status
      if (purchase_id) {
        const purRes = await query(`SELECT total_amount, paid_amount FROM purchases WHERE id = $1 AND company_id = $2`, [purchase_id, companyId]);
        if (purRes.rows.length > 0) {
          const newPaid = parseFloat(purRes.rows[0].paid_amount) + amt;
          const totalAmt = parseFloat(purRes.rows[0].total_amount);
          const newDue = Math.max(0, totalAmt - newPaid);
          const status = newDue <= 0 ? 'Paid' : 'Partial';

          await query(
            `UPDATE purchases SET paid_amount = $1, due_amount = $2, payment_status = $3 WHERE id = $4 AND company_id = $5`,
            [newPaid, newDue, status, purchase_id, companyId]
          );
        }
      }
    } else if (party_type === 'Printing Vendor' && printing_vendor_id) {
      await query(
        `UPDATE printing_vendors 
         SET paid_amount = paid_amount + $1, pending_bills = GREATEST(0, pending_bills - $1)
         WHERE id = $2 AND company_id = $3`,
        [amt, printing_vendor_id, companyId]
      );
    }

    await logAudit({
      companyId,
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE',
      module: 'PAYMENT',
      recordId: payment.id,
      referenceNumber: payNum,
      details: `${payment_type} payment of Rs. ${amt} via ${pMethod} (${party_type})`
    });

    return res.status(201).json({
      success: true,
      message: 'Payment recorded and ledgers updated successfully',
      data: payment
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
