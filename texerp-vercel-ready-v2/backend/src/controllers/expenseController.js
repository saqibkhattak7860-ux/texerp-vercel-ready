import { query } from '../db/index.js';
import { logAudit } from '../middleware/auditLogger.js';

export async function getExpenseCategories(req, res) {
  try {
    const companyId = req.user.company_id;
    const result = await query(
      `SELECT * FROM expense_categories
       WHERE company_id = $1
      ORDER BY id ASC`,
      [companyId]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch expense categories.' });
  }
}

export async function getExpenses(req, res) {
  try {
    const companyId = req.user.company_id;
    const { category_id, start_date, end_date, search } = req.query;
    let sql = `
      SELECT 
        e.*,
        ec.name as category_name,
        u.name as created_by_name
      FROM expenses e
      JOIN expense_categories ec ON e.category_id = ec.id AND ec.company_id = e.company_id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.company_id = $1
    `;
    const params = [companyId];

    if (category_id) {
      params.push(category_id);
      sql += ` AND e.category_id = $${params.length}`;
    }

    if (start_date && end_date) {
      params.push(start_date, end_date);
      sql += ` AND e.expense_date BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(e.description) LIKE $${params.length} OR LOWER(e.expense_number) LIKE $${params.length})`;
    }

    sql += ` ORDER BY e.expense_date DESC, e.id DESC`;
    const result = await query(sql, params);

    const totalSpent = result.rows.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    return res.json({
      success: true,
      data: result.rows,
      total: totalSpent
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch expenses.' });
  }
}

export async function createExpense(req, res) {
  try {
    const companyId = req.user.company_id;
    const { category_id, description, amount, expense_date, payment_method, reference_number, notes } = req.body;
    if (!category_id || !description || !amount) {
      return res.status(400).json({ success: false, message: 'Category, description, and amount are required.' });
    }

    const expNum = `EXP-${Date.now().toString().slice(-6)}`;
    const eDate = expense_date || new Date().toISOString().split('T')[0];
    const amt = parseFloat(amount);

    const result = await query(
      `INSERT INTO expenses (company_id, expense_number, category_id, description, amount, expense_date, payment_method, reference_number, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [companyId, expNum, category_id, description.trim(), amt, eDate, payment_method || 'Cash', reference_number || null, notes || null, req.user?.id]
    );

    await logAudit({
      companyId,
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE',
      module: 'EXPENSE',
      recordId: result.rows[0].id,
      referenceNumber: expNum,
      details: `Logged expense: ${description} (Rs. ${amt})`
    });

    return res.status(201).json({ success: true, message: 'Expense recorded successfully', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createExpenseCategory(req, res) {
  try {
    const companyId = req.user.company_id;
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const result = await query(
      `INSERT INTO expense_categories (company_id, name, description) VALUES ($1, $2, $3) RETURNING *`,
      [companyId, name.trim(), description || null]
    );

    return res.status(201).json({ success: true, message: 'Expense category created', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
