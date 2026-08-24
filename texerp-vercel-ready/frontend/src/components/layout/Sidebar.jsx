import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  Printer,
  Factory,
  Users,
  Building2,
  Receipt,
  CreditCard,
  TrendingDown,
  LineChart,
  FileSpreadsheet,
  History,
  Shirt,
  Truck,
  Layers,
  ChevronRight,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Suppliers', href: '/suppliers', icon: Building2 },
    { name: 'Items Catalog', href: '/items', icon: Layers },
    { name: 'Inventory & Stock', href: '/inventory', icon: Boxes },
    { name: 'Purchases', href: '/purchases', icon: ShoppingCart },
    { name: 'Printing Hub', href: '/printing', icon: Printer },
    { name: 'Production & BOM', href: '/production', icon: Factory },
    { name: 'Finished Products', href: '/finished-products', icon: Shirt },
    { name: 'Sales Orders', href: '/sales', icon: Truck },
    { name: 'Delivery Challans', href: '/deliveries', icon: Truck },
    { name: 'Invoices', href: '/invoices', icon: Receipt },
    { name: 'Payments & Ledger', href: '/payments', icon: CreditCard },
    { name: 'Expenses', href: '/expenses', icon: TrendingDown },
    { name: 'Profit & Loss', href: '/profit-loss', icon: LineChart },
    { name: 'Reports Center', href: '/reports', icon: FileSpreadsheet },
    { name: 'Company Settings', href: '/company-settings', icon: Settings },
    { name: 'Audit Logs', href: '/audit-logs', icon: History }
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
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 text-white font-bold text-lg shadow-lg shadow-brand-500/25">
            {user?.logo_url ? (
              <img src={user.logo_url} alt={`${user.company_name || 'Company'} logo`} className="h-full w-full object-contain bg-white p-0.5" />
            ) : (
              'T'
            )}
          </div>
          <div className="truncate">
            <h1 className="font-extrabold text-white text-sm tracking-tight truncate">{user?.company_name || 'TexERP'}</h1>
            <p className="text-[10px] uppercase font-bold tracking-wider text-brand-400">Enterprise ERP</p>
          </div>
        </div>

        {/* User Role Tag Pill */}
        <div className="px-4 py-3 border-b border-slate-800/40 bg-slate-900/40">
          <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/40">
            <span className="text-slate-300 font-medium truncate mr-2">{user?.name || 'Company Admin'}</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-500/20 text-brand-400 border border-brand-500/30 whitespace-nowrap">
              Admin
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => onClose && onClose()}
                className={`group flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-900/30 font-semibold'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
              </NavLink>
            );
          })}
        </div>

        {/* System Status Footer */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-900/40 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span>ERP Database Online</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">{user?.company_currency || 'PKR'}</span>
        </div>
      </aside>
    </>
  );
}
