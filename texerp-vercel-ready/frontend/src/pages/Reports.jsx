import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import { FileSpreadsheet, Layers, ShoppingCart, Truck, DollarSign, Printer, Download } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function Reports() {
  const [activeReport, setActiveReport] = useState('inventory'); // 'inventory', 'purchases', 'sales'
  const [inventoryData, setInventoryData] = useState(null);
  const [purchaseData, setPurchaseData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useNotification();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [invRes, purRes, salRes] = await Promise.all([
        api.get('/reports/inventory'),
        api.get('/reports/purchases'),
        api.get('/reports/sales')
      ]);
      if (invRes.data?.success) setInventoryData(invRes.data.data);
      if (purRes.data?.success) setPurchaseData(purRes.data.data);
      if (salRes.data?.success) setSalesData(salRes.data.data);
    } catch (err) {
      showToast('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const inventoryColumns = [
    {
      header: 'Item',
      accessor: 'name',
      render: (row) => (
        <div>
          <span className="font-bold text-white block">{row.name}</span>
          <span className="text-[10px] text-brand-400 font-mono">{row.item_code}</span>
        </div>
      )
    },
    {
      header: 'Category',
      accessor: 'category_name',
      render: (row) => <Badge variant={row.category_name} />
    },
    {
      header: 'Current Stock',
      accessor: 'current_stock',
      render: (row) => (
        <span className={`font-mono font-bold ${row.is_low_stock ? 'text-amber-400' : 'text-white'}`}>
          {parseFloat(row.current_stock).toLocaleString()} {row.unit}
        </span>
      )
    },
    {
      header: 'Purchase Rate',
      accessor: 'purchase_price',
      render: (row) => <span className="font-mono">Rs. {parseFloat(row.purchase_price).toLocaleString()}</span>
    },
    {
      header: 'Total Asset Valuation',
      accessor: 'valuation',
      render: (row) => (
        <span className="font-mono font-bold text-emerald-400">
          Rs. {parseFloat(row.valuation || 0).toLocaleString()}
        </span>
      )
    }
  ];

  const purchaseSupplierColumns = [
    {
      header: 'Supplier Mill',
      accessor: 'name',
      render: (row) => (
        <div>
          <span className="font-bold text-white block">{row.supplier_name}</span>
          <span className="text-xs text-slate-400">{row.company_name}</span>
        </div>
      )
    },
    {
      header: 'Orders Placed',
      accessor: 'total_orders',
      render: (row) => <span className="font-mono text-center font-bold text-white">{row.total_orders}</span>
    },
    {
      header: 'Total Purchases (Rs.)',
      accessor: 'total_purchased',
      render: (row) => (
        <span className="font-mono font-bold text-white">
          Rs. {parseFloat(row.total_purchased).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Paid Amount',
      accessor: 'total_paid',
      render: (row) => (
        <span className="font-mono text-emerald-400 font-semibold">
          Rs. {parseFloat(row.total_paid).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Remaining Payable Due',
      accessor: 'remaining_balance',
      render: (row) => (
        <span className="font-mono font-bold text-rose-400">
          Rs. {parseFloat(row.remaining_balance).toLocaleString()}
        </span>
      )
    }
  ];

  const salesCustomerColumns = [
    {
      header: 'Customer',
      accessor: 'customer_name',
      render: (row) => (
        <div>
          <span className="font-bold text-white block">{row.customer_name}</span>
          <span className="text-xs text-slate-400">{row.company_name}</span>
        </div>
      )
    },
    {
      header: 'Total Invoices',
      accessor: 'total_invoices',
      render: (row) => <span className="font-mono font-bold text-white">{row.total_invoices}</span>
    },
    {
      header: 'Total Sales Revenue',
      accessor: 'total_sales',
      render: (row) => (
        <span className="font-mono font-bold text-emerald-400">
          Rs. {parseFloat(row.total_sales).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Collected Payment',
      accessor: 'total_collected',
      render: (row) => (
        <span className="font-mono font-semibold text-slate-200">
          Rs. {parseFloat(row.total_collected || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Pending Balance Receivables',
      accessor: 'pending_amount',
      render: (row) => (
        <span className="font-mono font-bold text-rose-400">
          Rs. {parseFloat(row.pending_amount || 0).toLocaleString()}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Consolidated Reports Center</h2>
          <p className="text-xs text-slate-400">Comprehensive enterprise reporting for inventory valuation, purchase volume, and sales analytics.</p>
        </div>

        {/* Report Tabs */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => setActiveReport('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeReport === 'inventory'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Inventory Valuation
          </button>
          <button
            onClick={() => setActiveReport('purchases')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeReport === 'purchases'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Procurement by Supplier
          </button>
          <button
            onClick={() => setActiveReport('sales')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeReport === 'sales'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sales by Customer
          </button>
        </div>
      </div>

      {/* View Data Table */}
      {activeReport === 'inventory' && (
        <DataTable
          columns={inventoryColumns}
          data={inventoryData?.items || []}
          loading={loading}
          searchPlaceholder="Search inventory report..."
        />
      )}

      {activeReport === 'purchases' && (
        <DataTable
          columns={purchaseSupplierColumns}
          data={purchaseData?.bySupplier || []}
          loading={loading}
          searchPlaceholder="Search purchase supplier reports..."
        />
      )}

      {activeReport === 'sales' && (
        <DataTable
          columns={salesCustomerColumns}
          data={salesData?.byCustomer || []}
          loading={loading}
          searchPlaceholder="Search customer sales reports..."
        />
      )}
    </div>
  );
}
