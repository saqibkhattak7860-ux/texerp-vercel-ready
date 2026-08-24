import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { Plus, Eye, Truck, Trash2, Calendar, Users, ShoppingBag } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function SalesOrders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useNotification();

  const [formData, setFormData] = useState({
    customer_id: '',
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    notes: '',
    items: [{ product_id: '', quantity: '100', rate: '1250', discount: '0', tax: '0', total_amount: 125000 }]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [soRes, custRes, prodRes] = await Promise.all([
        api.get('/sales/orders'),
        api.get('/customers'),
        api.get('/finished-products')
      ]);
      if (soRes.data?.success) setOrders(soRes.data.data);
      if (custRes.data?.success) setCustomers(custRes.data.data);
      if (prodRes.data?.success) setProducts(prodRes.data.data);
    } catch (err) {
      showToast('Failed to load sales orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      customer_id: customers[0]?.id || '',
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: '',
      notes: '',
      items: [
        {
          product_id: products[0]?.id || '',
          quantity: '200',
          rate: products[0]?.selling_price || '1250',
          discount: '0',
          tax: '0',
          total_amount: 200 * parseFloat(products[0]?.selling_price || 1250)
        }
      ]
    });
    setIsModalOpen(true);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...formData.items];
    updated[index][field] = value;

    const q = parseFloat(updated[index].quantity || 0);
    const r = parseFloat(updated[index].rate || 0);
    const d = parseFloat(updated[index].discount || 0);
    const t = parseFloat(updated[index].tax || 0);
    updated[index].total_amount = Math.max(0, q * r - d + t);

    if (field === 'product_id') {
      const selected = products.find((p) => p.id === parseInt(value, 10));
      if (selected) {
        updated[index].rate = selected.selling_price;
        updated[index].total_amount = q * parseFloat(selected.selling_price);
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
          product_id: products[0]?.id || '',
          quantity: '50',
          rate: products[0]?.selling_price || '1000',
          discount: '0',
          tax: '0',
          total_amount: 50 * parseFloat(products[0]?.selling_price || 1000)
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

  const subtotal = formData.items.reduce((acc, row) => acc + (parseFloat(row.total_amount) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/sales/orders', {
        ...formData,
        subtotal,
        total_amount: subtotal
      });
      showToast('Sales order created successfully');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.put(`/sales/orders/${orderId}/status`, { status: newStatus });
      showToast(`Order status updated to ${newStatus}`);
      fetchData();
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleViewDetails = async (order) => {
    try {
      const res = await api.get(`/sales/orders/${order.id}`);
      if (res.data?.success) {
        setSelectedOrder(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (err) {
      showToast('Failed to load order details', 'error');
    }
  };

  const columns = [
    {
      header: 'Order #',
      accessor: 'order_number',
      render: (row) => <span className="font-mono font-bold text-brand-400">{row.order_number}</span>
    },
    {
      header: 'Customer',
      accessor: 'customer_name',
      render: (row) => (
        <div>
          <span className="font-bold text-white block">{row.customer_name}</span>
          <span className="text-xs text-slate-400">{row.customer_company}</span>
        </div>
      )
    },
    {
      header: 'Order Date',
      accessor: 'order_date',
      render: (row) => <span className="text-xs text-slate-300">{row.order_date}</span>
    },
    {
      header: 'Items Ordered',
      accessor: 'total_units_ordered',
      render: (row) => (
        <span className="font-mono font-bold text-white">
          {parseFloat(row.total_units_ordered).toLocaleString()} pcs
        </span>
      )
    },
    {
      header: 'Total Value',
      accessor: 'total_amount',
      render: (row) => (
        <span className="font-mono font-bold text-emerald-400">
          Rs. {parseFloat(row.total_amount).toLocaleString()}
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
            title="View Order Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Sales Orders Management</h2>
          <p className="text-xs text-slate-400">Manage buyer orders, dispatch readiness, and delivery challans.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Customer Order</span>
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        searchPlaceholder="Search orders by order # or customer..."
        filters={[
          {
            key: 'status',
            label: 'All Statuses',
            options: [
              { label: 'Confirmed', value: 'Confirmed' },
              { label: 'In Production', value: 'In Production' },
              { label: 'Ready', value: 'Ready' },
              { label: 'Delivered', value: 'Delivered' }
            ]
          }
        ]}
      />

      {/* Create Order Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Customer Sales Order"
        subtitle="Select client, finished garments, order quantity, and pricing terms."
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Customer / Buyer *</label>
              <select
                required
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.company_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Order Date *</label>
              <input
                type="date"
                required
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Delivery Target Date</label>
              <input
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Dynamic Order Line Items */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Garment Products</h4>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-brand-400 font-semibold rounded-lg text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product Line</span>
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto">
              {formData.items.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <div className="col-span-5">
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Product</label>
                    <select
                      required
                      value={row.product_id}
                      onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white text-xs"
                    >
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.quantity_available})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Qty (Pcs)</label>
                    <input
                      type="number"
                      required
                      step="1"
                      value={row.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Selling Rate (Rs.)</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={row.rate}
                      onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                    />
                  </div>

                  <div className="col-span-2">
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

          <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-semibold uppercase">Total Order Value:</span>
            <span className="text-xl font-black text-emerald-400 font-mono">
              Rs. {subtotal.toLocaleString()}
            </span>
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
              {submitting ? 'Confirming...' : 'Confirm Sales Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Order Details Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Sales Order: ${selectedOrder?.order_number}`}
        subtitle={`Customer: ${selectedOrder?.customer_name} (${selectedOrder?.customer_company})`}
        maxWidth="max-w-3xl"
      >
        {selectedOrder && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-sans block">Order Total</span>
                <span className="text-base font-bold text-white mt-0.5 block">
                  Rs. {parseFloat(selectedOrder.total_amount).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-sans block">Status</span>
                <div className="mt-1"><Badge variant={selectedOrder.status} /></div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-sans block">Update Status</span>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="In Production">In Production</option>
                  <option value="Ready">Ready</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-white mb-2 uppercase tracking-wider text-[11px]">Ordered Garments</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-slate-850 text-slate-400 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5 text-center">Ordered</th>
                      <th className="p-2.5 text-center">Delivered</th>
                      <th className="p-2.5 text-right">Selling Rate</th>
                      <th className="p-2.5 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {selectedOrder.items?.map((it) => (
                      <tr key={it.id}>
                        <td className="p-2.5 font-medium">
                          {it.product_name}
                          <span className="block text-[10px] text-slate-400 font-mono">{it.product_code}</span>
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-white">{parseFloat(it.quantity).toLocaleString()} {it.unit_symbol}</td>
                        <td className="p-2.5 text-center font-mono text-emerald-400">{parseFloat(it.delivered_quantity || 0).toLocaleString()} {it.unit_symbol}</td>
                        <td className="p-2.5 text-right font-mono">Rs. {parseFloat(it.rate).toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-400">Rs. {parseFloat(it.total_amount).toLocaleString()}</td>
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
