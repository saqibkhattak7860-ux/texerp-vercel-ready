import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import {
  Building2,
  Search,
  UserPlus,
  Filter,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Eye,
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import api from '../../services/api';
import AccountDetailsModal from './AccountDetailsModal';

export default function ClientAccounts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openCreateModal, refreshTrigger } = useOutletContext() || {};
  const currentStatus = searchParams.get('status') || 'all';

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    loadCompanies();
  }, [currentStatus, search, refreshTrigger]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const params = {};
      if (currentStatus !== 'all') params.status = currentStatus;
      if (search) params.search = search;

      const res = await api.get('/main-admin/companies', { params });
      if (res.data?.success) {
        setCompanies(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusTab = (status) => {
    if (status === 'all') {
      searchParams.delete('status');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ status });
    }
  };

  const handleQuickStatusToggle = async (companyId, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    setTogglingId(companyId);
    try {
      const res = await api.put(`/main-admin/companies/${companyId}/status`, { status: nextStatus });
      if (res.data?.success) {
        await loadCompanies();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Client Accounts Directory</h1>
          <p className="text-xs text-slate-400">View and manage all client enterprise accounts, credentials, and access statuses.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadCompanies}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => openCreateModal && openCreateModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Client Account</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 w-full md:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Accounts' },
            { id: 'Active', label: 'Active', count: null },
            { id: 'Inactive', label: 'Inactive', count: null },
            { id: 'Suspended', label: 'Suspended', count: null }
          ].map((tab) => {
            const isActive = currentStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleStatusTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search company, admin, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Company Name</th>
                <th className="px-5 py-4">Primary Administrator</th>
                <th className="px-5 py-4">Phone / Contact</th>
                <th className="px-5 py-4">Currency & Tax</th>
                <th className="px-5 py-4">Access Status</th>
                <th className="px-5 py-4">Created Date</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <div className="h-7 w-7 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>Loading client accounts...</span>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center text-slate-500">
                    No client companies found matching your criteria.
                  </td>
                </tr>
              ) : (
                companies.map((c) => {
                  const isActive = c.status === 'Active';
                  const isSuspended = c.status === 'Suspended';
                  return (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-sm">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{c.name}</p>
                            <p className="text-[11px] text-slate-400">Tenant #{c.id} • Prefix: {c.invoice_prefix || 'INV'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">{c.admin_name}</p>
                        <p className="text-[11px] text-slate-400">{c.admin_email}</p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-slate-300">{c.phone || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{c.address || ''}</p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-mono text-xs text-white">{c.currency || 'PKR'}</p>
                        <p className="text-[10px] text-slate-400">{c.tax_number || 'No Tax ID'}</p>
                      </td>

                      <td className="px-5 py-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Active
                          </span>
                        ) : isSuspended ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span> Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-400 text-xs">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={togglingId === c.id}
                            onClick={() => handleQuickStatusToggle(c.id, c.status)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              isActive
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                          >
                            {togglingId === c.id ? 'Updating...' : (isActive ? 'Deactivate' : 'Activate')}
                          </button>

                          <button
                            onClick={() => {
                              setSelectedCompanyId(c.id);
                              setDetailsModalOpen(true);
                            }}
                            className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                            title="Inspect Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Details Modal */}
      {detailsModalOpen && selectedCompanyId && (
        <AccountDetailsModal
          companyId={selectedCompanyId}
          isOpen={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedCompanyId(null);
          }}
          onUpdated={loadCompanies}
        />
      )}
    </div>
  );
}
