import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import {
  Boxes,
  ArrowRightLeft,
  Sliders,
  DollarSign,
  Building2,
  TrendingUp,
  History,
  AlertCircle
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function Inventory() {
  const [warehouses, setWarehouses] = useState([]);
  const [movements, setMovements] = useState([]);
  const [items, setItems] = useState([]);
  const [valuation, setValuation] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useNotification();

  const [transferData, setTransferData] = useState({
    item_id: '',
    from_warehouse_id: '',
    to_warehouse_id: '',
    quantity: '',
    notes: ''
  });

  const [adjustData, setAdjustData] = useState({
    item_id: '',
    warehouse_id: '',
    type: 'ADD', // 'ADD' or 'DEDUCT'
    quantity: '',
    reason: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [whRes, movRes, itmRes, valRes] = await Promise.all([
        api.get('/warehouses'),
        api.get('/stock/movements'),
        api.get('/items'),
        api.get('/stock/valuation')
      ]);
      if (whRes.data?.success) setWarehouses(whRes.data.data);
      if (movRes.data?.success) setMovements(movRes.data.data);
      if (itmRes.data?.success) setItems(itmRes.data.data);
      if (valRes.data?.success) setValuation(valRes.data.data);
    } catch (err) {
      showToast('Failed to load inventory data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTransfer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/stock/transfer', transferData);
      showToast('Stock transferred successfully');
      setIsTransferOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/stock/adjust', adjustData);
      showToast('Stock adjustment applied successfully');
      setIsAdjustOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const movementColumns = [
    {
      header: 'Date & Time',
      accessor: 'created_at',
      render: (row) => (
        <div>
          <span className="font-semibold text-white block">{new Date(row.created_at).toLocaleDateString()}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )
    },
    {
      header: 'Item',
      accessor: 'item_name',
      render: (row) => (
        <div>
          <span className="font-bold text-white block">{row.item_name}</span>
          <span className="text-[10px] text-brand-400 font-mono">{row.item_code}</span>
        </div>
      )
    },
    {
      header: 'Movement Type',
      accessor: 'movement_type',
      render: (row) => <Badge variant={row.movement_type} />
    },
    {
      header: 'Quantity',
      accessor: 'quantity',
      render: (row) => (
        <span className="font-mono font-bold text-slate-100">
          {parseFloat(row.quantity).toLocaleString()} {row.unit_symbol}
        </span>
      )
    },
    {
      header: 'Route (From → To)',
      accessor: 'from_warehouse_name',
      render: (row) => (
        <span className="text-xs text-slate-300">
          {row.from_warehouse_name || 'External / Supplier'} <span className="text-brand-400 font-bold">→</span>{' '}
          {row.to_warehouse_name || 'Customer / Consumed'}
        </span>
      )
    },
    {
      header: 'Reference',
      accessor: 'reference_number',
      render: (row) => <span className="font-mono text-xs text-slate-400">{row.reference_number || '—'}</span>
    },
    {
      header: 'Logged By',
      accessor: 'user_name',
      render: (row) => <span className="text-xs text-slate-400">{row.user_name || 'System'}</span>
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Advanced Multi-Location Stock Management</h2>
          <p className="text-xs text-slate-400">Track immutable double-entry stock ledger, internal transfers, and physical adjustments.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setTransferData({
                item_id: items[0]?.id || '',
                from_warehouse_id: warehouses[0]?.id || '',
                to_warehouse_id: warehouses[1]?.id || '',
                quantity: '',
                notes: ''
              });
              setIsTransferOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Internal Stock Transfer</span>
          </button>

          <button
            onClick={() => {
              setAdjustData({
                item_id: items[0]?.id || '',
                warehouse_id: warehouses[0]?.id || '',
                type: 'ADD',
                quantity: '',
                reason: ''
              });
              setIsAdjustOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            <Sliders className="w-4 h-4" />
            <span>Stock Adjustment</span>
          </button>
        </div>
      </div>

      {/* Warehouse Locations Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {warehouses.map((wh) => (
          <div key={wh.id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-brand-500/20 text-brand-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{wh.name}</h4>
                  <p className="text-[10px] text-slate-500 font-mono">{wh.code} • {wh.type}</p>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Items Stored: <b className="text-white">{wh.total_items_stored || 0}</b></span>
              <span className="text-slate-400">Total Volume: <b className="text-brand-400 font-mono">{parseFloat(wh.total_stock_volume || 0).toLocaleString()}</b></span>
            </div>
          </div>
        ))}
      </div>

      {/* Stock Valuation Summary Banner */}
      {valuation && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Total Enterprise Inventory Value</span>
              <h3 className="text-2xl font-black text-white font-mono mt-0.5">
                Rs. {parseFloat(valuation.grandTotal?.grand_total_valuation || 0).toLocaleString()}
              </h3>
            </div>
          </div>

          <div className="text-right text-xs text-slate-400">
            <span>Across all active warehouses & items: </span>
            <b className="text-white font-mono">{parseFloat(valuation.grandTotal?.grand_total_quantity || 0).toLocaleString()} units</b>
          </div>
        </div>
      )}

      {/* Stock Movement Ledger Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-brand-400" />
            <span>Immutable Stock Movement Ledger</span>
          </h3>
        </div>

        <DataTable
          columns={movementColumns}
          data={movements}
          loading={loading}
          searchPlaceholder="Search movement ledger by item, code or ref..."
        />
      </div>

      {/* Transfer Stock Modal */}
      <Modal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Internal Stock Transfer"
        subtitle="Move items between warehouse floors with immediate double-entry recording."
      >
        <form onSubmit={handleTransfer} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Item to Transfer *</label>
            <select
              required
              value={transferData.item_id}
              onChange={(e) => setTransferData({ ...transferData, item_id: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
            >
              <option value="">Select Item</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.item_code}) — Available: {it.current_stock}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Source Warehouse (From) *</label>
              <select
                required
                value={transferData.from_warehouse_id}
                onChange={(e) => setTransferData({ ...transferData, from_warehouse_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select Source Location</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Destination Warehouse (To) *</label>
              <select
                required
                value={transferData.to_warehouse_id}
                onChange={(e) => setTransferData({ ...transferData, to_warehouse_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select Destination Location</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Transfer Quantity *</label>
            <input
              type="number"
              required
              step="0.01"
              value={transferData.quantity}
              onChange={(e) => setTransferData({ ...transferData, quantity: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-500 focus:outline-none"
              placeholder="e.g. 500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Transfer Notes / Reason</label>
            <textarea
              rows="2"
              value={transferData.notes}
              onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              placeholder="Transfer authorization or details..."
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsTransferOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-600/30"
            >
              {submitting ? 'Transferring...' : 'Execute Transfer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={isAdjustOpen}
        onClose={() => setIsAdjustOpen(false)}
        title="Physical Inventory Adjustment"
        subtitle="Reconcile physical floor counts by positive adjustment or write-off."
      >
        <form onSubmit={handleAdjust} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Item to Adjust *</label>
            <select
              required
              value={adjustData.item_id}
              onChange={(e) => setAdjustData({ ...adjustData, item_id: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
            >
              <option value="">Select Item</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.item_code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Location Warehouse *</label>
              <select
                required
                value={adjustData.warehouse_id}
                onChange={(e) => setAdjustData({ ...adjustData, warehouse_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select Warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Adjustment Type *</label>
              <select
                required
                value={adjustData.type}
                onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="ADD">Positive Adjustment (+ Increase Stock)</option>
                <option value="DEDUCT">Write-off (- Deduct Stock)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Adjustment Quantity *</label>
            <input
              type="number"
              required
              step="0.01"
              value={adjustData.quantity}
              onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Reason / Justification *</label>
            <input
              type="text"
              required
              value={adjustData.reason}
              onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              placeholder="e.g. Physical inventory cycle count reconciliation"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdjustOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-600/30"
            >
              {submitting ? 'Applying...' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
