import { query } from '../db/index.js';
import { logAudit } from '../middleware/auditLogger.js';

// Get Current Client Company Settings
export async function getCompanySettings(req, res) {
  try {
    const companyId = req.user.company_id;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'No company associated with this account.' });
    }

    const compRes = await query(`SELECT * FROM companies WHERE id = $1`, [companyId]);
    if (compRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Company record not found.' });
    }

    return res.json({
      success: true,
      data: compRes.rows[0]
    });
  } catch (err) {
    console.error('Get Company Settings Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve company settings.' });
  }
}

// Update Current Client Company Settings
export async function updateCompanySettings(req, res) {
  try {
    const companyId = req.user.company_id;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'No company associated with this account.' });
    }

    const {
      name,
      admin_name,
      phone,
      address,
      tax_number,
      currency,
      invoice_prefix,
      logo_url,
      notes
    } = req.body;

    const compRes = await query(
      `UPDATE companies
       SET name = COALESCE($1, name),
           admin_name = COALESCE($2, admin_name),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           tax_number = COALESCE($5, tax_number),
           currency = COALESCE($6, currency),
           invoice_prefix = COALESCE($7, invoice_prefix),
           logo_url = COALESCE($8, logo_url),
           notes = COALESCE($9, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [name, admin_name, phone, address, tax_number, currency, invoice_prefix, logo_url, notes, companyId]
    );

    if (compRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Company record not found.' });
    }

    await logAudit({
      companyId: companyId,
      userId: req.user.id,
      userName: req.user.name,
      action: 'UPDATE',
      module: 'COMPANY',
      recordId: companyId,
      details: `Company profile & settings updated by ${req.user.name}`
    });

    return res.json({
      success: true,
      message: 'Company settings updated successfully.',
      data: compRes.rows[0]
    });
  } catch (err) {
    console.error('Update Company Settings Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update company settings.' });
  }
}
