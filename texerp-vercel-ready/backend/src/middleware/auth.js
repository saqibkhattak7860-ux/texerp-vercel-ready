import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { query } from '../db/index.js';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token required. Please log in.'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Fetch fresh user record with company and role info
    const userRes = await query(
      `SELECT u.id, u.company_id, u.name, u.email, u.phone, u.is_active, u.role_id,
              r.name as role_name,
              c.name as company_name, c.status as company_status, c.currency as company_currency, c.logo_url
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated or does not exist.'
      });
    }

    const user = userRes.rows[0];

    // For company Admins, verify company is active
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
          message: 'Your company account is inactive. Please contact Main Admin.'
        });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired session token.'
    });
  }
}

// Middleware to ensure route is accessed within a valid tenant company context
export function requireTenant(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (req.user.role_name === 'Admin') {
    if (!req.user.company_id) {
      return res.status(403).json({ success: false, message: 'Tenant company context missing.' });
    }
    return next();
  }

  // If Main Admin accesses a tenant route, allow if company_id is provided via header/query or allow if authorized
  return next();
}
