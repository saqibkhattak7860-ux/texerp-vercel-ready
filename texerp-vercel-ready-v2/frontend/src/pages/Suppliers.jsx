import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { Plus, Building2, Eye, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierDetails, setSupplierDetails] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useNotification();

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    company_name: '',
    phone: '',
    email: '',
    address: '',
    opening_balance: '0',
    notes: ''
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/suppliers');
      if (res.data?.success) setSuppliers(res.data.data);
    } catch (err) {
      showToast('Failed to load suppliers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenAdd = () => {
    setSelectedSupplier(null);
    setFormData({
      code: `SUP-${Date.now().toString().slice(-4)}`,
      name: '',
      company_name: '',
      phone: '+92 300 ',
      email: '',
      address: '',
      opening_balance: '0',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      code: supplier.code,
      name: supplier.name,
      company_name: supplier.company_name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      opening_balance: supplier.opening_balance || '0',
      notes: supplier.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleViewDetails = async (supplier) => {
    try {
      const res = await api.get(`/suppliers/${supplier.id}`);
      if (res.data?.success) {
        setSupplierDetails(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (err) {
      showToast('Failed to load supplier statement', 'error');
    }
  };

  const handleDelete = async (supplier) => {
    if (!window.confirm(`Delete supplier "${supplier.name}"?`)) return;
    try {
      await api.delete(`/suppliers/${supplier.id}`);
      showToast('Supplier deleted successfully');
      fetchSuppliers();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (selectedSupplier) {
        await api.put(`/suppliers/${selectedSupplier.id}`, formData);
        showToast('Supplier updated successfully');
      } else {
        await api.post('/suppliers', formData);
        showToast('Supplier created successfully');
      }
      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Supplier Code',
      accessor: 'code',
      render: (row) => <span className="font-mono font-bold text-brand-400">{row.code}</span>
    },
    {
      header: 'Supplier Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <span className="font-bold text-white block">{row.name}</span>
          <span className="text-xs text-slate-400">{row.company_name || 'Individual Supplier'}</span>
        </div>
      )
    },
    {
      header: 'Contact Info',
      accessor: 'phone',
      render: (row) => (
        <div className="text-xs text-slate-300 space-y-0.5">
          <p className="font-mono">{row.phone || '—'}</p>
          <p className="text-[10px] text-slate-500">{row.email || '—'}</p>
        </div>
      )
    },
    {
      header: 'Total Purchases',
      accessor: 'total_payable',
      render: (row) => (
        <span className="font-mono font-bold text-white">
          Rs. {parseFloat(row.total_payable || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Paid Amount',
      accessor: 'paid_amount',
      render: (row) => (
        <span className="font-mono font-semibold text-emerald-400">
          Rs. {parseFloat(row.paid_amount || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Payable Due',
      accessor: 'remaining_balance',
      render: (row) => (
        <span className="font-mono font-bold text-rose-400">
          Rs. {parseFloat(row.remaining_balance || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewDetails(row)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="View Statement & History"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-400 transition-colors"
            title="Edit Supplier"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-rose-400 transition-colors" title="Delete Supplier">
            <Trash2 className="w-4 h-4" />
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
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Supplier Management</h2>
          <p className="text-xs text-slate-400">Manage weaving mills, yarn dealers, accessory suppliers, and payables.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Supplier</span>
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={suppliers}
        loading={loading}
        searchPlaceholder="Search suppliers by name, company, code or phone..."
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedSupplier ? 'Edit Supplier Information' : 'Register New Supplier'}
        subtitle="Specify mill name, company registration, phone number, and credit balance."
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Supplier Code *</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Representative Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
                placeholder="e.g. Haji Muhammad Aslam"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Mill / Company Name</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
                placeholder="e.g. Kohinoor Weaving Mills Ltd"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>
            {!selectedSupplier && (
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Opening Payable Balance (Rs.)</label>
                <input
                  type="number"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Mill / Warehouse Address</label>
            <textarea
              rows="2"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
              {submitting ? 'Saving...' : selectedSupplier ? 'Update Supplier' : 'Create Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Supplier Statement Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Supplier Statement: ${supplierDetails?.name}`}
        subtitle={`Company: ${supplierDetails?.company_name} | Code: ${supplierDetails?.code}`}
        maxWidth="max-w-3xl"
      >
        {supplierDetails && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-sans block">Total Invoiced Purchases</span>
                <span className="text-sm font-bold text-white mt-0.5 block">Rs. {parseFloat(supplierDetails.total_payable).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-sans block">Paid Amount</span>
                <span className="text-sm font-bold text-emerald-400 mt-0.5 block">Rs. {parseFloat(supplierDetails.paid_amount || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-sans block">Outstanding Payable Due</span>
                <span className="text-sm font-bold text-rose-400 mt-0.5 block">Rs. {parseFloat(supplierDetails.remaining_balance || 0).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-white mb-2 uppercase tracking-wider text-[11px]">Purchase Orders Ledger</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-slate-850 text-slate-400 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="p-2.5">Invoice #</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5 text-right">Total Amount</th>
                      <th className="p-2.5 text-right">Paid</th>
                      <th className="p-2.5 text-right">Due</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {supplierDetails.purchases?.map((pur) => (
                      <tr key={pur.id}>
                        <td className="p-2.5 font-bold font-mono text-brand-400">{pur.invoice_number}</td>
                        <td className="p-2.5 text-slate-300">{pur.purchase_date}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-white">Rs. {parseFloat(pur.total_amount).toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono text-emerald-400">Rs. {parseFloat(pur.paid_amount || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono text-rose-400 font-semibold">Rs. {parseFloat(pur.due_amount || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-center"><Badge variant={pur.payment_status} /></td>
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
