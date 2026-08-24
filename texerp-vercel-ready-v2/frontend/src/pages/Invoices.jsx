import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import PrintableInvoice from '../components/common/PrintableInvoice';
import { Plus, Receipt, Printer, Eye, Trash2, DollarSign } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useNotification();

  const [formData, setFormData] = useState({
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    paid_amount: '0',
    notes: '',
    items: [{ product_id: '', quantity: '200', rate: '1250', discount: '0', tax: '0', total_amount: 250000 }]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, custRes, prodRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/customers'),
        api.get('/finished-products')
      ]);
      if (invRes.data?.success) setInvoices(invRes.data.data);
      if (custRes.data?.success) setCustomers(custRes.data.data);
      if (prodRes.data?.success) setProducts(prodRes.data.data);
    } catch (err) {
      showToast('Failed to load invoices', 'error');
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
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      paid_amount: '0',
      notes: '',
      items: [
        {
          product_id: products[0]?.id || '',
          quantity: '100',
          rate: products[0]?.selling_price || '1250',
          discount: '0',
          tax: '0',
          total_amount: 100 * parseFloat(products[0]?.selling_price || 1250)
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
  const totalAmount = subtotal;
  const paidAmount = parseFloat(formData.paid_amount || 0);
  const dueAmount = Math.max(0, totalAmount - paidAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/invoices', {
        ...formData,
        subtotal,
        total_amount: totalAmount,
        due_amount: dueAmount
      });
      showToast('Invoice generated successfully');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPrint = async (invoice) => {
    try {
      const res = await api.get(`/invoices/${invoice.id}`);
      if (res.data?.success) {
        setSelectedInvoice(res.data.data);
        setIsPrintOpen(true);
      }
    } catch (err) {
      showToast('Failed to load invoice for printing', 'error');
    }
  };

  const columns = [
    {
      header: 'Invoice #',
      accessor: 'invoice_number',
      render: (row) => <span className="font-mono font-bold text-brand-400">{row.invoice_number}</span>
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
      header: 'Date',
      accessor: 'invoice_date',
      render: (row) => <span className="text-xs text-slate-300">{row.invoice_date}</span>
    },
    {
      header: 'Total Value',
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
          <span className="text-emerald-400 font-semibold">Paid: Rs.{parseFloat(row.paid_amount || 0).toLocaleString()}</span>
          <span className="block text-rose-400 font-bold">Due: Rs.{parseFloat(row.due_amount || 0).toLocaleString()}</span>
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
          onClick={() => handleOpenPrint(row)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-brand-400 rounded-lg text-xs font-bold transition-all border border-slate-700"
          title="Print or View Invoice"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / PDF</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Invoice Management</h2>
          <p className="text-xs text-slate-400">Generate commercial tax invoices, print delivery bills, and track customer balances.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Tax Invoice</span>
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        searchPlaceholder="Search invoices by invoice # or customer..."
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

      {/* Create Invoice Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Generate Commercial Tax Invoice"
        subtitle="Specify client details, products, rates, and initial receipt amount."
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Customer *</label>
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
              <label className="block font-semibold text-slate-300 mb-1">Invoice Date *</label>
              <input
                type="date"
                required
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Payment Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Dynamic Invoice Line Items */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Invoice Products & Services</h4>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-brand-400 font-semibold rounded-lg text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
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
                          {p.name} ({p.product_code})
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

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Total</label>
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

          {/* Payment & Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Initial Payment Received Now (Rs.)</label>
              <input
                type="number"
                step="0.01"
                value={formData.paid_amount}
                onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 text-right font-mono">
              <div className="flex justify-between text-white font-bold text-sm">
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
              {submitting ? 'Generating...' : 'Generate Tax Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Invoice Modal */}
      {isPrintOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-md p-4 sm:p-8">
          <PrintableInvoice invoice={selectedInvoice} onClose={() => setIsPrintOpen(false)} />
        </div>
      )}
    </div>
  );
}
