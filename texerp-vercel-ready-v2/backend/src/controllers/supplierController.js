import { query } from '../db/index.js';
import { logAudit } from '../middleware/auditLogger.js';

export async function getSuppliers(req, res) {
  try {
    const companyId = req.user.company_id;
    const { search } = req.query;
    let sql = `SELECT * FROM suppliers WHERE company_id = $1`;
    const params = [companyId];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(company_name) LIKE $${params.length} OR LOWER(phone) LIKE $${params.length} OR LOWER(code) LIKE $${params.length})`;
    }

    sql += ` ORDER BY id DESC`;
    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch suppliers.' });
  }
}

export async function getSupplierById(req, res) {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;
    const suppRes = await query(`SELECT * FROM suppliers WHERE id = $1 AND company_id = $2`, [id, companyId]);
    if (suppRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    // Purchases from this supplier
    const purchasesRes = await query(
      `SELECT p.*, u.name as created_by_name 
       FROM purchases p 
       LEFT JOIN users u ON p.created_by = u.id 
       WHERE p.supplier_id = $1 AND p.company_id = $2
       ORDER BY p.purchase_date DESC`,
      [id, companyId]
    );

    // Payments made to this supplier
    const paymentsRes = await query(
      `SELECT pay.*, u.name as created_by_name 
       FROM payments pay 
       LEFT JOIN users u ON pay.created_by = u.id 
       WHERE pay.supplier_id = $1 AND pay.company_id = $2
       ORDER BY pay.payment_date DESC`,
      [id, companyId]
    );

    return res.json({
      success: true,
      data: {
        ...suppRes.rows[0],
        purchases: purchasesRes.rows,
        payments: paymentsRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createSupplier(req, res) {
  try {
    const companyId = req.user.company_id;
    const { code, name, company_name, phone, email, address, opening_balance, notes } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Supplier name is required.' });
    }

    const suppCode = code || `SUP-${Date.now().toString().slice(-4)}`;
    const openBal = parseFloat(opening_balance || 0);

    const result = await query(
      `INSERT INTO suppliers (company_id, code, name, company_name, phone, email, address, opening_balance, total_payable, paid_amount, remaining_balance, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $9, $10)
       RETURNING *`,
      [
        companyId,
        suppCode.trim().toUpperCase(),
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
      module: 'SUPPLIER',
      recordId: result.rows[0].id,
      referenceNumber: result.rows[0].code,
      details: `Created supplier: ${name} (${company_name || 'Individual'})`
    });

    return res.status(201).json({ success: true, message: 'Supplier created successfully', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateSupplier(req, res) {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;
    const { code, name, company_name, phone, email, address, notes, is_active } = req.body;

    const result = await query(
      `UPDATE suppliers 
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
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    return res.json({ success: true, message: 'Supplier updated successfully', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteSupplier(req, res) {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;
    const pCheck = await query(`SELECT COUNT(*) as count FROM purchases WHERE supplier_id = $1 AND company_id = $2`, [id, companyId]);
    if (parseInt(pCheck.rows[0]?.count || 0, 10) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete supplier with existing purchase records.'
      });
    }

    await query(`DELETE FROM suppliers WHERE id = $1 AND company_id = $2`, [id, companyId]);
    return res.json({ success: true, message: 'Supplier deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
