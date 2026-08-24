import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { Plus, Factory, CheckCircle2, Eye, Trash2, DollarSign, Layers } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function Production() {
  const [orders, setOrders] = useState([]);
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useNotification();

  // Create Order Form State
  const [formData, setFormData] = useState({
    finished_product_id: '',
    planned_quantity: '500',
    start_date: new Date().toISOString().split('T')[0],
    completion_date: '',
    target_warehouse_id: '4', // Finished goods warehouse
    notes: '',
    labour_cost: '25000',
    machine_cost: '10000',
    other_cost: '5000',
    materials: []
  });

  // Completion Form State
  const [completeData, setCompleteData] = useState({
    actual_quantity: '',
    completion_date: new Date().toISOString().split('T')[0],
    final_notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordRes, fpRes, itmRes] = await Promise.all([
        api.get('/production/orders'),
        api.get('/finished-products'),
        api.get('/items')
      ]);
      if (ordRes.data?.success) setOrders(ordRes.data.data);
      if (fpRes.data?.success) setFinishedProducts(fpRes.data.data);
      if (itmRes.data?.success) setRawItems(itmRes.data.data);
    } catch (err) {
      showToast('Failed to load production orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    const defaultFp = finishedProducts[0];
    setFormData({
      finished_product_id: defaultFp?.id || '',
      planned_quantity: '500',
      start_date: new Date().toISOString().split('T')[0],
      completion_date: '',
      target_warehouse_id: '4',
      notes: '',
      labour_cost: '25000',
      machine_cost: '10000',
      other_cost: '5000',
      materials: [
        {
          item_id: rawItems[0]?.id || '',
          planned_quantity: '1000',
          unit_cost: rawItems[0]?.purchase_price || '120'
        }
      ]
    });
    setIsModalOpen(true);
  };

  const handleMaterialChange = (index, field, value) => {
    const updated = [...formData.materials];
    updated[index][field] = value;
    if (field === 'item_id') {
      const selected = rawItems.find((it) => it.id === parseInt(value, 10));
      if (selected) {
        updated[index].unit_cost = selected.purchase_price;
      }
    }
    setFormData({ ...formData, materials: updated });
  };

  const addMaterialRow = () => {
    setFormData({
      ...formData,
      materials: [
        ...formData.materials,
        {
          item_id: rawItems[0]?.id || '',
          planned_quantity: '500',
          unit_cost: rawItems[0]?.purchase_price || '100'
        }
      ]
    });
  };

  const removeMaterialRow = (index) => {
    if (formData.materials.length === 1) return;
    setFormData({
      ...formData,
      materials: formData.materials.filter((_, i) => i !== index)
    });
  };

  // Cost calculations
  const totalMaterialCost = formData.materials.reduce(
    (sum, m) => sum + (parseFloat(m.planned_quantity || 0) * parseFloat(m.unit_cost || 0)),
    0
  );
  const totalCost =
    totalMaterialCost +
    parseFloat(formData.labour_cost || 0) +
    parseFloat(formData.machine_cost || 0) +
    parseFloat(formData.other_cost || 0);
  const plannedQty = parseFloat(formData.planned_quantity || 1);
  const unitCostEst = plannedQty > 0 ? totalCost / plannedQty : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/production/orders', formData);
      showToast('Production order initiated & materials issued from warehouse');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCompleteModal = (order) => {
    setSelectedOrder(order);
    setCompleteData({
      actual_quantity: order.planned_quantity,
      completion_date: new Date().toISOString().split('T')[0],
      final_notes: 'Stitching and packing inspection passed.'
    });
    setIsCompleteModalOpen(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/production/orders/${selectedOrder.id}/complete`, completeData);
      showToast('Production completed! Finished products added to stock.');
      setIsCompleteModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = async (order) => {
    try {
      const res = await api.get(`/production/orders/${order.id}`);
      if (res.data?.success) {
        setSelectedOrder(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (err) {
      showToast('Failed to load production details', 'error');
    }
  };

  const columns = [
    {
      header: 'Production #',
      accessor: 'production_number',
      render: (row) => <span className="font-mono font-bold text-brand-400">{row.production_number}</span>
    },
    {
      header: 'Target Product',
      accessor: 'finished_product_name',
      render: (row) => (
        <div>
          <span className="font-bold text-white block">{row.finished_product_name}</span>
          <span className="text-xs text-slate-400 font-mono">{row.finished_product_code}</span>
        </div>
      )
    },
    {
      header: 'Planned / Yield',
      accessor: 'planned_quantity',
      render: (row) => (
        <span className="font-mono text-xs">
          <b>{parseFloat(row.planned_quantity).toLocaleString()}</b>
          {row.status === 'Completed' && (
            <span className="text-emerald-400 font-bold ml-1.5">({parseFloat(row.actual_quantity).toLocaleString()} Done)</span>
          )} {row.unit_symbol}
        </span>
      )
    },
    {
      header: 'Total Cost',
      accessor: 'total_production_cost',
      render: (row) => (
        <span className="font-mono font-bold text-slate-200">
          Rs. {parseFloat(row.total_production_cost || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Unit Cost',
      accessor: 'cost_per_unit',
      render: (row) => (
        <span className="font-mono font-bold text-cyan-400">
          Rs. {parseFloat(row.cost_per_unit || 0).toFixed(2)}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <Badge variant={row.status} />
    },
    {
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewDetails(row)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="View BOM & Costing"
          >
            <Eye className="w-4 h-4" />
          </button>
          {row.status !== 'Completed' && (
            <button
              onClick={() => handleOpenCompleteModal(row)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
              title="Complete Production Order"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Complete</span>
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Production & Manufacturing (BOM)</h2>
          <p className="text-xs text-slate-400">Issue raw materials into production lines, track unit costing, and receive finished garments.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Production Order</span>
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        searchPlaceholder="Search production orders by product or number..."
        filters={[
          {
            key: 'status',
            label: 'All Statuses',
            options: [
              { label: 'In Progress', value: 'In Progress' },
              { label: 'Planned', value: 'Planned' },
              { label: 'Completed', value: 'Completed' }
            ]
          }
        ]}
      />

      {/* New Production Order Modal (BOM + Costing) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Production Order & Issue Raw Materials"
        subtitle="Raw materials (fabric, trims, thread) will be deducted from warehouse inventory."
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Finished Product to Manufacture *</label>
              <select
                required
                value={formData.finished_product_id}
                onChange={(e) => setFormData({ ...formData, finished_product_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select Target Product</option>
                {finishedProducts.map((fp) => (
                  <option key={fp.id} value={fp.id}>
                    {fp.name} ({fp.product_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Planned Quantity (Pieces) *</label>
              <input
                type="number"
                required
                step="1"
                value={formData.planned_quantity}
                onChange={(e) => setFormData({ ...formData, planned_quantity: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Dynamic BOM Materials */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">Bill of Materials (BOM) & Material Issue</h4>
                <p className="text-[10px] text-slate-400">Specify fabrics, threads, buttons, and trims needed for this batch.</p>
              </div>
              <button
                type="button"
                onClick={addMaterialRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-brand-400 font-semibold rounded-lg text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Material</span>
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto">
              {formData.materials.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <div className="col-span-6">
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Raw Material</label>
                    <select
                      required
                      value={row.item_id}
                      onChange={(e) => handleMaterialChange(idx, 'item_id', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white text-xs"
                    >
                      <option value="">Select Item</option>
                      {rawItems.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} (Stock: {it.current_stock})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Required Qty</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={row.planned_quantity}
                      onChange={(e) => handleMaterialChange(idx, 'planned_quantity', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Unit Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      value={row.unit_cost}
                      onChange={(e) => handleMaterialChange(idx, 'unit_cost', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                    />
                  </div>

                  <div className="col-span-1 text-center pt-4">
                    <button
                      type="button"
                      onClick={() => removeMaterialRow(idx)}
                      disabled={formData.materials.length === 1}
                      className="text-slate-400 hover:text-rose-400 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Costing Breakdown Card */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Labour Cost (Rs.)</label>
              <input
                type="number"
                step="0.01"
                value={formData.labour_cost}
                onChange={(e) => setFormData({ ...formData, labour_cost: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Machine / Power (Rs.)</label>
              <input
                type="number"
                step="0.01"
                value={formData.machine_cost}
                onChange={(e) => setFormData({ ...formData, machine_cost: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Other Overheads (Rs.)</label>
              <input
                type="number"
                step="0.01"
                value={formData.other_cost}
                onChange={(e) => setFormData({ ...formData, other_cost: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-brand-500/30 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Est. Cost Per Piece</span>
              <span className="text-base font-black text-cyan-400 font-mono">
                Rs. {unitCostEst.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-600/30"
            >
              {submitting ? 'Starting Production...' : 'Start Production & Issue Materials'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Complete Order Modal */}
      <Modal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        title={`Complete Production Order: ${selectedOrder?.production_number}`}
        subtitle="This will record actual manufactured pieces into the Finished Goods Warehouse."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Actual Finished Quantity (Pieces) *</label>
            <input
              type="number"
              required
              step="1"
              value={completeData.actual_quantity}
              onChange={(e) => setCompleteData({ ...completeData, actual_quantity: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Completion Date *</label>
            <input
              type="date"
              required
              value={completeData.completion_date}
              onChange={(e) => setCompleteData({ ...completeData, completion_date: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Final QC & Inspection Notes</label>
            <textarea
              rows="2"
              value={completeData.final_notes}
              onChange={(e) => setCompleteData({ ...completeData, final_notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCompleteModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30"
            >
              {submitting ? 'Completing...' : 'Confirm & Receive Finished Goods'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Production Order: ${selectedOrder?.production_number}`}
        subtitle={`Product: ${selectedOrder?.finished_product_name}`}
        maxWidth="max-w-3xl"
      >
        {selectedOrder && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-sans block">Planned Quantity</span>
                <span className="text-sm font-bold text-white mt-0.5 block">{parseFloat(selectedOrder.planned_quantity).toLocaleString()} pcs</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-sans block">Total Cost</span>
                <span className="text-sm font-bold text-slate-200 mt-0.5 block">Rs. {parseFloat(selectedOrder.costs?.total_production_cost || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-sans block">Unit Cost</span>
                <span className="text-sm font-bold text-cyan-400 mt-0.5 block">Rs. {parseFloat(selectedOrder.costs?.cost_per_unit || 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-sans block">Status</span>
                <div className="mt-1"><Badge variant={selectedOrder.status} /></div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-white mb-2 uppercase tracking-wider text-[11px]">BOM Materials Issued</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-slate-850 text-slate-400 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="p-2.5">Material</th>
                      <th className="p-2.5 text-center">Issued Qty</th>
                      <th className="p-2.5 text-right">Unit Rate</th>
                      <th className="p-2.5 text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {selectedOrder.materials?.map((m) => (
                      <tr key={m.id}>
                        <td className="p-2.5 font-medium">
                          {m.item_name}
                          <span className="block text-[10px] text-slate-400 font-mono">{m.item_code}</span>
                        </td>
                        <td className="p-2.5 text-center font-mono">{parseFloat(m.issued_quantity).toLocaleString()} {m.unit_symbol}</td>
                        <td className="p-2.5 text-right font-mono">Rs. {parseFloat(m.unit_cost).toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-white">Rs. {parseFloat(m.total_cost).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
