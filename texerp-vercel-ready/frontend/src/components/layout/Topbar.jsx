import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, LogOut, Settings, User, Building2, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  const isMainAdmin = user?.role_name === 'Main Admin';

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 sm:px-8 backdrop-blur-xl">
      {/* Left: Mobile Toggle & Quick Info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2.5 text-xs text-slate-300">
          <span className={`h-2.5 w-2.5 rounded-full ${isMainAdmin ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`}></span>
          <span className="font-semibold text-white">
            {isMainAdmin ? 'Master SaaS Administration' : (user?.company_name || 'Textile Management Portal')}
          </span>
          {!isMainAdmin && user?.company_currency && (
            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
              {user.company_currency}
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications Popover (For Client Admin) */}
        {!isMainAdmin && (
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-xl p-2.5 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors border border-transparent hover:border-slate-800"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-md shadow-rose-900">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-700/80 bg-slate-900 p-4 shadow-2xl backdrop-blur-xl z-50">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">System Alerts</h4>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-brand-400 hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="mt-3 max-h-72 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">No active notifications.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                          n.is_read
                            ? 'bg-slate-900/40 border-slate-800/60 text-slate-400'
                            : 'bg-slate-800/80 border-slate-700 text-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-white">{n.title}</span>
                          {!n.is_read && <span className="h-2 w-2 rounded-full bg-brand-400 shrink-0"></span>}
                        </div>
                        <p className="mt-1 text-slate-300 line-clamp-2">{n.message}</p>
                        <span className="mt-2 block text-[10px] text-slate-400">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 p-1.5 pr-3 hover:border-slate-700 transition-all cursor-pointer"
          >
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center overflow-hidden text-white font-bold text-sm shadow-md ${
              isMainAdmin ? 'bg-gradient-to-tr from-amber-500 to-rose-500' : 'bg-gradient-to-tr from-brand-600 to-cyan-500'
            }`}>
              {isMainAdmin ? <Shield className="w-4 h-4" /> : user?.logo_url ? (
                <img src={user.logo_url} alt="Company logo" className="h-full w-full object-contain bg-white p-0.5" />
              ) : (user?.name?.[0] || 'A')}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <p className="font-semibold text-slate-200 leading-tight">{user?.name}</p>
              <p className="text-[10px] text-slate-400">{user?.role_name}</p>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-700/80 bg-slate-900 p-2 shadow-2xl backdrop-blur-xl z-50">
              <div className="px-3 py-2 border-b border-slate-800 mb-1">
                <p className="text-xs font-bold text-white">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>

              {!isMainAdmin && (
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/company-settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors text-left"
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Company Settings</span>
                </button>
              )}

              {isMainAdmin && (
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/main-admin/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Master Settings</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate(isMainAdmin ? '/main-admin/audit-logs' : '/audit-logs');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors text-left"
              >
                <User className="w-4 h-4 text-slate-400" />
                <span>Audit Trail</span>
              </button>

              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors mt-1 text-left"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
