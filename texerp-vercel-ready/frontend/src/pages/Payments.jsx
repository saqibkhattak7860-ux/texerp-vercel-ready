import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { Plus, CreditCard, DollarSign, ArrowDownLeft, ArrowUpRight, Building2, Users } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [printingVendors, setPrintingVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useNotification();

  const [formData, setFormData] = useState({
    party_type: 'Customer', // 'Customer', 'Supplier', 'Printing Vendor'
    payment_type: 'Received', // 'Received' or 'Paid'
    customer_id: '',
    supplier_id: '',
    printing_vendor_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Bank Transfer',
    reference_number: '',
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, custRes, supRes, prtRes] = await Promise.all([
        api.get('/payments'),
        api.get('/customers'),
        api.get('/suppliers'),
        api.get('/printing/vendors')
      ]);
      if (payRes.data?.success) setPayments(payRes.data.data);
      if (custRes.data?.success) setCustomers(custRes.data.data);
      if (supRes.data?.success) setSuppliers(supRes.data.data);
      if (prtRes.data?.success) setPrintingVendors(prtRes.data.data);
    } catch (err) {
      showToast('Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = (partyType = 'Customer') => {
    setFormData({
      party_type: partyType,
      payment_type: partyType === 'Customer' ? 'Received' : 'Paid',
      customer_id: customers[0]?.id || '',
      supplier_id: suppliers[0]?.id || '',
      printing_vendor_id: printingVendors[0]?.id || '',
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Bank Transfer',
      reference_number: `TRX-${Date.now().toString().slice(-6)}`,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/payments', formData);
      showToast('Payment recorded and ledger balances updated!');
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
      header: 'Voucher #',
      accessor: 'payment_number',
      render: (row) => <span className="font-mono font-bold text-brand-400">{row.payment_number}</span>
    },
    {
      header: 'Party',
      accessor: 'party_type',
      render: (row) => {
        const partyName = row.customer_name || row.supplier_name || row.vendor_name || '—';
        const partyCompany = row.customer_company || row.supplier_company || '—';
        return (
          <div>
            <span className="font-bold text-white block">{partyName}</span>
            <span className="text-[10px] text-slate-400">{partyCompany} ({row.party_type})</span>
          </div>
        );
      }
    },
    {
      header: 'Date',
      accessor: 'payment_date',
      render: (row) => <span className="text-xs text-slate-300">{row.payment_date}</span>
    },
    {
      header: 'Method',
      accessor: 'payment_method',
      render: (row) => (
        <span className="px-2 py-0.5 rounded-lg text-xs bg-slate-800 text-slate-200 border border-slate-700 font-medium">
          {row.payment_method}
        </span>
      )
    },
    {
      header: 'Reference',
      accessor: 'reference_number',
      render: (row) => <span className="font-mono text-xs text-slate-400">{row.reference_number || '—'}</span>
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (row) => (
        <span
          className={`font-mono font-bold text-sm ${
            row.payment_type === 'Received' ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {row.payment_type === 'Received' ? '+' : '-'} Rs. {parseFloat(row.amount).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Type',
      accessor: 'payment_type',
      render: (row) => (
        <Badge
          color={row.payment_type === 'Received' ? 'emerald' : 'rose'}
          variant={row.payment_type}
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Payments & Financial Ledger</h2>
          <p className="text-xs text-slate-400">Record customer collections and supplier/printing disbursements.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenAdd('Customer')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/40 transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Receive Customer Payment</span>
          </button>

          <button
            onClick={() => handleOpenAdd('Supplier')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-rose-400 rounded-xl text-xs font-bold transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Pay Supplier / Vendor</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        searchPlaceholder="Search payments by voucher #, reference or party..."
        filters={[
          {
            key: 'party_type',
            label: 'All Parties',
            options: [
              { label: 'Customer', value: 'Customer' },
              { label: 'Supplier', value: 'Supplier' },
              { label: 'Printing Vendor', value: 'Printing Vendor' }
            ]
          }
        ]}
      />

      {/* Payment Entry Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={formData.payment_type === 'Received' ? 'Receive Customer Payment' : 'Record Supplier Disbursement'}
        subtitle="Ledger receivables/payables will be adjusted in real-time upon posting."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Transaction Category *</label>
            <select
              value={formData.party_type}
              onChange={(e) => {
                const pt = e.target.value;
                setFormData({
                  ...formData,
                  party_type: pt,
                  payment_type: pt === 'Customer' ? 'Received' : 'Paid'
                });
              }}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
            >
              <option value="Customer">Customer (Inflow Receipt)</option>
              <option value="Supplier">Supplier (Outflow Payment)</option>
              <option value="Printing Vendor">Printing Vendor (Outflow Payment)</option>
            </select>
          </div>

          {/* Party Selector */}
          {formData.party_type === 'Customer' ? (
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Select Customer *</label>
              <select
                required
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.company_name}) — Pending Balance: Rs. {c.pending_amount}
                  </option>
                ))}
              </select>
            </div>
          ) : formData.party_type === 'Supplier' ? (
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Select Supplier *</label>
              <select
                required
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.company_name}) — Balance Due: Rs. {s.remaining_balance}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Select Printing Vendor *</label>
              <select
                required
                value={formData.printing_vendor_id}
                onChange={(e) => setFormData({ ...formData, printing_vendor_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select Vendor</option>
                {printingVendors.map((pv) => (
                  <option key={pv.id} value={pv.id}>
                    {pv.name} ({pv.company_name}) — Bills Due: Rs. {pv.pending_bills}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Payment Amount (Rs.) *</label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:border-brand-500 focus:outline-none"
                placeholder="e.g. 150000"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Payment Date *</label>
              <input
                type="date"
                required
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer (Online)</option>
                <option value="Cheque">Cheque</option>
                <option value="Online Payment">Credit / Debit Card</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Transaction Ref / Cheque #</label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-500 focus:outline-none"
                placeholder="e.g. MCB-77218"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Notes</label>
            <textarea
              rows="2"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
            ></textarea>
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
              {submitting ? 'Posting...' : 'Post Payment Voucher'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
