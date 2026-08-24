import bcrypt from 'bcryptjs';
import { query } from '../db/index.js';
import { logAudit } from '../middleware/auditLogger.js';

export async function getPendingUsers(req, res) {
  try {
    const result = await query("SELECT u.id, u.name, u.email, u.created_at, u.approval_status, u.company_id, c.name as company_name, c.logo_url FROM users u LEFT JOIN companies c ON c.id = u.company_id WHERE u.approval_status = 'Pending' ORDER BY u.created_at ASC");
    const companies = await query("SELECT id, name FROM companies WHERE status IN ('Active', 'Pending') ORDER BY name ASC");
    const roles = await query("SELECT id, name FROM roles WHERE name <> 'Main Admin' ORDER BY id ASC");
    return res.json({ success: true, data: { users: result.rows, companies: companies.rows, roles: roles.rows } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load pending registrations.' });
  }
}

// 1. Main Admin Dashboard Stats
export async function getMainAdminDashboard(req, res) {
  try {
    const totalRes = await query(`SELECT COUNT(*) as count FROM companies`);
    const activeRes = await query(`SELECT COUNT(*) as count FROM companies WHERE status = 'Active'`);
    const inactiveRes = await query(`SELECT COUNT(*) as count FROM companies WHERE status = 'Inactive'`);
    const suspendedRes = await query(`SELECT COUNT(*) as count FROM companies WHERE status = 'Suspended'`);
    const newRes = await query(`SELECT COUNT(*) as count FROM companies WHERE created_at >= NOW() - INTERVAL '30 days'`);

    const recentCompaniesRes = await query(
      `SELECT * FROM companies ORDER BY created_at DESC LIMIT 10`
    );

    return res.json({
      success: true,
      data: {
        kpis: {
          totalAccounts: parseInt(totalRes.rows[0]?.count || 0, 10),
          activeAccounts: parseInt(activeRes.rows[0]?.count || 0, 10),
          inactiveAccounts: parseInt(inactiveRes.rows[0]?.count || 0, 10),
          suspendedAccounts: parseInt(suspendedRes.rows[0]?.count || 0, 10),
          newAccounts: parseInt(newRes.rows[0]?.count || 0, 10)
        },
        recentCompanies: recentCompaniesRes.rows
      }
    });
  } catch (err) {
    console.error('Main Admin Dashboard Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch main admin dashboard statistics.' });
  }
}

// 2. Get All Client Companies
export async function getCompanies(req, res) {
  try {
    const { status, search } = req.query;
    let queryStr = `SELECT * FROM companies WHERE 1=1`;
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      queryStr += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      queryStr += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(admin_name) LIKE $${params.length} OR LOWER(admin_email) LIKE $${params.length})`;
    }

    queryStr += ` ORDER BY created_at DESC`;

    const companiesRes = await query(queryStr, params);
    return res.json({ success: true, data: companiesRes.rows });
  } catch (err) {
    console.error('Get Companies Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load client companies.' });
  }
}

// 3. Get Single Company Details
export async function getCompanyById(req, res) {
  try {
    const { id } = req.params;
    const companyRes = await query(`SELECT * FROM companies WHERE id = $1`, [id]);

    if (companyRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client company account not found.' });
    }

    const adminUserRes = await query(
      `SELECT id, name, email, phone, is_active FROM users WHERE company_id = $1 AND role_id = 2 LIMIT 1`,
      [id]
    );

    const itemsCountRes = await query(`SELECT COUNT(*) as count FROM items WHERE company_id = $1`, [id]);
    const ordersCountRes = await query(`SELECT COUNT(*) as count FROM sales_orders WHERE company_id = $1`, [id]);
    const purchasesCountRes = await query(`SELECT COUNT(*) as count FROM purchases WHERE company_id = $1`, [id]);
    const invoicesCountRes = await query(`SELECT COUNT(*) as count FROM invoices WHERE company_id = $1`, [id]);

    return res.json({
      success: true,
      data: {
        ...companyRes.rows[0],
        admin_user: adminUserRes.rows[0] || null,
        total_items: parseInt(itemsCountRes.rows[0]?.count || 0, 10),
        total_orders: parseInt(ordersCountRes.rows[0]?.count || 0, 10),
        total_purchases: parseInt(purchasesCountRes.rows[0]?.count || 0, 10),
        total_invoices: parseInt(invoicesCountRes.rows[0]?.count || 0, 10)
      }
    });
  } catch (err) {
    console.error('Get Company Detail Error:', err);
    return res.status(500).json({ success: false, message: 'Error retrieving company account details.' });
  }
}

// 4. Create Client Company Account
export async function createCompany(req, res) {
  try {
    const {
      name,
      admin_name,
      admin_email,
      phone,
      password,
      status = 'Active',
      currency = 'PKR',
      address,
      tax_number,
      invoice_prefix = 'INV',
      notes
    } = req.body;

    if (!name || !admin_name || !admin_email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Company name, Admin name, Admin email, and temporary password are required.'
      });
    }

    // Check if email already in use
    const emailCheck = await query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [admin_email.trim()]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Admin email '${admin_email}' is already registered with another account.`
      });
    }

    // 1. Create Company
    const compRes = await query(
      `INSERT INTO companies (name, admin_name, admin_email, phone, address, tax_number, currency, invoice_prefix, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        name.trim(),
        admin_name.trim(),
        admin_email.trim(),
        phone || null,
        address || null,
        tax_number || null,
        currency || 'PKR',
        invoice_prefix || 'INV',
        status || 'Active',
        notes || null
      ]
    );

    const company = compRes.rows[0];

    // 2. Hash Password and Create Client Admin User (Role 2: Admin)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userRes = await query(
      `INSERT INTO users (company_id, name, email, password_hash, role_id, phone, is_active)
       VALUES ($1, $2, $3, $4, 2, $5, $6)
       RETURNING id, name, email, role_id, is_active`,
      [
        company.id,
        admin_name.trim(),
        admin_email.trim(),
        passwordHash,
        phone || null,
        status === 'Active'
      ]
    );

    // 3. Seed Default Warehouses, Categories, Units, Expense Categories for new company
    await seedDefaultCompanyData(company.id);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CREATE',
      module: 'COMPANY',
      recordId: company.id,
      details: `Main Admin created new Client Account: ${company.name} (${admin_email})`
    });

    return res.status(201).json({
      success: true,
      message: `Client Account '${company.name}' created successfully.`,
      data: {
        company,
        admin_user: userRes.rows[0]
      }
    });
  } catch (err) {
    console.error('Create Company Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create client company account.' });
  }
}

// 5. Update Company Details
export async function updateCompany(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      admin_name,
      phone,
      address,
      tax_number,
      currency,
      invoice_prefix,
      status,
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
           status = COALESCE($8, status),
           notes = COALESCE($9, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [name, admin_name, phone, address, tax_number, currency, invoice_prefix, status, notes, id]
    );

    if (compRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Company account not found.' });
    }

    // Sync admin user active state if company status is modified
    if (status) {
      await query(
        `UPDATE users SET is_active = $1 WHERE company_id = $2`,
        [status === 'Active', id]
      );
    }

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'UPDATE',
      module: 'COMPANY',
      recordId: id,
      details: `Main Admin updated company account '${compRes.rows[0].name}'. Status: ${compRes.rows[0].status}`
    });

    return res.json({
      success: true,
      message: 'Company account details updated successfully.',
      data: compRes.rows[0]
    });
  } catch (err) {
    console.error('Update Company Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update company details.' });
  }
}

// 6. Toggle / Update Account Status (Active, Inactive, Suspended)
export async function updateCompanyStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Inactive', 'Suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'Active', 'Inactive', or 'Suspended'."
      });
    }

    const compRes = await query(
      `UPDATE companies SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (compRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Company account not found.' });
    }

    // Update is_active for all users of this company
    await query(
      `UPDATE users SET is_active = $1 WHERE company_id = $2`,
      [status === 'Active', id]
    );

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'STATUS_CHANGE',
      module: 'COMPANY',
      recordId: id,
      details: `Main Admin changed account status to '${status}' for ${compRes.rows[0].name}`
    });

    return res.json({
      success: true,
      message: `Account status updated to '${status}'.`,
      data: compRes.rows[0]
    });
  } catch (err) {
    console.error('Update Company Status Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update company account status.' });
  }
}

