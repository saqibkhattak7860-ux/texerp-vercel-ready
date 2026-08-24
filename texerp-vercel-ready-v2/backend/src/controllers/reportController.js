import { query } from '../db/index.js';
import { FinanceEngine } from '../services/financeEngine.js';

// --- FINANCIAL P&L REPORTS ---
export async function getProfitAndLossReport(req, res) {
  try {
    const { start_date, end_date } = req.query;
    const pnl = await FinanceEngine.calculateProfitAndLoss({ startDate: start_date, endDate: end_date });
    const productProfitability = await FinanceEngine.getProductProfitability();
    const customerProfitability = await FinanceEngine.getCustomerProfitability();

    return res.json({
      success: true,
      data: {
        summary: pnl,
        productProfitability,
        customerProfitability
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to generate P&L report.' });
  }
}

// --- INVENTORY REPORTS ---
export async function getInventoryReport(req, res) {
  try {
    // Current stock & valuation
    const stockRes = await query(
      `SELECT 
        i.id,
        i.item_code,
        i.name,
        c.name as category_name,
        u.symbol as unit,
        i.current_stock,
        i.min_stock_level,
        i.purchase_price,
        (i.current_stock * i.purchase_price) as valuation,
        CASE WHEN i.current_stock <= i.min_stock_level THEN true ELSE false END as is_low_stock
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       LEFT JOIN units u ON i.unit_id = u.id
       ORDER BY i.current_stock ASC`
    );

    // Location-wise breakdown
    const locationRes = await query(
      `SELECT 
        w.name as warehouse_name,
        w.type as warehouse_type,
        COUNT(DISTINCT iws.item_id) as total_items,
        COALESCE(SUM(iws.quantity), 0) as total_units,
        COALESCE(SUM(iws.quantity * i.purchase_price), 0) as total_value
       FROM warehouses w
       LEFT JOIN item_warehouse_stocks iws ON w.id = iws.warehouse_id
       LEFT JOIN items i ON iws.item_id = i.id
       GROUP BY w.id, w.name, w.type
       ORDER BY w.id ASC`
    );

    // Wastage summary
    const wasteRes = await query(
      `SELECT 
        i.name as item_name,
        i.item_code,
        u.symbol as unit,
        COALESCE(SUM(sm.quantity), 0) as total_wasted_quantity,
        COALESCE(SUM(sm.quantity * sm.unit_cost), 0) as total_wasted_cost
       FROM stock_movements sm
       JOIN items i ON sm.item_id = i.id
       LEFT JOIN units u ON i.unit_id = u.id
       WHERE sm.movement_type = 'Wastage' OR sm.to_warehouse_id = 5
       GROUP BY i.id, i.name, i.item_code, u.symbol`
    );

    return res.json({
      success: true,
      data: {
        items: stockRes.rows,
        locations: locationRes.rows,
        wastage: wasteRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to generate inventory report.' });
  }
}

// --- PURCHASE REPORTS ---
export async function getPurchaseReport(req, res) {
  try {
    const supplierPurchasesRes = await query(
      `SELECT 
        s.id,
        s.name as supplier_name,
        s.company_name,
        COUNT(p.id) as total_orders,
        COALESCE(SUM(p.total_amount), 0) as total_purchased,
        COALESCE(SUM(p.paid_amount), 0) as total_paid,
        s.remaining_balance
       FROM suppliers s
       LEFT JOIN purchases p ON s.id = p.supplier_id
       GROUP BY s.id, s.name, s.company_name, s.remaining_balance
       ORDER BY total_purchased DESC`
    );

    const itemPurchasesRes = await query(
      `SELECT 
        i.id,
        i.name as item_name,
        i.item_code,
        c.name as category_name,
        u.symbol as unit,
        COALESCE(SUM(pi.quantity), 0) as total_quantity_purchased,
        COALESCE(SUM(pi.total_amount), 0) as total_amount_spent,
        CASE WHEN SUM(pi.quantity) > 0 THEN (SUM(pi.total_amount) / SUM(pi.quantity)) ELSE 0 END as avg_purchase_rate
       FROM items i
       LEFT JOIN purchase_items pi ON i.id = pi.item_id
       LEFT JOIN categories c ON i.category_id = c.id
       LEFT JOIN units u ON i.unit_id = u.id
       WHERE pi.id IS NOT NULL
       GROUP BY i.id, i.name, i.item_code, c.name, u.symbol
       ORDER BY total_amount_spent DESC`
    );

    return res.json({
      success: true,
      data: {
        bySupplier: supplierPurchasesRes.rows,
        byItem: itemPurchasesRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to generate purchase report.' });
  }
}

// --- SALES REPORTS ---
export async function getSalesReport(req, res) {
  try {
    const customerSalesRes = await query(
      `SELECT 
        c.id,
        c.name as customer_name,
        c.company_name,
        COUNT(inv.id) as total_invoices,
        COALESCE(SUM(inv.total_amount), 0) as total_sales,
        COALESCE(SUM(inv.paid_amount), 0) as total_collected,
        c.pending_amount
       FROM customers c
       LEFT JOIN invoices inv ON c.id = inv.customer_id
       GROUP BY c.id, c.name, c.company_name, c.pending_amount
       ORDER BY total_sales DESC`
    );

    const productSalesRes = await query(
      `SELECT 
        fp.id,
        fp.name as product_name,
        fp.product_code,
        fp.category,
        COALESCE(SUM(ii.quantity), 0) as total_units_sold,
        COALESCE(SUM(ii.total_amount), 0) as total_revenue
       FROM finished_products fp
       LEFT JOIN invoice_items ii ON fp.id = ii.product_id
       GROUP BY fp.id, fp.name, fp.product_code, fp.category
       ORDER BY total_revenue DESC`
    );

    return res.json({
      success: true,
      data: {
        byCustomer: customerSalesRes.rows,
        byProduct: productSalesRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to generate sales report.' });
  }
}
