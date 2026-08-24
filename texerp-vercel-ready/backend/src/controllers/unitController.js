import { query } from '../db/index.js';

export async function getUnits(req, res) {
  try {
    const companyId = req.user.company_id;
    const result = await query(`SELECT * FROM units WHERE company_id = $1 ORDER BY id ASC`, [companyId]);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch units.' });
  }
}

export async function createUnit(req, res) {
  try {
    const companyId = req.user.company_id;
    const { name, symbol, description } = req.body;
    if (!name || !symbol) {
      return res.status(400).json({ success: false, message: 'Name and symbol are required.' });
    }

    const result = await query(
      `INSERT INTO units (company_id, name, symbol, description) VALUES ($1, $2, $3, $4) RETURNING *`,
      [companyId, name.trim(), symbol.trim(), description || null]
    );

    return res.status(201).json({ success: true, message: 'Unit created', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
