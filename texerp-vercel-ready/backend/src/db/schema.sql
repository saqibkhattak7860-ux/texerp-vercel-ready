-- ====================================================================
-- TEXTILE COMPANY ERP - MULTI-TENANT POSTGRESQL DATABASE SCHEMA
-- ====================================================================

-- 1. Companies / Client Accounts (Tenant Catalog)
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    admin_name VARCHAR(150) NOT NULL,
    admin_email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    logo_url TEXT,
    tax_number VARCHAR(100),
    currency VARCHAR(20) DEFAULT 'PKR',
    invoice_prefix VARCHAR(20) DEFAULT 'INV',
    status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Inactive', 'Suspended'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Roles (Exactly 2 Roles: Main Admin and Admin)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users Table (Main Admin: company_id is NULL; Admin: company_id is NOT NULL)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT REFERENCES roles(id) ON DELETE RESTRICT,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    approval_status VARCHAR(30) DEFAULT 'Approved',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Warehouses & Stock Locations
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Warehouse', -- 'Main Warehouse', 'Printing Vendor', 'Production Department', 'Finished Goods', 'Wastage', 'Delivery'
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Categories & Units
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS garment_categories (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, name)
);

CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    description TEXT
);

-- 6. Items Master Catalog
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    item_code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    category_id INT REFERENCES categories(id),
    unit_id INT REFERENCES units(id),
    min_stock_level NUMERIC(12,2) DEFAULT 0,
    purchase_price NUMERIC(12,2) DEFAULT 0,
    selling_price NUMERIC(12,2) DEFAULT 0,
    current_stock NUMERIC(12,2) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Item Warehouse Stocks Cache
CREATE TABLE IF NOT EXISTS item_warehouse_stocks (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    item_id INT REFERENCES items(id) ON DELETE CASCADE,
    warehouse_id INT REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity NUMERIC(12,2) DEFAULT 0,
    UNIQUE(item_id, warehouse_id)
);

-- 7. Suppliers & Customers
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    company_name VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(150),
    address TEXT,
    opening_balance NUMERIC(14,2) DEFAULT 0,
    total_payable NUMERIC(14,2) DEFAULT 0,
    paid_amount NUMERIC(14,2) DEFAULT 0,
    remaining_balance NUMERIC(14,2) DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    company_name VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(150),
    address TEXT,
    opening_balance NUMERIC(14,2) DEFAULT 0,
    total_receivable NUMERIC(14,2) DEFAULT 0,
    received_amount NUMERIC(14,2) DEFAULT 0,
    pending_amount NUMERIC(14,2) DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Purchases & Purchase Items
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    supplier_id INT REFERENCES suppliers(id),
    warehouse_id INT REFERENCES warehouses(id),
    purchase_date DATE NOT NULL,
    subtotal NUMERIC(14,2) DEFAULT 0,
    discount NUMERIC(14,2) DEFAULT 0,
    tax NUMERIC(14,2) DEFAULT 0,
    total_amount NUMERIC(14,2) DEFAULT 0,
    paid_amount NUMERIC(14,2) DEFAULT 0,
    due_amount NUMERIC(14,2) DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'Unpaid', -- 'Paid', 'Partial', 'Unpaid'
    notes TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    purchase_id INT REFERENCES purchases(id) ON DELETE CASCADE,
    item_id INT REFERENCES items(id),
    quantity NUMERIC(12,2) NOT NULL,
    rate NUMERIC(12,2) NOT NULL,
    discount NUMERIC(12,2) DEFAULT 0,
    tax NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(14,2) NOT NULL
);

-- 9. Stock Movements (Ledger)
CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    item_id INT REFERENCES items(id) ON DELETE RESTRICT,
    movement_type VARCHAR(50) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    from_warehouse_id INT REFERENCES warehouses(id),
    to_warehouse_id INT REFERENCES warehouses(id),
    reference_type VARCHAR(50), -- 'Purchase', 'Print Sent', 'Print Receive', 'Production Issue', 'Finished Goods', 'Sales Delivery', 'Adjustment', 'Transfer'
    reference_id INT,
    reference_number VARCHAR(100),
    unit_cost NUMERIC(12,2) DEFAULT 0,
    notes TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Printing Vendors & Jobs
