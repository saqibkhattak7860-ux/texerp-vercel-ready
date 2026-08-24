import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';

// Controllers
import * as authController from '../controllers/authController.js';
import * as mainAdminController from '../controllers/mainAdminController.js';
import * as companyController from '../controllers/companyController.js';
import * as dashboardController from '../controllers/dashboardController.js';
import * as categoryController from '../controllers/categoryController.js';
import * as unitController from '../controllers/unitController.js';
import * as warehouseController from '../controllers/warehouseController.js';
import * as itemController from '../controllers/itemController.js';
import * as supplierController from '../controllers/supplierController.js';
import * as customerController from '../controllers/customerController.js';
import * as purchaseController from '../controllers/purchaseController.js';
import * as stockController from '../controllers/stockController.js';
import * as printingController from '../controllers/printingController.js';
import * as productionController from '../controllers/productionController.js';
import * as salesController from '../controllers/salesController.js';
import * as invoiceController from '../controllers/invoiceController.js';
import * as paymentController from '../controllers/paymentController.js';
import * as expenseController from '../controllers/expenseController.js';
import * as reportController from '../controllers/reportController.js';
import * as userController from '../controllers/userController.js';
import * as notificationController from '../controllers/notificationController.js';
import * as auditController from '../controllers/auditController.js';

const router = express.Router();

// ==========================================
// 1. AUTHENTICATION & PROFILE
// ==========================================
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);
router.get('/auth/me', authenticateToken, authController.getCurrentUser);
router.get('/auth/roles', authenticateToken, authController.getRoles);

// ==========================================
// 2. MAIN ADMIN PORTAL (ROLE 1: MAIN ADMIN)
// ==========================================
router.get('/main-admin/dashboard', authenticateToken, requireRoles('Main Admin'), mainAdminController.getMainAdminDashboard);
router.get('/main-admin/pending-users', authenticateToken, requireRoles('Main Admin'), mainAdminController.getPendingUsers);
router.put('/main-admin/users/:id/approve', authenticateToken, requireRoles('Main Admin'), userController.approveUser);
router.put('/main-admin/users/:id/reject', authenticateToken, requireRoles('Main Admin'), userController.rejectUser);
router.get('/main-admin/companies', authenticateToken, requireRoles('Main Admin'), mainAdminController.getCompanies);
router.get('/main-admin/companies/:id', authenticateToken, requireRoles('Main Admin'), mainAdminController.getCompanyById);
router.post('/main-admin/companies', authenticateToken, requireRoles('Main Admin'), mainAdminController.createCompany);
router.put('/main-admin/companies/:id', authenticateToken, requireRoles('Main Admin'), mainAdminController.updateCompany);
router.put('/main-admin/companies/:id/status', authenticateToken, requireRoles('Main Admin'), mainAdminController.updateCompanyStatus);
router.post('/main-admin/companies/:id/reset-password', authenticateToken, requireRoles('Main Admin'), mainAdminController.resetCompanyAdminPassword);
router.delete('/main-admin/companies/:id', authenticateToken, requireRoles('Main Admin'), mainAdminController.deleteCompany);

// ==========================================
// 3. COMPANY SETTINGS (ROLE 2: ADMIN)
// ==========================================
router.get('/company/settings', authenticateToken, companyController.getCompanySettings);
router.put('/company/settings', authenticateToken, companyController.updateCompanySettings);

// ==========================================
// 4. CLIENT ADMIN DASHBOARD
// ==========================================
router.get('/dashboard/metrics', authenticateToken, dashboardController.getDashboardMetrics);

// ==========================================
// 5. MASTER DATA: CATEGORIES, UNITS, WAREHOUSES
// ==========================================
router.get('/categories', authenticateToken, categoryController.getCategories);
router.post('/categories', authenticateToken, categoryController.createCategory);
router.put('/categories/:id', authenticateToken, categoryController.updateCategory);
router.delete('/categories/:id', authenticateToken, categoryController.deleteCategory);

router.get('/units', authenticateToken, unitController.getUnits);
router.post('/units', authenticateToken, unitController.createUnit);

router.get('/warehouses', authenticateToken, warehouseController.getWarehouses);
router.get('/warehouses/:id/stock', authenticateToken, warehouseController.getWarehouseStock);
router.post('/warehouses', authenticateToken, warehouseController.createWarehouse);

// ==========================================
// 6. ITEMS CATALOG & STOCK
// ==========================================
router.get('/items', authenticateToken, itemController.getItems);
router.get('/items/:id', authenticateToken, itemController.getItemById);
router.post('/items', authenticateToken, itemController.createItem);
router.put('/items/:id', authenticateToken, itemController.updateItem);
router.delete('/items/:id', authenticateToken, itemController.deleteItem);

// ==========================================
// 7. SUPPLIERS & CUSTOMERS
// ==========================================
router.get('/suppliers', authenticateToken, supplierController.getSuppliers);
router.get('/suppliers/:id', authenticateToken, supplierController.getSupplierById);
router.post('/suppliers', authenticateToken, supplierController.createSupplier);
router.put('/suppliers/:id', authenticateToken, supplierController.updateSupplier);
router.delete('/suppliers/:id', authenticateToken, supplierController.deleteSupplier);

