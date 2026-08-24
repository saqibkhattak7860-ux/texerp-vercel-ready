import React from 'react';
import { Shield, Server, Database, Lock, Cpu, Globe, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MainAdminSettings() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">System Settings & Architecture</h1>
        <p className="text-xs text-slate-400">Master SaaS Administrator configuration and platform health monitor.</p>
      </div>

      {/* Main Admin Identity Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/30 border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Master SaaS Administrator Profile</h3>
            <p className="text-xs text-slate-400">Owner role with global multi-tenant governance capabilities.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <p className="text-slate-400 font-medium">Administrator Name</p>
            <p className="text-white font-bold text-sm mt-0.5">{user?.name || 'SaaS Main Administrator'}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <p className="text-slate-400 font-medium">Master Email</p>
            <p className="text-white font-bold text-sm mt-0.5">{user?.email || 'mainadmin@textile.com'}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <p className="text-slate-400 font-medium">Role System</p>
            <p className="text-amber-400 font-bold text-sm mt-0.5">Main Admin (Master)</p>
          </div>
        </div>
      </div>

      {/* Architecture & Engine Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database & Multi-Tenant Engine */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Relational PostgreSQL Engine</h4>
              <p className="text-[11px] text-slate-400">Multi-tenant row-level company isolation</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <span className="text-slate-400">Database Engine:</span>
              <span className="font-semibold text-white">PostgreSQL 16.0 Multi-Tenant</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <span className="text-slate-400">Data Isolation Strategy:</span>
              <span className="font-semibold text-emerald-400">Strict Foreign Key (company_id)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <span className="text-slate-400">Negative Stock Prevention:</span>
              <span className="font-semibold text-emerald-400">Guarded by StockEngine</span>
            </div>
          </div>
        </div>

        {/* Security & Access Control */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Security & Token Governance</h4>
              <p className="text-[11px] text-slate-400">JWT & Password Hashing Policy</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <span className="text-slate-400">Token Protocol:</span>
              <span className="font-semibold text-white">JSON Web Token (JWT Bearer)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <span className="text-slate-400">Password Hashing:</span>
              <span className="font-semibold text-white">Bcrypt Salt (10 Rounds)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <span className="text-slate-400">Instant Suspension Killswitch:</span>
              <span className="font-semibold text-emerald-400">Active on Every Request</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
