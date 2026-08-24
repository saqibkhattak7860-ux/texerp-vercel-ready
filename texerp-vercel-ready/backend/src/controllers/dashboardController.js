import { query } from '../db/index.js';
import { FinanceEngine } from '../services/financeEngine.js';

function getMonthRange(year, month) {
  const lastDay = new Date(year, month, 0).getDate();
  const mStr = month < 10 ? `0${month}` : `${month}`;
  return [`${year}-${mStr}-01`, `${year}-${mStr}-${lastDay}`];
}

export async function getDashboardMetrics(req, res) {
  try {
    const companyId = req.user.company_id;
    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const [startOfMonth, endOfMonth] = getMonthRange(currentYear, currentMonth);

    // 1. Sales metrics
    const salesTotalRes = await query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE company_id = $1`, [companyId]);
    const totalSales = parseFloat(salesTotalRes.rows[0]?.total || 0);

    const todaySalesRes = await query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE company_id = $1 AND invoice_date = $2`, [companyId, today]);
    const todaySales = parseFloat(todaySalesRes.rows[0]?.total || 0);

    const monthlySalesRes = await query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE company_id = $1 AND invoice_date >= $2 AND invoice_date <= $3`, [companyId, startOfMonth, endOfMonth]);
    const monthlySales = parseFloat(monthlySalesRes.rows[0]?.total || 0);

    // 2. Purchases metrics
    const purchaseTotalRes = await query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE company_id = $1`, [companyId]);
    const totalPurchase = parseFloat(purchaseTotalRes.rows[0]?.total || 0);

    // 3. Stock metrics
    const stockQtyRes = await query(`SELECT COALESCE(SUM(current_stock), 0) as total_qty, COALESCE(SUM(current_stock * purchase_price), 0) as total_val FROM items WHERE company_id = $1`, [companyId]);
    const totalStockQuantity = parseFloat(stockQtyRes.rows[0]?.total_qty || 0);
    const availableStockValue = parseFloat(stockQtyRes.rows[0]?.total_val || 0);

    // 4. Fabric at printer
    const printerPendingRes = await query(`SELECT COALESCE(SUM(pending_quantity), 0) as total FROM printing_job_items WHERE company_id = $1 AND pending_quantity > 0`, [companyId]);
    const fabricAtPrinter = parseFloat(printerPendingRes.rows[0]?.total || 0);

    // 5. Low stock items count
    const lowStockRes = await query(`SELECT COUNT(*) as count FROM items WHERE company_id = $1 AND current_stock <= min_stock_level`, [companyId]);
    const lowStockCount = parseInt(lowStockRes.rows[0]?.count || 0, 10);

    // 6. Receivables & Payables
    const custPendingRes = await query(`SELECT COALESCE(SUM(pending_amount), 0) as total FROM customers WHERE company_id = $1`, [companyId]);
    const pendingCustomerPayments = parseFloat(custPendingRes.rows[0]?.total || 0);

    const suppPendingRes = await query(`SELECT COALESCE(SUM(remaining_balance), 0) as total FROM suppliers WHERE company_id = $1`, [companyId]);
    const pendingSupplierPayments = parseFloat(suppPendingRes.rows[0]?.total || 0);

    // 7. Monthly Expenses
    const monthlyExpRes = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE company_id = $1 AND expense_date >= $2 AND expense_date <= $3`, [companyId, startOfMonth, endOfMonth]);
    const monthlyExpenses = parseFloat(monthlyExpRes.rows[0]?.total || 0);

    // 8. Production Cost (Total)
    const prodCostRes = await query(`SELECT COALESCE(SUM(total_production_cost), 0) as total FROM production_costs WHERE company_id = $1`, [companyId]);
    const productionCost = parseFloat(prodCostRes.rows[0]?.total || 0);

    // 9. Current Month Profit/Loss
    const pnl = await FinanceEngine.calculateProfitAndLoss({ companyId });

    // 10. Sales vs Purchase monthly comparison chart data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const monthlyChartData = [];
    for (let i = 1; i <= 12; i++) {
      const [mStart, mEnd] = getMonthRange(currentYear, i);
      
      const sRes = await query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE company_id = $1 AND invoice_date >= $2 AND invoice_date <= $3`, [companyId, mStart, mEnd]);
      const pRes = await query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE company_id = $1 AND purchase_date >= $2 AND purchase_date <= $3`, [companyId, mStart, mEnd]);
      const eRes = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE company_id = $1 AND expense_date >= $2 AND expense_date <= $3`, [companyId, mStart, mEnd]);

      monthlyChartData.push({
        name: months[i - 1],
        sales: parseFloat(sRes.rows[0]?.total || 0),
        purchases: parseFloat(pRes.rows[0]?.total || 0),
        expenses: parseFloat(eRes.rows[0]?.total || 0)
      });
    }

    // 11. Top Customers
    const topCustRes = await query(
      `SELECT c.id, c.name, c.company_name, COALESCE(SUM(i.total_amount), 0) as total_spent
       FROM customers c
       LEFT JOIN invoices i ON c.id = i.customer_id
       WHERE c.company_id = $1
       GROUP BY c.id, c.name, c.company_name
       ORDER BY total_spent DESC
       LIMIT 5`,
      [companyId]
    );

    // 12. Top Selling Products
    const topProdRes = await query(
      `SELECT fp.id, fp.name, fp.product_code, COALESCE(SUM(ii.quantity), 0) as units_sold, COALESCE(SUM(ii.total_amount), 0) as revenue
       FROM finished_products fp
       LEFT JOIN invoice_items ii ON fp.id = ii.product_id
       WHERE fp.company_id = $1
       GROUP BY fp.id, fp.name, fp.product_code
       ORDER BY revenue DESC
       LIMIT 5`,
      [companyId]
    );

    // 13. Low Stock Items List
    const lowStockItemsRes = await query(
      `SELECT i.id, i.item_code, i.name, i.current_stock, i.min_stock_level, u.symbol as unit
       FROM items i
       LEFT JOIN units u ON i.unit_id = u.id
       WHERE i.company_id = $1 AND i.current_stock <= i.min_stock_level
       ORDER BY i.current_stock ASC
       LIMIT 6`,
      [companyId]
    );

    // 14. Recent Activities
    const recentActivitiesRes = await query(
      `SELECT id, user_name, action, module, reference_number, details, created_at
       FROM audit_logs
       WHERE company_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [companyId]
    );

    return res.json({
      success: true,
      data: {
        kpis: {
          totalSales,
          todaySales,
          monthlySales,
          totalPurchase,
          availableStockValue,
          totalStockQuantity,
          fabricAtPrinter,
          lowStockCount,
          pendingCustomerPayments,
          pendingSupplierPayments,
          monthlyExpenses,
          productionCost,
          netProfit: pnl.summary.netProfit,
          profitMargin: pnl.summary.profitMargin,
          isProfitable: pnl.summary.isProfitable
        },
        charts: {
          monthlyTrend: monthlyChartData,
          expenseBreakdown: pnl.operationalExpenses.breakdown,
          topCustomers: topCustRes.rows,
          topSellingProducts: topProdRes.rows
        },
        lowStockItems: lowStockItemsRes.rows,
        recentActivities: recentActivitiesRes.rows
      }
    });
  } catch (err) {
    console.error('Dashboard Metrics Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve dashboard metrics.' });
  }
}
