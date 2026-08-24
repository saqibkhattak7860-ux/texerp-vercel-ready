import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { Plus, Eye, ShoppingCart, Trash2, Calendar, Building2, Layers } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useNotification();

  // Form State
  const [formData, setFormData] = useState({
    supplier_id: '',
    warehouse_id: '1',
    invoice_number: '',
    purchase_date: new Date().toISOString().split('T')[0],
    paid_amount: '0',
    notes: '',
    items: [{ item_id: '', quantity: '1000', rate: '120', discount: '0', tax: '0', total_amount: 120000 }]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [purRes, supRes, whRes, itmRes] = await Promise.all([
        api.get('/purchases'),
        api.get('/suppliers'),
        api.get('/warehouses'),
        api.get('/items')
      ]);
      if (purRes.data?.success) setPurchases(purRes.data.data);
      if (supRes.data?.success) setSuppliers(supRes.data.data);
      if (whRes.data?.success) setWarehouses(whRes.data.data);
      if (itmRes.data?.success) setItems(itmRes.data.data);
    } catch (err) {
      showToast('Failed to load purchases', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      supplier_id: suppliers[0]?.id || '',
      warehouse_id: warehouses[0]?.id || '1',
      invoice_number: `PUR-INV-${Date.now().toString().slice(-5)}`,
      purchase_date: new Date().toISOString().split('T')[0],
      paid_amount: '0',
      notes: '',
      items: [
        {
          item_id: items[0]?.id || '',
          quantity: '1000',
          rate: items[0]?.purchase_price || '120',
          discount: '0',
          tax: '0',
          total_amount: (1000 * parseFloat(items[0]?.purchase_price || 120))
        }
      ]
    });
    setIsModalOpen(true);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...formData.items];
    updated[index][field] = value;

    // Auto calculate line total
    const q = parseFloat(updated[index].quantity || 0);
    const r = parseFloat(updated[index].rate || 0);
    const d = parseFloat(updated[index].discount || 0);
    const t = parseFloat(updated[index].tax || 0);
    updated[index].total_amount = Math.max(0, q * r - d + t);

    // If item changed, default rate to item's standard purchase price
    if (field === 'item_id') {
      const selected = items.find((it) => it.id === parseInt(value, 10));
      if (selected) {
        updated[index].rate = selected.purchase_price;
        updated[index].total_amount = q * parseFloat(selected.purchase_price);
      }
    }

    setFormData({ ...formData, items: updated });
  };

  const addItemRow = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          item_id: items[0]?.id || '',
          quantity: '100',
          rate: items[0]?.purchase_price || '100',
          discount: '0',
          tax: '0',
          total_amount: 100 * parseFloat(items[0]?.purchase_price || 100)
        }
      ]
    });
  };

  const removeItemRow = (index) => {
    if (formData.items.length === 1) return;
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  // Calculations
  const subtotal = formData.items.reduce((acc, row) => acc + (parseFloat(row.total_amount) || 0), 0);
  const totalAmount = subtotal;
  const paidAmount = parseFloat(formData.paid_amount || 0);
  const dueAmount = Math.max(0, totalAmount - paidAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/purchases', {
        ...formData,
        subtotal,
        total_amount: totalAmount,
        due_amount: dueAmount
      });
      showToast('Purchase created and stock added to warehouse');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = async (purchase) => {
    try {
      const res = await api.get(`/purchases/${purchase.id}`);
      if (res.data?.success) {
        setSelectedPurchase(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (err) {
      showToast('Failed to load purchase details', 'error');
    }
  };

  const columns = [
    {
      header: 'Invoice #',
      accessor: 'invoice_number',
      render: (row) => <span className="font-mono font-bold text-brand-400">{row.invoice_number}</span>
    },
    {
      header: 'Supplier',
      accessor: 'supplier_name',
      render: (row) => (
        <div>
          <span className="font-bold text-white block">{row.supplier_name}</span>
          <span className="text-xs text-slate-400">{row.supplier_company}</span>
        </div>
      )
    },
    {
      header: 'Date',
      accessor: 'purchase_date',
      render: (row) => <span className="text-xs text-slate-300">{row.purchase_date}</span>
    },
    {
      header: 'Items',
      accessor: 'item_count',
      render: (row) => <span className="text-xs font-semibold text-slate-200">{row.item_count} Items</span>
    },
    {
      header: 'Total Amount',
      accessor: 'total_amount',
      render: (row) => (
        <span className="font-mono font-bold text-white">
          Rs. {parseFloat(row.total_amount).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Paid / Due',
      accessor: 'paid_amount',
      render: (row) => (
        <div className="text-xs font-mono">
          <span className="text-emerald-400">Paid: Rs.{parseFloat(row.paid_amount || 0).toLocaleString()}</span>
          <span className="block text-rose-400">Due: Rs.{parseFloat(row.due_amount || 0).toLocaleString()}</span>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'payment_status',
      render: (row) => <Badge variant={row.payment_status} />
    },
    {
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <button
          onClick={() => handleViewDetails(row)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="View Purchase Details"
        >
          <Eye className="w-4 h-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Purchase Management</h2>
          <p className="text-xs text-slate-400">Procure raw fabric & accessories with automated warehouse stock intake.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Entry</span>
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={purchases}
        loading={loading}
        searchPlaceholder="Search purchases by invoice or supplier..."
        filters={[
          {
            key: 'payment_status',
            label: 'All Payment Statuses',
            options: [
              { label: 'Paid', value: 'Paid' },
              { label: 'Partial', value: 'Partial' },
              { label: 'Unpaid', value: 'Unpaid' }
            ]
          }
        ]}
      />

      {/* New Purchase Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record New Purchase Entry"
        subtitle="Stock will be automatically updated into the selected warehouse upon entry."
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Header Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Supplier *</label>
              <select
                required
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.company_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Target Warehouse (Stock Intake) *</label>
              <select
                required
                value={formData.warehouse_id}
                onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Purchase Invoice Number *</label>
              <input
                type="text"
                required
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Dynamic Items Table */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Purchase Items</h4>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-brand-400 font-semibold rounded-lg text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {formData.items.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <div className="col-span-4">
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Item</label>
                    <select
                      required
                      value={row.item_id}
                      onChange={(e) => handleItemChange(idx, 'item_id', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white text-xs"
                    >
                      <option value="">Select Item</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} ({it.item_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Quantity</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={row.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Rate (Rs.)</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={row.rate}
                      onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Line Total</label>
                    <div className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 font-mono font-bold text-white text-xs">
                      Rs. {parseFloat(row.total_amount || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="col-span-1 text-center pt-4">
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      disabled={formData.items.length === 1}
                      className="text-slate-400 hover:text-rose-400 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment & Totals Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Paid Amount Now (Rs.)</label>
              <input
                type="number"
                step="0.01"
                value={formData.paid_amount}
                onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold focus:border-brand-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">Remaining balance will be added to supplier payable ledger.</p>
            </div>

            <div className="space-y-1.5 text-right font-mono">
              <div className="flex justify-between text-slate-400 text-xs">
                <span>Subtotal:</span>
                <span>Rs. {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-sm border-t border-slate-800 pt-1">
                <span>Total Amount:</span>
                <span className="text-brand-400">Rs. {totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-400 font-bold text-xs">
                <span>Due Balance:</span>
                <span>Rs. {dueAmount.toLocaleString()}</span>
              </div>
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
              {submitting ? 'Saving & Adding Stock...' : 'Submit Purchase Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Purchase Details Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Purchase: ${selectedPurchase?.invoice_number}`}
        subtitle={`Supplier: ${selectedPurchase?.supplier_name} | Date: ${selectedPurchase?.purchase_date}`}
        maxWidth="max-w-3xl"
      >
        {selectedPurchase && (
          <div className="space-y-5 text-xs">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
              <div>
                <span className="text-slate-400 text-[10px] uppercase block font-sans">Total Purchase</span>
                <span className="text-base font-bold text-white mt-0.5 block">
                  Rs. {parseFloat(selectedPurchase.total_amount).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block font-sans">Paid</span>
                <span className="text-base font-bold text-emerald-400 mt-0.5 block">
                  Rs. {parseFloat(selectedPurchase.paid_amount || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block font-sans">Due</span>
                <span className="text-base font-bold text-rose-400 mt-0.5 block">
                  Rs. {parseFloat(selectedPurchase.due_amount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h4 className="font-bold text-white mb-2 uppercase tracking-wider text-[11px]">Items Purchased</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-slate-850 text-slate-400 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Rate</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {selectedPurchase.items?.map((it) => (
                      <tr key={it.id}>
                        <td className="p-2.5 font-medium">
                          {it.item_name}
                          <span className="block text-[10px] text-slate-400 font-mono">{it.item_code}</span>
                        </td>
                        <td className="p-2.5 text-center font-mono">{parseFloat(it.quantity).toLocaleString()} {it.unit_symbol}</td>
                        <td className="p-2.5 text-right font-mono">Rs. {parseFloat(it.rate).toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-white">Rs. {parseFloat(it.total_amount).toLocaleString()}</td>
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
