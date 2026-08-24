import bcrypt from 'bcryptjs';
import { query } from '../db/index.js';
import { logAudit } from '../middleware/auditLogger.js';

export async function getUsers(req, res) {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.is_active, u.approval_status, u.company_id, u.created_at, u.role_id, r.name as role_name, r.description as role_description
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.company_id = $1
       ORDER BY u.id ASC`, [req.user.company_id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
}

export async function approveUser(req, res) {
  try {
    const roleId = req.body.role_id || (await query("SELECT id FROM roles WHERE name = 'Admin'")).rows[0].id;
    const companyId = req.body.company_id || req.user.company_id;
    if (!companyId) return res.status(400).json({ success: false, message: 'Company assignment is required for approval.' });
    const result = await query(
      `UPDATE users SET company_id = $1, role_id = $2, is_active = true, approval_status = 'Approved', updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND approval_status = 'Pending' RETURNING id, name, email, approval_status, is_active`,
      [companyId, roleId, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Pending user not found.' });
    return res.json({ success: true, message: 'User approved successfully.', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function rejectUser(req, res) {
  try {
    const result = await query(
      `UPDATE users SET is_active = false, approval_status = 'Rejected', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND approval_status = 'Pending' RETURNING id, name, email, approval_status, is_active`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Pending user not found.' });
    return res.json({ success: true, message: 'User registration rejected.', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createUser(req, res) {
  try {
    const { name, email, password, role_id, phone } = req.body;
    if (!name || !email || !password || !role_id) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
    }

    const emailCheck = await query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [email.trim()]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role_id, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, name, email, phone, role_id, is_active, created_at`,
      [name.trim(), email.trim(), hash, role_id, phone || null]
    );

    const newUser = result.rows[0];

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE',
      module: 'USER',
      recordId: newUser.id,
      details: `Created new user account: ${name} (${email})`
    });

    return res.status(201).json({ success: true, message: 'User created successfully', data: newUser });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, role_id, phone, is_active } = req.body;

    const result = await query(
      `UPDATE users 
       SET name = $1, role_id = $2, phone = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, name, email, phone, role_id, is_active`,
      [name.trim(), role_id, phone || null, is_active !== undefined ? is_active : true, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({ success: true, message: 'User updated successfully', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function resetUserPassword(req, res) {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(new_password, salt);

    await query(`UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [hash, id]);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'UPDATE',
      module: 'USER',
      recordId: id,
      details: `Reset password for user ID #${id}`
    });

    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
