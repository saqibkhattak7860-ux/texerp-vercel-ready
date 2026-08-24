import React, { useState, useEffect } from 'react';
import { X, Building2, User, Mail, Phone, MapPin, Key, Activity, Trash2, CheckCircle2, AlertTriangle, Boxes, ShoppingCart, Truck, Receipt } from 'lucide-react';
import api from '../../services/api';

export default function AccountDetailsModal({ companyId, isOpen, onClose, onUpdated }) {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (isOpen && companyId) {
      loadCompanyDetails();
    }
  }, [isOpen, companyId]);

  const loadCompanyDetails = async () => {
    setLoading(true);
    setError('');
    setActionSuccess('');
    try {
      const res = await api.get(`/main-admin/companies/${companyId}`);
      if (res.data?.success) {
        setCompany(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load company details.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    setActionSuccess('');
    setError('');
    try {
      const res = await api.put(`/main-admin/companies/${companyId}/status`, { status: newStatus });
      if (res.data?.success) {
        setActionSuccess(`Account status successfully updated to ${newStatus}.`);
        setCompany({ ...company, status: newStatus });
        onUpdated && onUpdated();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update account status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setResettingPassword(true);
    setActionSuccess('');
    setError('');
    try {
      const res = await api.post(`/main-admin/companies/${companyId}/reset-password`, { password: newPassword });
      if (res.data?.success) {
        setActionSuccess('Admin password reset successfully!');
        setNewPassword('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${company.name}" and all its records? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await api.delete(`/main-admin/companies/${companyId}`);
      if (res.data?.success) {
        alert(res.data.message);
        onUpdated && onUpdated();
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete company account.');
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (st) => {
    switch (st) {
      case 'Active':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Active (Full Access)</span>;
      case 'Inactive':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Inactive (Disabled)</span>;
      case 'Suspended':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">Suspended (Blocked)</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">{st}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Client Account Overview</h3>
              <p className="text-xs text-slate-400">Master Administrator tenant inspector and control center.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs">Loading client account data...</p>
          </div>
        ) : error && !company ? (
          <div className="p-8 text-center text-rose-400 text-sm">{error}</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Status alerts */}
            {actionSuccess && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400 font-medium">
                {actionSuccess}
              </div>
            )}
            {error && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-xs text-rose-400 font-medium">
                {error}
              </div>
            )}

            {/* Company Hero Card */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-black text-white">{company.name}</h2>
                  {getStatusBadge(company.status)}
                </div>
                <p className="text-xs text-slate-400 mt-1">Tenant ID: #{company.id} • Created: {new Date(company.created_at).toLocaleDateString()}</p>
                {company.address && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {company.address}
                  </p>
                )}
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-2">
                {company.status !== 'Active' && (
                  <button
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange('Active')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all"
                  >
                    Activate Account
                  </button>
                )}
                {company.status !== 'Inactive' && (
                  <button
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange('Inactive')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition-all"
                  >
                    Deactivate
                  </button>
                )}
                {company.status !== 'Suspended' && (
                  <button
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange('Suspended')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 transition-all"
                  >
                    Suspend Access
                  </button>
                )}
              </div>
            </div>

            {/* Tenant ERP Statistics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Boxes className="w-3.5 h-3.5 text-brand-400" />
                  <span>Item SKUs</span>
                </div>
                <p className="text-xl font-bold text-white">{company.total_items || 0}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Purchases</span>
                </div>
                <p className="text-xl font-bold text-white">{company.total_purchases || 0}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Truck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Sales Orders</span>
                </div>
                <p className="text-xl font-bold text-white">{company.total_orders || 0}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Receipt className="w-3.5 h-3.5 text-amber-400" />
                  <span>Invoices</span>
                </div>
                <p className="text-xl font-bold text-white">{company.total_invoices || 0}</p>
              </div>
            </div>

            {/* Admin User & Credentials Section */}
            <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4" /> Client Administrator Account
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Administrator Name</p>
                  <p className="text-white font-semibold mt-0.5">{company.admin_name}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Login Email</p>
                  <p className="text-white font-semibold mt-0.5">{company.admin_email}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Phone</p>
                  <p className="text-white font-semibold mt-0.5">{company.phone || 'N/A'}</p>
                </div>
              </div>

              {/* Password Reset Form */}
              <form onSubmit={handleResetPassword} className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Set New Temporary Password for Client Admin
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={resettingPassword || !newPassword}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
                >
                  {resettingPassword ? 'Resetting...' : 'Reset Admin Password'}
                </button>
              </form>
            </div>

            {/* Footer with Delete Account */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleDeleteCompany}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/15 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Company Account & Data</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