CREATE TABLE IF NOT EXISTS printing_vendors (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    company_name VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(150),
    address TEXT,
    rate_per_unit NUMERIC(12,2) DEFAULT 0,
    total_sent NUMERIC(14,2) DEFAULT 0,
    total_received NUMERIC(14,2) DEFAULT 0,
    pending_fabric NUMERIC(14,2) DEFAULT 0,
    total_bills NUMERIC(14,2) DEFAULT 0,
    paid_amount NUMERIC(14,2) DEFAULT 0,
    pending_bills NUMERIC(14,2) DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS printing_jobs (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    job_number VARCHAR(100) NOT NULL,
    challan_number VARCHAR(100),
    vendor_id INT REFERENCES printing_vendors(id),
    from_warehouse_id INT REFERENCES warehouses(id),
    sent_date DATE NOT NULL,
    expected_return_date DATE,
    estimated_printing_cost NUMERIC(14,2) DEFAULT 0,
    transport_cost NUMERIC(14,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Sent', -- 'Draft', 'Sent', 'Partial Received', 'Completed', 'Cancelled'
    notes TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS printing_job_items (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    job_id INT REFERENCES printing_jobs(id) ON DELETE CASCADE,
    item_id INT REFERENCES items(id),
    design_name VARCHAR(150) NOT NULL,
    sent_quantity NUMERIC(12,2) NOT NULL,
    received_quantity NUMERIC(12,2) DEFAULT 0,
    wastage_quantity NUMERIC(12,2) DEFAULT 0,
    damage_quantity NUMERIC(12,2) DEFAULT 0,
    pending_quantity NUMERIC(12,2) NOT NULL,
    rate_per_unit NUMERIC(12,2) NOT NULL,
    estimated_cost NUMERIC(14,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS printing_receipts (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    receipt_number VARCHAR(100) NOT NULL,
    job_id INT REFERENCES printing_jobs(id),
    vendor_id INT REFERENCES printing_vendors(id),
    to_warehouse_id INT REFERENCES warehouses(id),
    receive_date DATE NOT NULL,
    printing_charges NUMERIC(14,2) DEFAULT 0,
    transport_charges NUMERIC(14,2) DEFAULT 0,
    total_charges NUMERIC(14,2) DEFAULT 0,
    notes TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS printing_receipt_items (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    receipt_id INT REFERENCES printing_receipts(id) ON DELETE CASCADE,
    job_item_id INT REFERENCES printing_job_items(id),
    raw_item_id INT REFERENCES items(id),
    resulting_item_id INT REFERENCES items(id),
    received_quantity NUMERIC(12,2) NOT NULL,
    wastage_quantity NUMERIC(12,2) DEFAULT 0,
    damage_quantity NUMERIC(12,2) DEFAULT 0,
    printing_rate NUMERIC(12,2) DEFAULT 0,
    printing_cost NUMERIC(14,2) DEFAULT 0
);

-- 11. Finished Products Master Catalog
CREATE TABLE IF NOT EXISTS finished_products (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) DEFAULT 'Finished Garments',
    unit_id INT REFERENCES units(id),
    quantity_available NUMERIC(12,2) DEFAULT 0,
    production_cost NUMERIC(12,2) DEFAULT 0,
    selling_price NUMERIC(12,2) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. Production Orders & BOM
CREATE TABLE IF NOT EXISTS production_orders (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    production_number VARCHAR(100) NOT NULL,
    finished_product_id INT REFERENCES finished_products(id),
    target_warehouse_id INT REFERENCES warehouses(id),
    planned_quantity NUMERIC(12,2) NOT NULL,
    actual_quantity NUMERIC(12,2) DEFAULT 0,
    start_date DATE NOT NULL,
    completion_date DATE,
    status VARCHAR(50) DEFAULT 'Planned', -- 'Planned', 'In Progress', 'Completed', 'Cancelled'
    notes TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS production_materials (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    production_order_id INT REFERENCES production_orders(id) ON DELETE CASCADE,
    item_id INT REFERENCES items(id),
    planned_quantity NUMERIC(12,2) NOT NULL,
    issued_quantity NUMERIC(12,2) DEFAULT 0,
    unit_cost NUMERIC(12,2) DEFAULT 0,
    total_cost NUMERIC(14,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS production_costs (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    production_order_id INT REFERENCES production_orders(id) ON DELETE CASCADE,
    material_cost NUMERIC(14,2) DEFAULT 0,
    labour_cost NUMERIC(14,2) DEFAULT 0,
    machine_cost NUMERIC(14,2) DEFAULT 0,
    other_cost NUMERIC(14,2) DEFAULT 0,
    total_production_cost NUMERIC(14,2) DEFAULT 0,
    cost_per_unit NUMERIC(12,2) DEFAULT 0
);

-- 13. Sales Orders & Deliveries
CREATE TABLE IF NOT EXISTS sales_orders (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,
    customer_id INT REFERENCES customers(id),
    order_date DATE NOT NULL,
    delivery_date DATE,
    subtotal NUMERIC(14,2) DEFAULT 0,
    discount NUMERIC(14,2) DEFAULT 0,
    tax NUMERIC(14,2) DEFAULT 0,
    total_amount NUMERIC(14,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Confirmed', -- 'Draft', 'Confirmed', 'In Production', 'Ready', 'Partially Delivered', 'Delivered', 'Completed', 'Cancelled'
    notes TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_order_items (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sales_order_id INT REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES finished_products(id),
    quantity NUMERIC(12,2) NOT NULL,
    delivered_quantity NUMERIC(12,2) DEFAULT 0,
    rate NUMERIC(12,2) NOT NULL,
    discount NUMERIC(12,2) DEFAULT 0,
    tax NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(14,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS deliveries (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    delivery_number VARCHAR(100) NOT NULL,
    sales_order_id INT REFERENCES sales_orders(id),
    customer_id INT REFERENCES customers(id),
    delivery_date DATE NOT NULL,
    from_warehouse_id INT REFERENCES warehouses(id),
    transport_details TEXT,
    status VARCHAR(50) DEFAULT 'Delivered',
    notes TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_items (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    delivery_id INT REFERENCES deliveries(id) ON DELETE CASCADE,
    sales_order_item_id INT REFERENCES sales_order_items(id),
    product_id INT REFERENCES finished_products(id),
    quantity NUMERIC(12,2) NOT NULL
);

-- 14. Invoices & Invoice Items
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    sales_order_id INT REFERENCES sales_orders(id),
    customer_id INT REFERENCES customers(id),
    invoice_date DATE NOT NULL,
    due_date DATE,
    subtotal NUMERIC(14,2) DEFAULT 0,
    discount NUMERIC(14,2) DEFAULT 0,
    tax NUMERIC(14,2) DEFAULT 0,
    total_amount NUMERIC(14,2) DEFAULT 0,
    paid_amount NUMERIC(14,2) DEFAULT 0,
    due_amount NUMERIC(14,2) DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'Unpaid', -- 'Paid', 'Partial', 'Unpaid'
    notes TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
    product_id INT REFERENCES finished_products(id),
    quantity NUMERIC(12,2) NOT NULL,
    rate NUMERIC(12,2) NOT NULL,
    discount NUMERIC(12,2) DEFAULT 0,
    tax NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(14,2) NOT NULL
);

-- 15. Payments (Customer & Supplier)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    payment_number VARCHAR(100) NOT NULL,
    payment_type VARCHAR(50) NOT NULL, -- 'Received' (from customer), 'Paid' (to supplier), 'Printing Paid'
    party_type VARCHAR(50) NOT NULL, -- 'Customer', 'Supplier', 'Printing Vendor'
    customer_id INT REFERENCES customers(id),
    supplier_id INT REFERENCES suppliers(id),
    printing_vendor_id INT REFERENCES printing_vendors(id),
    invoice_id INT REFERENCES invoices(id),
    purchase_id INT REFERENCES purchases(id),
    amount NUMERIC(14,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'Cash', 'Bank Transfer', 'Cheque', 'Online Payment', 'Other'
    reference_number VARCHAR(100),
    notes TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 16. Expenses & Categories
CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    expense_number VARCHAR(100) NOT NULL,
    category_id INT REFERENCES expense_categories(id),
    description TEXT NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Cash',
    reference_number VARCHAR(100),
    notes TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 17. Notifications & System Alerts
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'low_stock', 'pending_customer_payment', 'pending_supplier_payment', 'printing_overdue', 'sales_delivery_due', 'system'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'danger', 'success'
    is_read BOOLEAN DEFAULT FALSE,
    reference_type VARCHAR(50),
    reference_id INT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 18. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id),
    user_name VARCHAR(150),
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'STOCK_MOVE'
    module VARCHAR(50) NOT NULL, -- 'PURCHASE', 'STOCK', 'PRINTING', 'PRODUCTION', 'SALES', 'INVOICE', 'PAYMENT', 'EXPENSE', 'USER', 'COMPANY'
    record_id INT,
    reference_number VARCHAR(100),
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