// 7. Reset Temporary Password for Client Admin
export async function resetCompanyAdminPassword(req, res) {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userRes = await query(
      `UPDATE users SET password_hash = $1 WHERE company_id = $2 AND role_id = 2 RETURNING id, email, name`,
      [passwordHash, id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client Admin user not found for this company.' });
    }

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'PASSWORD_RESET',
      module: 'COMPANY',
      recordId: id,
      details: `Main Admin reset password for Client Admin: ${userRes.rows[0].email}`
    });

    return res.json({
      success: true,
      message: `Password reset successfully for ${userRes.rows[0].email}`
    });
  } catch (err) {
    console.error('Reset Admin Password Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset client admin password.' });
  }
}

// 8. Delete Client Company & Full Data
export async function deleteCompany(req, res) {
  try {
    const { id } = req.params;
    const compRes = await query(`DELETE FROM companies WHERE id = $1 RETURNING *`, [id]);

    if (compRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Company account not found.' });
    }

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'DELETE',
      module: 'COMPANY',
      recordId: id,
      details: `Main Admin permanently deleted client account: ${compRes.rows[0].name}`
    });

    return res.json({
      success: true,
      message: `Company '${compRes.rows[0].name}' and all associated records permanently removed.`
    });
  } catch (err) {
    console.error('Delete Company Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete company account.' });
  }
}

