import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Users,
  Building2,
  Calendar,
  Filter,
  ArrowRight,
  PieChart as PieChartIcon
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function ProfitLoss() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('statement'); // 'statement', 'products', 'customers'
  const { showToast } = useNotification();

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = '/reports/pnl';
      if (startDate && endDate) {
        url += `?start_date=${startDate}&end_date=${endDate}`;
      }
      const res = await api.get(url);
      if (res.data?.success) {
        setReport(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load P&L statement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const summary = report?.summary?.summary || {};
  const revenue = report?.summary?.revenue || {};
  const cogs = report?.summary?.cogs || {};
  const expenses = report?.summary?.operationalExpenses || {};
  const productProfit = report?.productProfitability || [];
  const customerProfit = report?.customerProfitability || [];

  return (
    <div className="space-y-8">
      {/* Header & Date Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Real-Time Profit & Loss Analytics</h2>
          <p className="text-xs text-slate-400">
            Formula: Revenue - (Raw Materials + Printing + Stitching + Direct Labour + Operating Expenses) = Net Profit
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-white focus:outline-none"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-white focus:outline-none"
          />
          <button
            onClick={fetchReport}
            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-colors shadow-md"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Primary KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Invoiced Revenue"
          value={revenue.totalRevenue || 0}
          prefix="Rs. "
          subtitle={`Collected: Rs. ${(revenue.totalCollected || 0).toLocaleString()}`}
          icon={DollarSign}
          color="emerald"
          loading={loading}
        />
        <StatCard
          title="Cost of Goods (COGS)"
          value={cogs.totalCOGS || 0}
          prefix="Rs. "
          subtitle="Production + Materials + Printing"
          icon={TrendingDown}
          color="rose"
          loading={loading}
        />
        <StatCard
          title="Operating Expenses"
          value={expenses.total || 0}
          prefix="Rs. "
          subtitle="Utilities, Salaries & Overheads"
          icon={Building2}
          color="amber"
          loading={loading}
        />
        <StatCard
          title="Net Profit / Loss"
          value={summary.netProfit || 0}
          prefix="Rs. "
          subtitle={`Net Margin: ${summary.profitMargin || 0}%`}
          icon={TrendingUp}
          color={summary.isProfitable ? 'emerald' : 'rose'}
          loading={loading}
        />
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('statement')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'statement'
              ? 'bg-brand-600 text-white shadow-md'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          Comprehensive P&L Statement
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'products'
              ? 'bg-brand-600 text-white shadow-md'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          Product-Wise Profit Margins
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'customers'
              ? 'bg-brand-600 text-white shadow-md'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          Customer-Wise Contribution
        </button>
      </div>

      {/* Tab 1: Comprehensive P&L Statement */}
      {activeTab === 'statement' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-6 text-sm font-sans">
          {/* Revenue Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-extrabold text-white text-base uppercase tracking-wider text-emerald-400">
                1. Total Sales & Operating Revenue
              </h4>
              <span className="font-mono font-bold text-white text-base">
                Rs. {parseFloat(revenue.totalRevenue || 0).toLocaleString()}
              </span>
            </div>
            <div className="pl-4 space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Invoiced Customer Sales:</span>
                <span className="font-mono">Rs. {parseFloat(revenue.totalRevenue || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Cash / Bank Realized:</span>
                <span className="font-mono text-emerald-400">Rs. {parseFloat(revenue.totalCollected || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Outstanding Customer Receivables:</span>
                <span className="font-mono text-cyan-400">Rs. {parseFloat(revenue.totalReceivables || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* COGS Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-extrabold text-white text-base uppercase tracking-wider text-rose-400">
                2. Cost of Goods Sold (COGS)
              </h4>
              <span className="font-mono font-bold text-rose-400 text-base">
                (Rs. {parseFloat(cogs.totalCOGS || 0).toLocaleString()})
              </span>
            </div>
            <div className="pl-4 space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Raw Materials Issued into Production:</span>
                <span className="font-mono">Rs. {parseFloat(cogs.materialCost || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Fabric Printing Charges:</span>
                <span className="font-mono">Rs. {parseFloat(cogs.printingCharges || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Printing Logistics & Transport:</span>
                <span className="font-mono">Rs. {parseFloat(cogs.printingTransport || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Direct Production Labour & Stitching:</span>
                <span className="font-mono">Rs. {parseFloat(cogs.directLabourCost || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Machine Wear & Power Consumption:</span>
                <span className="font-mono">Rs. {parseFloat(cogs.machineCost || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between font-bold text-base">
            <span className="text-white">Gross Operating Profit:</span>
            <span className="font-mono text-emerald-400">
              Rs. {parseFloat(summary.grossProfit || 0).toLocaleString()}
            </span>
          </div>

          {/* Operating Expenses Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-extrabold text-white text-base uppercase tracking-wider text-amber-400">
                3. Company Operating & Administrative Expenses
              </h4>
              <span className="font-mono font-bold text-amber-400 text-base">
                (Rs. {parseFloat(expenses.total || 0).toLocaleString()})
              </span>
            </div>
            <div className="pl-4 space-y-1.5 text-xs text-slate-300">
              {expenses.breakdown?.map((exp) => (
                <div key={exp.category} className="flex justify-between">
                  <span>{exp.category}:</span>
                  <span className="font-mono">Rs. {parseFloat(exp.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Net Profit Banner */}
          <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            summary.isProfitable
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider block">Final Enterprise Net Result</span>
              <h3 className="text-3xl font-black text-white font-mono mt-1">
                Rs. {parseFloat(summary.netProfit || 0).toLocaleString()}
              </h3>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold block">Net Profit Margin:</span>
              <span className="text-2xl font-black text-white font-mono">{summary.profitMargin || 0}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Product Profitability Table */}
      {activeTab === 'products' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850 text-slate-400 uppercase font-bold">
              <tr>
                <th className="p-3.5">Product SKU & Name</th>
                <th className="p-3.5 text-right">Production Cost</th>
                <th className="p-3.5 text-right">Selling Price</th>
                <th className="p-3.5 text-right">Unit Profit</th>
                <th className="p-3.5 text-right">Margin %</th>
                <th className="p-3.5 text-center">Units Sold</th>
                <th className="p-3.5 text-right">Net Product Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {productProfit.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-bold text-white">
                    {p.name}
                    <span className="block text-[10px] text-brand-400 font-mono">{p.product_code}</span>
                  </td>
                  <td className="p-3.5 text-right font-mono">Rs. {parseFloat(p.production_cost).toLocaleString()}</td>
                  <td className="p-3.5 text-right font-mono">Rs. {parseFloat(p.selling_price).toLocaleString()}</td>
                  <td className="p-3.5 text-right font-mono font-semibold text-cyan-400">Rs. {parseFloat(p.unit_profit).toLocaleString()}</td>
                  <td className="p-3.5 text-right font-mono font-bold text-emerald-400">{p.margin_percentage}%</td>
                  <td className="p-3.5 text-center font-mono font-semibold">{parseFloat(p.units_sold).toLocaleString()}</td>
                  <td className="p-3.5 text-right font-mono font-black text-emerald-400 text-sm">
                    Rs. {parseFloat(p.net_product_profit).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Customer Profitability Table */}
      {activeTab === 'customers' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850 text-slate-400 uppercase font-bold">
              <tr>
                <th className="p-3.5">Customer & Company</th>
                <th className="p-3.5 text-center">Orders Invoiced</th>
                <th className="p-3.5 text-right">Total Revenue Contribution</th>
                <th className="p-3.5 text-right">Collected Amount</th>
                <th className="p-3.5 text-right">Pending Receivables</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {customerProfit.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-bold text-white">
                    {c.name}
                    <span className="block text-[10px] text-slate-400">{c.company_name} ({c.code})</span>
                  </td>
                  <td className="p-3.5 text-center font-mono font-semibold">{c.total_orders_invoiced}</td>
                  <td className="p-3.5 text-right font-mono font-bold text-white text-sm">
                    Rs. {parseFloat(c.total_revenue).toLocaleString()}
                  </td>
                  <td className="p-3.5 text-right font-mono text-emerald-400 font-semibold">
                    Rs. {parseFloat(c.received_amount || 0).toLocaleString()}
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-rose-400">
                    Rs. {parseFloat(c.pending_amount || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
