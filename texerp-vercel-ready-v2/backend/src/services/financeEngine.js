import { query } from '../db/index.js';

export class FinanceEngine {
  /**
   * Calculates comprehensive Profit & Loss summary for a given tenant company and date range.
   */
  static async calculateProfitAndLoss({ companyId, startDate, endDate } = {}) {
    let whereClauses = [];
    let params = [];

    if (companyId) {
      params.push(companyId);
      whereClauses.push(`company_id = $${params.length}`);
    }

    let dateParamIndex = params.length;
    let dateFilterSales = companyId ? `WHERE company_id = $1` : `WHERE 1=1`;
    let dateFilterExp = companyId ? `WHERE e.company_id = $1` : `WHERE 1=1`;
    let dateFilterProd = companyId ? `WHERE po.company_id = $1` : `WHERE 1=1`;
    let dateFilterPrint = companyId ? `WHERE company_id = $1` : `WHERE 1=1`;

    if (startDate && endDate) {
      params.push(startDate, endDate);
      const sIndex = dateParamIndex + 1;
      const eIndex = dateParamIndex + 2;
      dateFilterSales += ` AND invoice_date >= $${sIndex} AND invoice_date <= $${eIndex}`;
      dateFilterExp += ` AND expense_date >= $${sIndex} AND expense_date <= $${eIndex}`;
      dateFilterProd += ` AND start_date >= $${sIndex} AND start_date <= $${eIndex}`;
      dateFilterPrint += ` AND receive_date >= $${sIndex} AND receive_date <= $${eIndex}`;
    }

    // 1. Total Sales Revenue
    const revenueRes = await query(
      `SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(due_amount), 0) as total_receivables,
        COUNT(id) as total_invoices
       FROM invoices ${dateFilterSales}`,
      params
    );
    const totalRevenue = parseFloat(revenueRes.rows[0]?.total_revenue || 0);
    const totalCollected = parseFloat(revenueRes.rows[0]?.total_collected || 0);
    const totalReceivables = parseFloat(revenueRes.rows[0]?.total_receivables || 0);

    // 2. Production & Material Costs (COGS)
    const prodCostRes = await query(
      `SELECT 
        COALESCE(SUM(pc.material_cost), 0) as material_cost,
        COALESCE(SUM(pc.labour_cost), 0) as direct_labour_cost,
        COALESCE(SUM(pc.machine_cost), 0) as machine_cost,
        COALESCE(SUM(pc.other_cost), 0) as other_production_cost,
        COALESCE(SUM(pc.total_production_cost), 0) as total_production_cost
       FROM production_costs pc
       JOIN production_orders po ON pc.production_order_id = po.id
       ${dateFilterProd}`,
      params
    );
    const materialCost = parseFloat(prodCostRes.rows[0]?.material_cost || 0);
    const directLabourCost = parseFloat(prodCostRes.rows[0]?.direct_labour_cost || 0);
    const machineCost = parseFloat(prodCostRes.rows[0]?.machine_cost || 0);
    const otherProdCost = parseFloat(prodCostRes.rows[0]?.other_production_cost || 0);
    const totalProductionCost = parseFloat(prodCostRes.rows[0]?.total_production_cost || 0);

    // 3. Printing Charges & Processing
    const printCostRes = await query(
      `SELECT 
        COALESCE(SUM(printing_charges), 0) as printing_charges,
        COALESCE(SUM(transport_charges), 0) as printing_transport
       FROM printing_receipts ${dateFilterPrint}`,
      params
    );
    const printingCharges = parseFloat(printCostRes.rows[0]?.printing_charges || 0);
    const printingTransport = parseFloat(printCostRes.rows[0]?.printing_transport || 0);

    // 4. Company Operational Expenses (Categorized)
    const expRes = await query(
      `SELECT 
        ec.name as category_name,
        COALESCE(SUM(e.amount), 0) as total_amount
       FROM expenses e
       JOIN expense_categories ec ON e.category_id = ec.id
       ${dateFilterExp}
       GROUP BY ec.name
       ORDER BY total_amount DESC`,
      params
    );
    
    let operationalExpenses = 0;
    const expenseBreakdown = expRes.rows.map(row => {
      const amt = parseFloat(row.total_amount);
      operationalExpenses += amt;
      return {
        category: row.category_name,
        amount: amt
      };
    });

    // 5. Total Cost of Goods Sold (COGS) & Net Calculations
    const totalCOGS = totalProductionCost + printingCharges + printingTransport;
    const grossProfit = totalRevenue - totalCOGS;
    const totalOutflow = totalCOGS + operationalExpenses;
    const netProfit = totalRevenue - totalOutflow;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      revenue: {
        totalRevenue,
        totalCollected,
        totalReceivables,
        totalInvoices: parseInt(revenueRes.rows[0]?.total_invoices || 0, 10)
      },
      cogs: {
        materialCost,
        directLabourCost,
        machineCost,
        otherProdCost,
        totalProductionCost,
        printingCharges,
        printingTransport,
        totalCOGS
      },
      operationalExpenses: {
        total: operationalExpenses,
        breakdown: expenseBreakdown
      },
      summary: {
        grossProfit,
        netProfit,
        isProfitable: netProfit >= 0,
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        totalOutflow
      }
    };
  }

  /**
   * Product-wise profitability analysis.
   */
  static async getProductProfitability({ companyId } = {}) {
    const params = companyId ? [companyId] : [];
    const whereSql = companyId ? `WHERE fp.company_id = $1` : ``;

    const res = await query(
      `SELECT 
        fp.id,
        fp.product_code,
        fp.name,
        fp.production_cost,
        fp.selling_price,
        (fp.selling_price - fp.production_cost) as unit_profit,
        COALESCE(SUM(ii.quantity), 0) as units_sold,
        COALESCE(SUM(ii.total_amount), 0) as total_sales_revenue,
        COALESCE(SUM(ii.quantity * fp.production_cost), 0) as total_cogs,
        COALESCE(SUM(ii.total_amount - (ii.quantity * fp.production_cost)), 0) as net_product_profit
       FROM finished_products fp
       LEFT JOIN invoice_items ii ON fp.id = ii.product_id
       ${whereSql}
       GROUP BY fp.id, fp.product_code, fp.name, fp.production_cost, fp.selling_price
       ORDER BY net_product_profit DESC`,
      params
    );

    return res.rows.map(p => {
      const sp = parseFloat(p.selling_price || 0);
      const pc = parseFloat(p.production_cost || 0);
      const margin = sp > 0 ? ((sp - pc) / sp) * 100 : 0;
      return {
        ...p,
        margin_percentage: parseFloat(margin.toFixed(2))
      };
    });
  }

  /**
   * Customer-wise profitability & revenue analysis.
   */
  static async getCustomerProfitability({ companyId } = {}) {
    const params = companyId ? [companyId] : [];
    const whereSql = companyId ? `WHERE c.company_id = $1` : ``;

    const res = await query(
      `SELECT 
        c.id,
        c.code,
        c.name,
        c.company_name,
        c.total_receivable,
        c.received_amount,
        c.pending_amount,
        COUNT(i.id) as total_orders_invoiced,
        COALESCE(SUM(i.total_amount), 0) as total_revenue
       FROM customers c
       LEFT JOIN invoices i ON c.id = i.customer_id
       ${whereSql}
       GROUP BY c.id, c.code, c.name, c.company_name, c.total_receivable, c.received_amount, c.pending_amount
       ORDER BY total_revenue DESC`,
      params
    );
    return res.rows;
  }
}