// Helper: Seed Default Tenant Data on Company Creation
async function seedDefaultCompanyData(companyId) {
  try {
    // 1. Warehouses
    await query(
      `INSERT INTO warehouses (company_id, name, code, type, address, is_active) VALUES
       ($1, 'Main Raw Material Warehouse', 'WH-MAIN', 'Main Warehouse', 'Central Warehouse A', true),
       ($1, 'External Printing Vendor Unit', 'WH-PRINT', 'Printing Vendor', 'Printing Mill Cluster', true),
       ($1, 'Production & Stitching Floor', 'WH-PROD', 'Production Department', 'Plant Floor Level 1', true),
       ($1, 'Finished Goods Central Depot', 'WH-FG', 'Finished Goods', 'Depot Warehouse B', true),
       ($1, 'Wastage & Rejection Hold', 'WH-WASTE', 'Wastage', 'Recycle & Scrap Bay', true)`,
      [companyId]
    );

    // 2. Units
    await query(
      `INSERT INTO units (company_id, name, symbol, description) VALUES
       ($1, 'Meter', 'm', 'Linear length in meters'),
       ($1, 'Yard', 'yd', 'Fabric yardage measure'),
       ($1, 'Piece', 'pc', 'Individual garment unit'),
       ($1, 'Kilogram', 'kg', 'Bulk weight measure'),
       ($1, 'Roll', 'roll', 'Complete fabric bolt roll'),
       ($1, 'Box', 'box', 'Master carton box packaging')`,
      [companyId]
    );

    // 3. Categories
    await query(
      `INSERT INTO categories (company_id, name, code, description) VALUES
       ($1, 'Raw Fabric', 'CAT-RAW', 'Unprocessed greige & woven fabric'),
       ($1, 'Printed Fabric', 'CAT-PRINT', 'Printed lawn, cotton & linen'),
       ($1, 'Thread', 'CAT-THRD', 'Industrial sewing and embroidery spun threads'),
       ($1, 'Buttons', 'CAT-BTN', 'Garment buttons'),
       ($1, 'Zipper', 'CAT-ZIP', 'Zipper fasteners'),
       ($1, 'Accessories', 'CAT-ACC', 'Labels, tags, interlining'),
       ($1, 'Packing Material', 'CAT-PACK', 'Cartons, poly bags, tape'),
       ($1, 'Finished Products', 'CAT-FIN', 'Ready-to-wear apparel'),
       ($1, 'Other', 'CAT-OTH', 'General auxiliary supplies')`,
      [companyId]
    );

    // 4. Expense Categories
    await query(
      `INSERT INTO expense_categories (company_id, name, description) VALUES
       ($1, 'Salary', 'Payroll and wages'),
       ($1, 'Rent', 'Facility rent'),
       ($1, 'Electricity', 'Power and generator fuels'),
       ($1, 'Gas', 'Boiler gas bills'),
       ($1, 'Transport', 'Logistics and trucking freight'),
       ($1, 'Labour', 'Daily labor costs'),
       ($1, 'Maintenance', 'Machine servicing'),
       ($1, 'Printing', 'Third-party processing'),
       ($1, 'Packaging', 'Packing supplies'),
       ($1, 'Other', 'General administrative overhead')`,
      [companyId]
    );
  } catch (err) {
    console.error('Error seeding default data for company:', companyId, err);
  }
}
