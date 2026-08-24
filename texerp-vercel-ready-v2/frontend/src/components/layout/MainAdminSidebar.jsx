import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  UserPlus,
  CheckCircle2,
  XCircle,
  Settings,
  History,
  Shield,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MainAdminSidebar({ isOpen, onClose, onOpenCreateModal }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/main-admin', icon: LayoutDashboard },
    { name: 'Client Accounts', href: '/main-admin/companies', icon: Building2 },
    { name: 'Active Accounts', href: '/main-admin/companies?status=Active', icon: CheckCircle2 },
    { name: 'Inactive Accounts', href: '/main-admin/companies?status=Inactive', icon: XCircle },
    { name: 'Audit Logs', href: '/main-admin/audit-logs', icon: History },
    { name: 'System Settings', href: '/main-admin/settings', icon: Settings }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Shell */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 border-r border-slate-800/80 bg-slate-950/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-800/80">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white font-bold text-lg shadow-lg shadow-amber-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight">TEX-ERP</h1>
            <p className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Master SaaS Admin</p>
          </div>
        </div>

        {/* User Pill */}
        <div className="px-4 py-3 border-b border-slate-800/40 bg-slate-900/40">
          <div className="flex items-center justify-between text-xs px-2.5 py-2 rounded-xl bg-slate-800/60 border border-slate-700/40">
            <div className="truncate mr-2">
              <p className="text-white font-semibold text-xs truncate">{user?.name || 'Master Admin'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 whitespace-nowrap">
              Master
            </span>
          </div>
        </div>

        {/* Quick Action Button */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => onOpenCreateModal && onOpenCreateModal()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Client Account</span>
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname + location.search === item.href || (item.href === '/main-admin' && location.pathname === '/main-admin' && !location.search);

            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => onClose && onClose()}
                className={`group flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 text-amber-300 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-amber-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-amber-400" />}
              </NavLink>
            );
          })}
        </div>

        {/* Sign Out Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Master Admin</span>
          </button>
        </div>
      </aside>
    </>
  );
}
