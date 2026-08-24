import { query } from '../db/index.js';
import { logAudit } from '../middleware/auditLogger.js';

export async function getCategories(req, res) {
  try {
    const result = await query(
      `SELECT c.id, c.name, c.code, c.description, c.created_at, COUNT(i.id) as item_count 
       FROM categories c 
       LEFT JOIN items i ON c.id = i.category_id 
       GROUP BY c.id, c.name, c.code, c.description, c.created_at 
       ORDER BY c.id ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
}

export async function createCategory(req, res) {
  try {
    const { name, code, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const result = await query(
      `INSERT INTO categories (name, code, description) VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), code || null, description || null]
    );

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE',
      module: 'CATEGORY',
      recordId: result.rows[0].id,
      details: `Created category: ${name}`
    });

    return res.status(201).json({ success: true, message: 'Category created successfully', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;
    
    const result = await query(
      `UPDATE categories SET name = $1, code = $2, description = $3 WHERE id = $4 RETURNING *`,
      [name.trim(), code || null, description || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    return res.json({ success: true, message: 'Category updated successfully', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    
    // Check if items are attached
    const itemsCheck = await query(`SELECT COUNT(*) as count FROM items WHERE category_id = $1`, [id]);
    if (parseInt(itemsCheck.rows[0]?.count || 0, 10) > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete category that contains items.' });
    }

    await query(`DELETE FROM categories WHERE id = $1`, [id]);
    return res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
