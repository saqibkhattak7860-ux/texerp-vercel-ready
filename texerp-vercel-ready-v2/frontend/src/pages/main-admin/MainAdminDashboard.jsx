import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Sparkles,
  UserPlus,
  Shield,
  Search,
  ExternalLink,
  RefreshCw,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import api from '../../services/api';
import AccountDetailsModal from './AccountDetailsModal';

export default function MainAdminDashboard() {
  const { openCreateModal } = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [pendingData, setPendingData] = useState({ users: [], companies: [], roles: [] });
  const [approvalCompany, setApprovalCompany] = useState({});

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/main-admin/dashboard');
      if (res.data?.success) {
        setData(res.data.data);
      }
      const pendingRes = await api.get('/main-admin/pending-users');
      if (pendingRes.data?.success) {
        setPendingData(pendingRes.data.data);
        setApprovalCompany((current) => Object.fromEntries(pendingRes.data.data.users.map((user) => [user.id, current[user.id] || user.company_id || pendingRes.data.data.companies[0]?.id || ''])));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load master admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handlePendingAction = async (userId, action) => {
    try {
      await api.put(`/main-admin/users/${userId}/${action}`, action === 'approve' ? { company_id: approvalCompany[userId], role_id: pendingData.roles[0]?.id } : {});
      await loadDashboard();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} registration.`);
    }
  };

  const handleQuickStatusToggle = async (companyId, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    setTogglingId(companyId);
    try {
      const res = await api.put(`/main-admin/companies/${companyId}/status`, { status: nextStatus });
      if (res.data?.success) {
        await loadDashboard();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-400">Loading Master Admin Control Center...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalAccounts: 0,
    activeAccounts: 0,
    inactiveAccounts: 0,
    suspendedAccounts: 0,
    newAccounts: 0
  };

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/40 border border-slate-800/80 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Master Administrator
              </span>
              <span className="text-xs text-slate-400">Multi-Tenant Platform Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              SaaS Client & Tenant Management
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl mt-1">
              Create client company accounts, manage subscription access, activate or deactivate tenants, and monitor software utilization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboard}
              className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
              title="Refresh Dashboard"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => openCreateModal && openCreateModal()}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 shadow-xl shadow-amber-500/25 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Client Account</span>
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-slate-900/80 border border-amber-500/20 p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Pending User Registrations</h3>
          <p className="text-xs text-slate-400">Review applicant details and authorize access before the user can log in.</p>
        </div>
        {pendingData.users.length === 0 ? <p className="text-sm text-slate-500">No pending registrations.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800"><tr><th className="px-3 py-3">Applicant</th><th className="px-3 py-3">Company / Logo</th><th className="px-3 py-3">Registered</th><th className="px-3 py-3">Assign Company</th><th className="px-3 py-3 text-right">Decision</th></tr></thead>
              <tbody className="divide-y divide-slate-800/60">
                {pendingData.users.map((pendingUser) => <tr key={pendingUser.id}>
                  <td className="px-3 py-3"><p className="font-bold text-white">{pendingUser.name}</p><p className="text-slate-400">{pendingUser.email}</p></td>
                  <td className="px-3 py-3"><div className="flex items-center gap-2">{pendingUser.logo_url ? <img src={pendingUser.logo_url} alt="Registered company logo" className="h-8 w-8 rounded object-contain bg-white p-0.5" /> : <div className="h-8 w-8 rounded bg-slate-800 flex items-center justify-center text-slate-400">C</div>}<span className="font-semibold text-white">{pendingUser.company_name || 'No company name'}</span></div></td>
                  <td className="px-3 py-3">{new Date(pendingUser.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-3"><select value={approvalCompany[pendingUser.id] || ''} onChange={(e) => setApprovalCompany((current) => ({ ...current, [pendingUser.id]: e.target.value }))} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white"><option value="">Select company</option>{pendingData.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></td>
                  <td className="px-3 py-3 text-right space-x-2"><button disabled={!approvalCompany[pendingUser.id]} onClick={() => handlePendingAction(pendingUser.id, 'approve')} className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold disabled:opacity-40">Approve</button><button onClick={() => handlePendingAction(pendingUser.id, 'reject')} className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white font-bold">Reject</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Accounts */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Accounts</span>
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-3">{kpis.totalAccounts}</p>
          <p className="text-[11px] text-slate-400 mt-1">All registered client firms</p>
        </div>

        {/* Active Accounts */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Active Accounts</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-3">{kpis.activeAccounts}</p>
          <p className="text-[11px] text-slate-400 mt-1">Logged-in & fully operating</p>
        </div>

        {/* Inactive Accounts */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Inactive</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-3">{kpis.inactiveAccounts}</p>
          <p className="text-[11px] text-slate-400 mt-1">Access paused by owner</p>
        </div>

        {/* Suspended Accounts */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Suspended</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-400 mt-3">{kpis.suspendedAccounts}</p>
          <p className="text-[11px] text-slate-400 mt-1">Login strictly blocked</p>
        </div>

        {/* New Accounts */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/30 transition-all col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">New (30 Days)</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-cyan-400 mt-3">{kpis.newAccounts}</p>
          <p className="text-[11px] text-slate-400 mt-1">Recent onboardings</p>
        </div>
      </div>

      {/* Client Accounts Table */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white">Client Company Accounts</h3>
            <p className="text-xs text-slate-400">Real-time status, quick access controls, and tenant management.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5 rounded-l-xl">Company</th>
                <th className="px-4 py-3.5">Primary Admin</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">Currency</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Created</th>
                <th className="px-4 py-3.5 rounded-r-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(!data?.recentCompanies || data.recentCompanies.length === 0) ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                    No client accounts registered yet. Click "Create Client Account" to add the first company.
                  </td>
                </tr>
              ) : (
                data.recentCompanies.map((c) => {
                  const isActive = c.status === 'Active';
                  const isSuspended = c.status === 'Suspended';
                  return (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-600/20 to-cyan-500/20 border border-brand-500/30 flex items-center justify-center font-black text-brand-400">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{c.name}</p>
                            <p className="text-[11px] text-slate-400">{c.tax_number ? `NTN: ${c.tax_number}` : 'Standard Client'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-white">{c.admin_name}</p>
                        <p className="text-[11px] text-slate-400">{c.admin_email}</p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-slate-300">{c.phone || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{c.address || ''}</p>
                      </td>

                      <td className="px-4 py-4">
                        <span className="font-mono text-xs text-slate-300 px-2 py-1 rounded bg-slate-950 border border-slate-800">
                          {c.currency || 'PKR'}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Active
                          </span>
                        ) : isSuspended ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span> Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-400 text-xs">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Quick Toggle Status */}
                          <button
                            disabled={togglingId === c.id}
                            onClick={() => handleQuickStatusToggle(c.id, c.status)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              isActive
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                            title={isActive ? 'Deactivate Account' : 'Activate Account'}
                          >
                            {togglingId === c.id ? 'Updating...' : (isActive ? 'Deactivate' : 'Activate')}
                          </button>

                          {/* View Details */}
                          <button
                            onClick={() => {
                              setSelectedCompanyId(c.id);
                              setDetailsModalOpen(true);
                            }}
                            className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                            title="Inspect Account Details"
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
          onUpdated={loadDashboard}
        />
      )}
    </div>
  );
}
