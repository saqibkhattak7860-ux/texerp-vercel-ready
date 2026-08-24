-- ====================================================================
-- TEXTILE COMPANY ERP - INITIAL SEED DATA
-- ====================================================================

-- 1. Roles (Strictly 2 Roles)
INSERT INTO roles (name, description) VALUES
('Main Admin', 'Software owner and SaaS master administrator'),
('Admin', 'Client company business administrator');

-- 2. Initial Client Company (Demo Tenant)
INSERT INTO companies (name, admin_name, admin_email, phone, address, tax_number, currency, invoice_prefix, status, notes) VALUES
('Al-Karam Textile Mills', 'Zubair Textile Admin', 'admin@textile.com', '+92 300 1234567', 'Plot 45, Sector 15, Korangi Industrial Area, Karachi', 'NTN-7890123-4', 'PKR', 'AKM-', 'Active', 'Primary enterprise client company account.');

-- 3. Users (Main Admin: company_id is NULL; Client Admin: company_id is 1)
-- Default temporary/seed password for both will be hashed to 'admin123'
INSERT INTO users (company_id, name, email, password_hash, role_id, phone, is_active) VALUES
(NULL, 'SaaS Main Administrator', 'mainadmin@textile.com', '$2a$10$w81o9Z10bQ.g1lI2eZg/x.X8zE48w3E3vG4M1rQd8fP1kKq/1O1uG', 1, '+92 300 0000000', true),
(1, 'Zubair Textile Admin', 'admin@textile.com', '$2a$10$w81o9Z10bQ.g1lI2eZg/x.X8zE48w3E3vG4M1rQd8fP1kKq/1O1uG', 2, '+92 300 1234567', true);

-- 4. Default Units for Tenant 1
INSERT INTO units (company_id, name, symbol, description) VALUES
(1, 'Meter', 'm', 'Linear length measurement in meters'),
(1, 'Yard', 'yd', 'Fabric yardage standard measurement'),
(1, 'Piece', 'pc', 'Individual apparel/garment count'),
(1, 'Kilogram', 'kg', 'Weight measurement for raw bulk inputs'),
(1, 'Roll', 'roll', 'Complete fabric rolled cylinder bundle'),
(1, 'Box', 'box', 'Master carton container packing');

-- 5. Default Categories for Tenant 1
INSERT INTO categories (company_id, name, code, description) VALUES
(1, 'Raw Fabric', 'CAT-RAW', 'Unprocessed grey fabric, greige yarn and woven rolls'),
(1, 'Printed Fabric', 'CAT-PRINT', 'Digital & rotary screen printed lawn/cotton fabrics'),
(1, 'Thread', 'CAT-THRD', 'Industrial sewing and embroidery spun polyester threads'),
(1, 'Buttons', 'CAT-BTN', 'Plastic, metal, and shell apparel buttons'),
(1, 'Zipper', 'CAT-ZIP', 'Metal and nylon coil zipper fasteners'),
(1, 'Accessories', 'CAT-ACC', 'Neck labels, tags, interlinings, elastic cords'),
(1, 'Packing Material', 'CAT-PACK', 'Poly bags, silica gel, tissue wraps, carton boxes'),
(1, 'Finished Products', 'CAT-FIN', 'Ready-to-wear shirts, suits, trousers, linen sets'),
(1, 'Other', 'CAT-OTH', 'Miscellaneous plant and auxiliary supplies');

-- Default garment categories for Tenant 1
INSERT INTO garment_categories (company_id, name) VALUES
(1, 'Men Garments'),
(1, 'Women Pret'),
(1, 'Kids Wear'),
(1, 'Home Textiles'),
(1, 'Luxury Collections');

-- 6. Default Warehouses for Tenant 1
INSERT INTO warehouses (company_id, name, code, type, address, is_active) VALUES
(1, 'Main Raw Material Warehouse', 'WH-MAIN', 'Main Warehouse', 'Bay A1, Central Storage Facility', true),
(1, 'External Printing Vendor Unit', 'WH-PRINT', 'Printing Vendor', 'Vendor Dyeing & Printing Cluster', true),
(1, 'Production & Stitching Floor', 'WH-PROD', 'Production Department', 'Plant Floor Level 2', true),
(1, 'Finished Goods Central Depot', 'WH-FG', 'Finished Goods', 'Logistics Terminal Warehouse B', true),
(1, 'Wastage & Rejection Hold', 'WH-WASTE', 'Wastage', 'Inspection & Recycling Bay', true);

-- 7. Default Expense Categories for Tenant 1
INSERT INTO expense_categories (company_id, name, description) VALUES
(1, 'Salary', 'Monthly management and employee payroll'),
(1, 'Rent', 'Factory, warehouse and showroom lease expenses'),
(1, 'Electricity', 'Industrial electricity tariffs and generator fuel'),
(1, 'Gas', 'Boiler and steam processing gas supply bills'),
(1, 'Transport', 'Logistics freight, trucking and dispatch charges'),
(1, 'Labour', 'Daily-wage cutting, stitching and packing labor'),
(1, 'Maintenance', 'Loom, stitching and embroidery machine maintenance'),
(1, 'Printing', 'Third-party printing & finishing processing costs'),
(1, 'Packaging', 'Master corrugated cartons, tapes and poly supplies'),
(1, 'Other', 'General office and administrative overheads');
