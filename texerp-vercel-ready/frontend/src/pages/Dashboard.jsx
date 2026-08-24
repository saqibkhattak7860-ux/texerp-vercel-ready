import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Boxes,
  Printer,
  AlertTriangle,
  CreditCard,
  Building2,
  Factory,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await api.get('/dashboard/metrics');
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const kpis = data?.kpis || {};
  const charts = data?.charts || {};
  const lowStock = data?.lowStockItems || [];
  const recentActivities = data?.recentActivities || [];

  const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-brand-900/40 via-slate-900/80 to-slate-900/40 p-6 rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Textile Operations Command</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Enterprise Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-location stock, fabric printing lifecycle, production costing, and financial analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-medium text-slate-300 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-brand-400" />
            <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* 1. Primary Financial & Stock KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Sales"
          value={kpis.totalSales}
          prefix="Rs. "
          subtitle={`Today: Rs. ${(kpis.todaySales || 0).toLocaleString()}`}
          icon={DollarSign}
          color="emerald"
          loading={loading}
        />
        <StatCard
          title="Total Purchases"
          value={kpis.totalPurchase}
          prefix="Rs. "
          subtitle="Total procurement value"
          icon={ShoppingCart}
          color="blue"
          loading={loading}
        />
        <StatCard
          title="Available Stock Value"
          value={kpis.availableStockValue}
          prefix="Rs. "
          subtitle={`${(kpis.totalStockQuantity || 0).toLocaleString()} Units in Hand`}
          icon={Boxes}
          color="purple"
          loading={loading}
        />
        <StatCard
          title="Net Profit / Loss"
          value={kpis.netProfit}
          prefix="Rs. "
          subtitle={`Margin: ${kpis.profitMargin || 0}%`}
          icon={TrendingUp}
          color={kpis.isProfitable ? 'emerald' : 'rose'}
          loading={loading}
        />
      </div>

      {/* 2. Secondary Operational KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fabric at Printer</p>
          <h4 className="text-xl font-bold text-white mt-1">
            {(kpis.fabricAtPrinter || 0).toLocaleString()} <span className="text-xs text-slate-400 font-normal">m</span>
          </h4>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Low Stock Items</p>
          <h4 className={`text-xl font-bold mt-1 ${kpis.lowStockCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
            {kpis.lowStockCount || 0}
          </h4>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pending Receivables</p>
          <h4 className="text-lg font-bold text-cyan-400 mt-1 truncate">
            Rs. {(kpis.pendingCustomerPayments || 0).toLocaleString()}
          </h4>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pending Payables</p>
          <h4 className="text-lg font-bold text-rose-400 mt-1 truncate">
            Rs. {(kpis.pendingSupplierPayments || 0).toLocaleString()}
          </h4>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Monthly Expenses</p>
          <h4 className="text-lg font-bold text-slate-200 mt-1 truncate">
            Rs. {(kpis.monthlyExpenses || 0).toLocaleString()}
          </h4>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Production Cost</p>
          <h4 className="text-lg font-bold text-indigo-400 mt-1 truncate">
            Rs. {(kpis.productionCost || 0).toLocaleString()}
          </h4>
        </div>
      </div>

      {/* 3. Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales vs Purchases Area Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Monthly Sales, Purchases & Expenses</h3>
              <p className="text-xs text-slate-400">Annual financial trend overview</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlyTrend || []}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" textAnchor="end" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `Rs.${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(value) => [`Rs. ${Number(value).toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorPurchases)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown Donut */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Expense Distribution</h3>
            <p className="text-xs text-slate-400">Categorized operational outflow</p>
          </div>

          <div className="h-60 w-full my-auto">
            {charts.expenseBreakdown && charts.expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.expenseBreakdown}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {charts.expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(v) => `Rs. ${Number(v).toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No expense entries recorded yet.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800">
            {charts.expenseBreakdown?.slice(0, 4).map((item, idx) => (
              <div key={item.category} className="flex items-center gap-1.5 truncate">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="text-slate-400 truncate">{item.category}:</span>
                <span className="font-semibold text-slate-200">Rs. {Math.round(item.amount / 1000)}k</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Top Selling Products & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur-md shadow-xl">
          <h3 className="text-base font-bold text-white mb-4">Top Performing Products</h3>
          <div className="space-y-3">
            {charts.topSellingProducts && charts.topSellingProducts.length > 0 ? (
              charts.topSellingProducts.map((p, idx) => (
                <div key={p.id || idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-850/60 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">{p.name}</h5>
                      <span className="text-[10px] text-slate-400 font-mono">{p.product_code}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-400">Rs. {parseFloat(p.revenue).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">{parseFloat(p.units_sold).toLocaleString()} Sold</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No sales recorded yet.</p>
            )}
          </div>
        </div>

        {/* Low Stock Warning List */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Low Stock Alerts</span>
            </h3>
            <span className="text-xs text-slate-400">{lowStock.length} items critical</span>
          </div>

          <div className="space-y-3">
            {lowStock.length > 0 ? (
              lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-850/60 border border-amber-500/20">
                  <div>
                    <h5 className="text-xs font-bold text-white">{item.name}</h5>
                    <span className="text-[10px] text-slate-400 font-mono">{item.item_code}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {parseFloat(item.current_stock).toLocaleString()} {item.unit}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Min: {item.min_stock_level} {item.unit}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">All inventory levels are optimal.</p>
            )}
          </div>
        </div>
      </div>

      {/* 5. Recent System Activities Feed */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur-md shadow-xl">
        <h3 className="text-base font-bold text-white mb-4">Recent Audit & Operations Stream</h3>
        <div className="divide-y divide-slate-800/60">
          {recentActivities.length > 0 ? (
            recentActivities.map((act) => (
              <div key={act.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {act.module}
                  </span>
                  <div>
                    <span className="font-semibold text-white">{act.user_name}</span>
                    <span className="text-slate-400 mx-1.5">—</span>
                    <span className="text-slate-300">{act.details}</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">No recent activity logs.</p>
          )}
        </div>
      </div>
    </div>
  );
}
