import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { Plus, Printer, Eye, Truck, Calendar, Layers, Trash2 } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function PrintingJobs() {
  const [jobs, setJobs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useNotification();

  const [formData, setFormData] = useState({
    vendor_id: '',
    from_warehouse_id: '1',
    sent_date: new Date().toISOString().split('T')[0],
    expected_return_date: '',
    challan_number: '',
    transport_cost: '0',
    notes: '',
    items: [{ item_id: '', design_name: '', sent_quantity: '2000', rate_per_unit: '45' }]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsRes, venRes, itmRes] = await Promise.all([
        api.get('/printing/jobs'),
        api.get('/printing/vendors'),
        api.get('/items')
      ]);
      if (jobsRes.data?.success) setJobs(jobsRes.data.data);
      if (venRes.data?.success) setVendors(venRes.data.data);
      // Filter raw fabric or suitable items
      if (itmRes.data?.success) setItems(itmRes.data.data);
    } catch (err) {
      showToast('Failed to load printing jobs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      vendor_id: vendors[0]?.id || '',
      from_warehouse_id: '1',
      sent_date: new Date().toISOString().split('T')[0],
      expected_return_date: '',
      challan_number: `CHL-${Date.now().toString().slice(-5)}`,
      transport_cost: '0',
      notes: '',
      items: [
        {
          item_id: items[0]?.id || '',
          design_name: 'Digital Print Design #101',
          sent_quantity: '2000',
          rate_per_unit: vendors[0]?.rate_per_unit || '45'
        }
      ]
    });
    setIsModalOpen(true);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...formData.items];
    updated[index][field] = value;
    setFormData({ ...formData, items: updated });
  };

  const addItemRow = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          item_id: items[0]?.id || '',
          design_name: 'New Floral Pattern',
          sent_quantity: '1000',
          rate_per_unit: '45'
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/printing/jobs', formData);
      showToast('Print job dispatched and fabric moved to printer location');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = async (job) => {
    try {
      const res = await api.get(`/printing/jobs/${job.id}`);
      if (res.data?.success) {
        setSelectedJob(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (err) {
      showToast('Failed to load printing job details', 'error');
    }
  };

  const columns = [
    {
      header: 'Job #',
      accessor: 'job_number',
      render: (row) => <span className="font-mono font-bold text-brand-400">{row.job_number}</span>
    },
    {
      header: 'Printer Vendor',
      accessor: 'vendor_name',
      render: (row) => (
        <div>
          <span className="font-bold text-white block">{row.vendor_name}</span>
          <span className="text-xs text-slate-400">{row.vendor_company}</span>
        </div>
      )
    },
    {
      header: 'Challan #',
      accessor: 'challan_number',
      render: (row) => <span className="font-mono text-xs text-slate-300">{row.challan_number || '—'}</span>
    },
    {
      header: 'Sent Date',
      accessor: 'sent_date',
      render: (row) => <span className="text-xs text-slate-300">{row.sent_date}</span>
    },
    {
      header: 'Fabric Sent',
      accessor: 'total_sent_qty',
      render: (row) => (
        <span className="font-mono font-bold text-white">
          {parseFloat(row.total_sent_qty).toLocaleString()} m
        </span>
      )
    },
    {
      header: 'Pending at Printer',
      accessor: 'total_pending_qty',
      render: (row) => (
        <span className={`font-mono font-bold ${parseFloat(row.total_pending_qty) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
          {parseFloat(row.total_pending_qty).toLocaleString()} m
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
        <button
          onClick={() => handleViewDetails(row)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="View Job Details"
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
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Fabric Printing Jobs</h2>
          <p className="text-xs text-slate-400">Dispatch raw grey fabrics to printing mills and track challan movements.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Dispatch Fabric for Printing</span>
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={jobs}
        loading={loading}
        searchPlaceholder="Search print jobs by job #, vendor or challan..."
        filters={[
          {
            key: 'status',
            label: 'All Statuses',
            options: [
              { label: 'Sent', value: 'Sent' },
              { label: 'Partial Received', value: 'Partial Received' },
              { label: 'Completed', value: 'Completed' }
            ]
          }
        ]}
      />

      {/* Dispatch Fabric Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Print Job (Send Fabric)"
        subtitle="Deducts fabric from warehouse and routes to Printing Vendor stock location."
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Printing Vendor *</label>
              <select
                required
                value={formData.vendor_id}
                onChange={(e) => {
                  const ven = vendors.find((v) => v.id === parseInt(e.target.value, 10));
                  setFormData({
                    ...formData,
                    vendor_id: e.target.value,
                    items: formData.items.map((it) => ({
                      ...it,
                      rate_per_unit: ven?.rate_per_unit || it.rate_per_unit
                    }))
                  });
                }}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select Vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.company_name}) — Rs. {v.rate_per_unit}/m
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Challan Number *</label>
              <input
                type="text"
                required
                value={formData.challan_number}
                onChange={(e) => setFormData({ ...formData, challan_number: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Dispatch Date *</label>
              <input
                type="date"
                required
                value={formData.sent_date}
                onChange={(e) => setFormData({ ...formData, sent_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Expected Return Date</label>
              <input
                type="date"
                value={formData.expected_return_date}
                onChange={(e) => setFormData({ ...formData, expected_return_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Dynamic Fabric Line Items */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Fabric & Print Designs</h4>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-brand-400 font-semibold rounded-lg text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Design</span>
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto">
              {formData.items.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <div className="col-span-4">
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Raw Fabric Item</label>
                    <select
                      required
                      value={row.item_id}
                      onChange={(e) => handleItemChange(idx, 'item_id', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white text-xs"
                    >
                      <option value="">Select Fabric</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} (Avail: {it.current_stock})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-4">
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Print Design Name</label>
                    <input
                      type="text"
                      required
                      value={row.design_name}
                      onChange={(e) => handleItemChange(idx, 'design_name', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white text-xs"
                      placeholder="e.g. Lawn Floral #101"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Qty (Meters)</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={row.sent_quantity}
                      onChange={(e) => handleItemChange(idx, 'sent_quantity', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Rate/m</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={row.rate_per_unit}
                      onChange={(e) => handleItemChange(idx, 'rate_per_unit', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                    />
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
              {submitting ? 'Dispatching...' : 'Dispatch Print Job'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Job Details Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Printing Job: ${selectedJob?.job_number}`}
        subtitle={`Printer: ${selectedJob?.vendor_name} | Challan: ${selectedJob?.challan_number}`}
        maxWidth="max-w-3xl"
      >
        {selectedJob && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
              <div>
                <span className="text-slate-400 text-[10px] uppercase block font-sans">Dispatch Date</span>
                <span className="text-sm font-bold text-white mt-0.5 block">{selectedJob.sent_date}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block font-sans">Expected Return</span>
                <span className="text-sm font-bold text-brand-400 mt-0.5 block">{selectedJob.expected_return_date || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block font-sans">Status</span>
                <div className="mt-1"><Badge variant={selectedJob.status} /></div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-white mb-2 uppercase tracking-wider text-[11px]">Fabrics & Print Designs</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-slate-850 text-slate-400 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="p-2.5">Design & Item</th>
                      <th className="p-2.5 text-center">Sent</th>
                      <th className="p-2.5 text-center">Received</th>
                      <th className="p-2.5 text-center">Wastage</th>
                      <th className="p-2.5 text-center">Pending</th>
                      <th className="p-2.5 text-right">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {selectedJob.items?.map((it) => (
                      <tr key={it.id}>
                        <td className="p-2.5 font-medium">
                          {it.design_name}
                          <span className="block text-[10px] text-slate-400 font-mono">{it.item_name}</span>
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-white">{parseFloat(it.sent_quantity).toLocaleString()} m</td>
                        <td className="p-2.5 text-center font-mono text-emerald-400">{parseFloat(it.received_quantity || 0).toLocaleString()} m</td>
                        <td className="p-2.5 text-center font-mono text-rose-400">{parseFloat(it.wastage_quantity || 0).toLocaleString()} m</td>
                        <td className="p-2.5 text-center font-mono text-amber-400 font-bold">{parseFloat(it.pending_quantity).toLocaleString()} m</td>
                        <td className="p-2.5 text-right font-mono">Rs. {parseFloat(it.estimated_cost).toLocaleString()}</td>
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
