import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import { History, ShieldAlert, Layers } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useNotification();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs');
      if (res.data?.success) setLogs(res.data.data);
    } catch (err) {
      showToast('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'created_at',
      render: (row) => (
        <div>
          <span className="font-semibold text-white block">{new Date(row.created_at).toLocaleDateString()}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      )
    },
    {
      header: 'User',
      accessor: 'user_name',
      render: (row) => <span className="font-bold text-white text-xs">{row.user_name || 'System / Batch'}</span>
    },
    {
      header: 'Module',
      accessor: 'module',
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
          {row.module}
        </span>
      )
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (row) => {
        const color =
          row.action === 'CREATE'
            ? 'emerald'
            : row.action === 'UPDATE' || row.action === 'STATUS_CHANGE'
            ? 'blue'
            : row.action === 'STOCK_MOVE'
            ? 'purple'
            : 'rose';
        return <Badge color={color}>{row.action}</Badge>;
      }
    },
    {
      header: 'Reference',
      accessor: 'reference_number',
      render: (row) => <span className="font-mono text-xs text-brand-400">{row.reference_number || '—'}</span>
    },
    {
      header: 'Details & Changes',
      accessor: 'details',
      render: (row) => <span className="text-xs text-slate-300 line-clamp-2">{row.details}</span>
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">System Audit Logs</h2>
          <p className="text-xs text-slate-400">Complete traceability of every inventory movement, purchase, sale, payment, and user modification.</p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        searchPlaceholder="Search audit logs by details, ref # or user..."
        filters={[
          {
            key: 'module',
            label: 'All Modules',
            options: [
              { label: 'STOCK', value: 'STOCK' },
              { label: 'PURCHASE', value: 'PURCHASE' },
              { label: 'PRINTING', value: 'PRINTING' },
              { label: 'PRODUCTION', value: 'PRODUCTION' },
              { label: 'SALES', value: 'SALES' },
              { label: 'INVOICE', value: 'INVOICE' },
              { label: 'PAYMENT', value: 'PAYMENT' },
              { label: 'EXPENSE', value: 'EXPENSE' },
              { label: 'USER', value: 'USER' }
            ]
          }
        ]}
      />
    </div>
  );
}
