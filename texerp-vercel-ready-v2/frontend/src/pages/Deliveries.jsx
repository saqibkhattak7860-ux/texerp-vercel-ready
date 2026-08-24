import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { Plus, Truck, Eye, CheckCircle2, Building2, Layers } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function Deliveries() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useNotification();

  const [formData, setFormData] = useState({
    sales_order_id: '',
    delivery_date: new Date().toISOString().split('T')[0],
    transport_details: 'Standard Courier / Delivery Truck',
    notes: '',
    items: []
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales/orders');
      if (res.data?.success) setOrders(res.data.data);
    } catch (err) {
      showToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDispatch = async (order) => {
    try {
      const res = await api.get(`/sales/orders/${order.id}`);
      if (res.data?.success) {
        const fullOrder = res.data.data;
        setSelectedOrder(fullOrder);

        // Filter items that have remaining pending delivery
        const dispatchItems = fullOrder.items.map((it) => {
          const ordered = parseFloat(it.quantity);
          const del = parseFloat(it.delivered_quantity || 0);
          const remaining = Math.max(0, ordered - del);
          return {
            sales_order_item_id: it.id,
            product_id: it.product_id,
            product_name: it.product_name,
            product_code: it.product_code,
            ordered_quantity: ordered,
            delivered_quantity: del,
            remaining_to_deliver: remaining,
            quantity: remaining // default to dispatching all remaining
          };
        });

        setFormData({
          sales_order_id: fullOrder.id,
          delivery_date: new Date().toISOString().split('T')[0],
          transport_details: 'Dispatch Van - Driver Muhammad Tariq (Registration LEA-4481)',
          notes: 'Standard carton packing with seal.',
          items: dispatchItems
        });

        setIsModalOpen(true);
      }
    } catch (err) {
      showToast('Failed to load order for delivery', 'error');
    }
  };

  const handleItemQtyChange = (index, value) => {
    const updated = [...formData.items];
    updated[index].quantity = value;
    setFormData({ ...formData, items: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/deliveries', formData);
      showToast('Delivery challan created and finished goods stock deducted!');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setSubmitting(false);
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
      header: 'Total Ordered',
      accessor: 'total_units_ordered',
      render: (row) => (
        <span className="font-mono font-bold text-white">
          {parseFloat(row.total_units_ordered).toLocaleString()} pcs
        </span>
      )
    },
    {
      header: 'Delivered',
      accessor: 'total_units_delivered',
      render: (row) => (
        <span className="font-mono font-bold text-emerald-400">
          {parseFloat(row.total_units_delivered || 0).toLocaleString()} pcs
        </span>
      )
    },
    {
      header: 'Pending Dispatch',
      accessor: 'id',
      render: (row) => {
        const pending = Math.max(0, parseFloat(row.total_units_ordered) - parseFloat(row.total_units_delivered || 0));
        return (
          <span className={`font-mono font-bold ${pending > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            {pending.toLocaleString()} pcs
          </span>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <Badge variant={row.status} />
    },
    {
      header: 'Dispatch Action',
      sortable: false,
      render: (row) => (
        <button
          onClick={() => handleOpenDispatch(row)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-brand-900/30"
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Create Delivery Challan</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Delivery & Dispatch Management</h2>
          <p className="text-xs text-slate-400">Generate delivery challans and atomically deduct finished goods inventory.</p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        searchPlaceholder="Search orders for dispatch..."
      />

      {/* Create Delivery Challan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Dispatch Delivery: Order #${selectedOrder?.order_number}`}
        subtitle={`Customer: ${selectedOrder?.customer_name} | Stock will be deducted from Finished Goods Warehouse.`}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Dispatch Date *</label>
              <input
                type="date"
                required
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Transport / Vehicle Details *</label>
              <input
                type="text"
                required
                value={formData.transport_details}
                onChange={(e) => setFormData({ ...formData, transport_details: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
                placeholder="Driver, vehicle registration number, or courier tracking..."
              />
            </div>
          </div>

          {/* Dynamic Dispatch Items */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Garments to Dispatch</h4>
            <div className="space-y-2">
              {formData.items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <h5 className="font-bold text-white">{it.product_name}</h5>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Ordered: {it.ordered_quantity} | Previously Delivered: {it.delivered_quantity} | Pending: {it.remaining_to_deliver}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-slate-400 font-semibold">Dispatch Qty:</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={it.remaining_to_deliver}
                      value={it.quantity}
                      onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                      className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono font-bold text-right"
                    />
                    <span className="text-slate-400 font-mono">pcs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
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
              {submitting ? 'Dispatching...' : 'Confirm Delivery & Deduct Inventory'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
