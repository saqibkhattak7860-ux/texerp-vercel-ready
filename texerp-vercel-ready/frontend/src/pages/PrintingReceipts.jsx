import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { Plus, Printer, CheckCircle2, AlertTriangle, Building2, TrendingDown, Layers } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function PrintingReceipts() {
  const [activeTab, setActiveTab] = useState('receive'); // 'receive' or 'reports'
  const [jobs, setJobs] = useState([]);
  const [reports, setReports] = useState([]);
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useNotification();

  const [formData, setFormData] = useState({
    job_id: '',
    to_warehouse_id: '1',
    receive_date: new Date().toISOString().split('T')[0],
    transport_charges: '0',
    notes: '',
    items: []
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsRes, repRes, itmRes, whRes] = await Promise.all([
        api.get('/printing/jobs'),
        api.get('/printing/reports'),
        api.get('/items'),
        api.get('/warehouses')
      ]);
      if (jobsRes.data?.success) setJobs(jobsRes.data.data);
      if (repRes.data?.success) setReports(repRes.data.data);
      if (itmRes.data?.success) setItems(itmRes.data.data);
      if (whRes.data?.success) setWarehouses(whRes.data.data);
    } catch (err) {
      showToast('Failed to load printing data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenReceiveModal = async (job) => {
    try {
      const res = await api.get(`/printing/jobs/${job.id}`);
      if (res.data?.success) {
        const fullJob = res.data.data;
        setSelectedJob(fullJob);

        // Find printed fabric items (or default to same item)
        const printedCategoryItems = items.filter((it) => it.category_id === 2); // Category 2: Printed Fabric

        setFormData({
          job_id: fullJob.id,
          to_warehouse_id: '1',
          receive_date: new Date().toISOString().split('T')[0],
          transport_charges: '0',
          notes: '',
          items: fullJob.items.map((it) => ({
            job_item_id: it.id,
            raw_item_id: it.item_id,
            design_name: it.design_name,
            pending_quantity: it.pending_quantity,
            resulting_item_id: printedCategoryItems[0]?.id || it.item_id,
            received_quantity: it.pending_quantity, // default to receiving all pending
            wastage_quantity: '0',
            damage_quantity: '0',
            printing_rate: it.rate_per_unit
          }))
        });
        setIsModalOpen(true);
      }
    } catch (err) {
      showToast('Failed to prepare print receive form', 'error');
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...formData.items];
    updated[index][field] = value;
    setFormData({ ...formData, items: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/printing/receive', formData);
      showToast('Printed fabric received and added to inventory!');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingJobs = jobs.filter((j) => parseFloat(j.total_pending_qty) > 0);

  const pendingJobColumns = [
    {
      header: 'Job #',
      accessor: 'job_number',
      render: (row) => <span className="font-mono font-bold text-brand-400">{row.job_number}</span>
    },
    {
      header: 'Printing Vendor',
      accessor: 'vendor_name',
      render: (row) => (
        <div>
          <span className="font-bold text-white block">{row.vendor_name}</span>
          <span className="text-xs text-slate-400">{row.vendor_company}</span>
        </div>
      )
    },
    {
      header: 'Dispatched Date',
      accessor: 'sent_date',
      render: (row) => <span className="text-xs text-slate-300">{row.sent_date}</span>
    },
    {
      header: 'Pending Yardage',
      accessor: 'total_pending_qty',
      render: (row) => (
        <span className="font-mono font-bold text-amber-400">
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
      header: 'Action',
      sortable: false,
      render: (row) => (
        <button
          onClick={() => handleOpenReceiveModal(row)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-brand-900/30"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Receive Fabric Batch</span>
        </button>
      )
    }
  ];

  const reportColumns = [
    {
      header: 'Printer Mill',
      accessor: 'name',
      render: (row) => (
        <div>
          <span className="font-bold text-white block">{row.name}</span>
          <span className="text-xs text-slate-400">{row.company_name}</span>
        </div>
      )
    },
    {
      header: 'Rate/m',
      accessor: 'rate_per_unit',
      render: (row) => <span className="font-mono">Rs. {parseFloat(row.rate_per_unit).toLocaleString()}</span>
    },
    {
      header: 'Fabric Sent',
      accessor: 'total_sent',
      render: (row) => <span className="font-mono font-bold text-white">{parseFloat(row.total_sent).toLocaleString()} m</span>
    },
    {
      header: 'Received',
      accessor: 'total_received',
      render: (row) => <span className="font-mono text-emerald-400 font-semibold">{parseFloat(row.total_received).toLocaleString()} m</span>
    },
    {
      header: 'Pending at Mill',
      accessor: 'pending_fabric',
      render: (row) => (
        <span className={`font-mono font-bold ${parseFloat(row.pending_fabric) > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
          {parseFloat(row.pending_fabric).toLocaleString()} m
        </span>
      )
    },
    {
      header: 'Total Invoiced Bills',
      accessor: 'total_bills',
      render: (row) => <span className="font-mono">Rs. {parseFloat(row.total_bills || 0).toLocaleString()}</span>
    },
    {
      header: 'Pending Bills Due',
      accessor: 'pending_bills',
      render: (row) => (
        <span className="font-mono font-bold text-rose-400">
          Rs. {parseFloat(row.pending_bills || 0).toLocaleString()}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Print Receive & Mill Ledger</h2>
          <p className="text-xs text-slate-400">Process returned printed fabric batches, track wastage, and manage printing bills.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('receive')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'receive'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending Receive Jobs ({pendingJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'reports'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Printing Mill Ledgers
          </button>
        </div>
      </div>

      {/* Main View */}
      {activeTab === 'receive' ? (
        <DataTable
          columns={pendingJobColumns}
          data={pendingJobs}
          loading={loading}
          searchPlaceholder="Search pending jobs..."
          emptyMessage="No pending printing jobs currently awaiting receipt."
        />
      ) : (
        <DataTable
          columns={reportColumns}
          data={reports}
          loading={loading}
          searchPlaceholder="Search printing mill reports..."
        />
      )}

      {/* Receive Printed Fabric Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Receive Fabric: ${selectedJob?.job_number}`}
        subtitle={`Mill: ${selectedJob?.vendor_name} | Dispatched: ${selectedJob?.sent_date}`}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Target Warehouse (Stock In) *</label>
              <select
                required
                value={formData.to_warehouse_id}
                onChange={(e) => setFormData({ ...formData, to_warehouse_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Receive Date *</label>
              <input
                type="date"
                required
                value={formData.receive_date}
                onChange={(e) => setFormData({ ...formData, receive_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Transport Charges (Rs.)</label>
              <input
                type="number"
                step="0.01"
                value={formData.transport_charges}
                onChange={(e) => setFormData({ ...formData, transport_charges: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Dynamic Receive Items */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Received Fabric Inspection</h4>

            <div className="space-y-3">
              {formData.items.map((row, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white">{row.design_name}</span>
                    <span className="text-slate-400 font-mono">
                      Pending: <b className="text-amber-400">{row.pending_quantity} m</b>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Good Qty Received (m) *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={row.received_quantity}
                        onChange={(e) => handleItemChange(idx, 'received_quantity', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Wastage (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={row.wastage_quantity}
                        onChange={(e) => handleItemChange(idx, 'wastage_quantity', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-rose-400 font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Damage (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={row.damage_quantity}
                        onChange={(e) => handleItemChange(idx, 'damage_quantity', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-rose-400 font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Printing Rate (Rs./m)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={row.printing_rate}
                        onChange={(e) => handleItemChange(idx, 'printing_rate', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                      Store in Catalog as (Resulting Printed Item):
                    </label>
                    <select
                      value={row.resulting_item_id}
                      onChange={(e) => handleItemChange(idx, 'resulting_item_id', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                    >
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} ({it.item_code})
                        </option>
                      ))}
                    </select>
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
              {submitting ? 'Processing Receipt...' : 'Confirm Fabric Receipt & Stock In'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