router.get('/customers', authenticateToken, customerController.getCustomers);
router.get('/customers/:id', authenticateToken, customerController.getCustomerById);
router.post('/customers', authenticateToken, customerController.createCustomer);
router.put('/customers/:id', authenticateToken, customerController.updateCustomer);
router.delete('/customers/:id', authenticateToken, customerController.deleteCustomer);

// ==========================================
// 8. PURCHASES & INTAKE
// ==========================================
router.get('/purchases', authenticateToken, purchaseController.getPurchases);
router.get('/purchases/:id', authenticateToken, purchaseController.getPurchaseById);
router.post('/purchases', authenticateToken, purchaseController.createPurchase);

// ==========================================
// 9. INVENTORY MOVEMENTS, TRANSFERS & VALUATION
// ==========================================
router.get('/stock/movements', authenticateToken, stockController.getStockMovements);
router.post('/stock/transfer', authenticateToken, stockController.transferStock);
router.post('/stock/adjust', authenticateToken, stockController.adjustStock);
router.get('/stock/valuation', authenticateToken, stockController.getStockValuationSummary);

// ==========================================
// 10. PRINTING MANAGEMENT
// ==========================================
router.get('/printing/vendors', authenticateToken, printingController.getPrintingVendors);
router.post('/printing/vendors', authenticateToken, printingController.createPrintingVendor);
router.get('/printing/jobs', authenticateToken, printingController.getPrintingJobs);
router.get('/printing/jobs/:id', authenticateToken, printingController.getPrintingJobById);
router.post('/printing/jobs', authenticateToken, printingController.createPrintingJob);
router.post('/printing/receive', authenticateToken, printingController.receivePrintedFabric);
router.get('/printing/reports', authenticateToken, printingController.getPrinterReports);

// ==========================================
// 11. PRODUCTION & FINISHED GOODS
// ==========================================
router.get('/garment-categories', authenticateToken, productionController.getGarmentCategories);
router.post('/garment-categories', authenticateToken, productionController.createGarmentCategory);
router.put('/garment-categories/:id', authenticateToken, productionController.updateGarmentCategory);
router.delete('/garment-categories/:id', authenticateToken, productionController.deleteGarmentCategory);
router.get('/finished-products', authenticateToken, productionController.getFinishedProducts);
router.post('/finished-products', authenticateToken, productionController.createFinishedProduct);
router.delete('/finished-products/:id', authenticateToken, productionController.deleteFinishedProduct);

router.get('/production/orders', authenticateToken, productionController.getProductionOrders);
router.get('/production/orders/:id', authenticateToken, productionController.getProductionOrderById);
router.post('/production/orders', authenticateToken, productionController.createProductionOrder);
router.put('/production/orders/:id/complete', authenticateToken, productionController.completeProductionOrder);

// ==========================================
// 12. SALES ORDERS & DELIVERIES
// ==========================================
router.get('/sales/orders', authenticateToken, salesController.getSalesOrders);
router.get('/sales/orders/:id', authenticateToken, salesController.getSalesOrderById);
router.post('/sales/orders', authenticateToken, salesController.createSalesOrder);
router.put('/sales/orders/:id/status', authenticateToken, salesController.updateSalesOrderStatus);
router.post('/deliveries', authenticateToken, salesController.createDelivery);

// ==========================================
// 13. INVOICES
// ==========================================
router.get('/invoices', authenticateToken, invoiceController.getInvoices);
router.get('/invoices/:id', authenticateToken, invoiceController.getInvoiceById);
router.post('/invoices', authenticateToken, invoiceController.createInvoice);

// ==========================================
// 14. PAYMENTS (RECEIPTS & DISBURSEMENTS)
// ==========================================
router.get('/payments', authenticateToken, paymentController.getPayments);
router.post('/payments', authenticateToken, paymentController.createPayment);

// ==========================================
// 15. EXPENSES & CATEGORIES
// ==========================================
router.get('/expenses/categories', authenticateToken, expenseController.getExpenseCategories);
router.post('/expenses/categories', authenticateToken, expenseController.createExpenseCategory);
router.get('/expenses', authenticateToken, expenseController.getExpenses);
router.post('/expenses', authenticateToken, expenseController.createExpense);

router.get('/users', authenticateToken, userController.getUsers);
router.post('/users', authenticateToken, userController.createUser);
router.put('/users/:id', authenticateToken, userController.updateUser);
router.post('/users/:id/reset-password', authenticateToken, userController.resetUserPassword);

// ==========================================
// 16. COMPREHENSIVE REPORTS & P&L
// ==========================================
router.get('/reports/pnl', authenticateToken, reportController.getProfitAndLossReport);
router.get('/reports/inventory', authenticateToken, reportController.getInventoryReport);
router.get('/reports/purchases', authenticateToken, reportController.getPurchaseReport);
router.get('/reports/sales', authenticateToken, reportController.getSalesReport);

// ==========================================
// 17. NOTIFICATIONS & AUDIT LOGS
// ==========================================
router.get('/notifications', authenticateToken, notificationController.getNotifications);
router.put('/notifications/:id/read', authenticateToken, notificationController.markAsRead);
router.put('/notifications/read-all', authenticateToken, notificationController.markAllAsRead);

router.get('/audit-logs', authenticateToken, auditController.getAuditLogs);

export default router;
