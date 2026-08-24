import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { config } from '../config/index.js';
import { logAudit } from '../middleware/auditLogger.js';

export async function register(req, res) {
  try {
    const { name, email, password, company_name, logo_url } = req.body;
    if (!name?.trim() || !email?.trim() || !company_name?.trim() || !password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Name, company name, email, and a password of at least 6 characters are required.' });
    }
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (existing.rows.length) return res.status(400).json({ success: false, message: 'Email is already registered.' });
    const role = await query("SELECT id FROM roles WHERE name = 'Admin'");
    const hash = await bcrypt.hash(password, 10);
    const company = await query(
      `INSERT INTO companies (name, admin_name, admin_email, logo_url, status, notes)
       VALUES ($1, $2, $3, $4, 'Pending', 'Created through public registration; awaiting Main Admin approval.') RETURNING id`,
      [company_name.trim(), name.trim(), email.trim(), logo_url || null]
    );
    const result = await query(
      `INSERT INTO users (company_id, name, email, password_hash, role_id, is_active, approval_status)
       VALUES ($1, $2, $3, $4, $5, false, 'Pending') RETURNING id, name, email, created_at`,
      [company.rows[0].id, name.trim(), email.trim(), hash, role.rows[0].id]
    );
    const pendingUser = result.rows[0];
    const admins = await query("SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'Main Admin') AND is_active = true AND approval_status = 'Approved'", []);
    for (const admin of admins.rows) {
      await query(
        `INSERT INTO notifications (company_id, type, title, message, severity, reference_type, reference_id)
         VALUES ($1, 'system', 'New Registration Pending', $2, 'warning', 'USER', $3)`,
        [null, `${pendingUser.name} (${pendingUser.email}) registered and is waiting for approval.`, pendingUser.id]
      );
    }
    return res.status(201).json({ success: true, message: 'Registration submitted. Please wait for Admin approval.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const userRes = await query(
      `SELECT u.id, u.company_id, u.name, u.email, u.password_hash, u.phone, u.is_active, u.approval_status, u.role_id,
              r.name as role_name,
              c.name as company_name, c.status as company_status, c.currency as company_currency, c.logo_url
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email.trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = userRes.rows[0];

    if (user.approval_status === 'Pending') {
      return res.status(403).json({ success: false, message: 'Your account is pending Admin approval.' });
    }

      if (user.approval_status === 'Rejected') {
        return res.status(403).json({ success: false, message: 'Your registration was rejected by Admin.' });
      }

      // Check individual user status
      if (!user.is_active) {
        return res.status(403).json({ success: false, message: 'Your account is deactivated. Please contact Main Admin.' });
      }


    // Check Company status for Client Admins
    if (user.role_name === 'Admin' && user.company_id) {
      if (user.company_status === 'Suspended') {
        return res.status(403).json({
          success: false,
          message: 'Your company account has been suspended by Main Admin. Access is blocked.'
        });
      }
      if (user.company_status === 'Inactive') {
        return res.status(403).json({
          success: false,
          message: 'Your company account is inactive. Please contact Main Admin for reactivation.'
        });
      }
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role_name,
        companyId: user.company_id
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        company_id: user.company_id,
        company_name: user.company_name,
        company_status: user.company_status,
        company_currency: user.company_currency || 'PKR',
        logo_url: user.logo_url,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role_id: user.role_id,
        role_name: user.role_name
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
  }
}

export async function getCurrentUser(req, res) {
  try {
    return res.json({
      success: true,
      user: {
        id: req.user.id,
        company_id: req.user.company_id,
        company_name: req.user.company_name,
        company_status: req.user.company_status,
        company_currency: req.user.company_currency || 'PKR',
        logo_url: req.user.logo_url,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role_id: req.user.role_id,
        role_name: req.user.role_name
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error retrieving user profile.' });
  }
}

export async function getRoles(req, res) {
  try {
    const rolesRes = await query(`SELECT id, name, description FROM roles ORDER BY id ASC`);
    return res.json({ success: true, data: rolesRes.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error fetching roles.' });
  }
}
