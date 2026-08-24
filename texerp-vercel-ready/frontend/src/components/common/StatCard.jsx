import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue', // 'blue', 'emerald', 'purple', 'amber', 'rose'
  prefix = '',
  suffix = '',
  loading = false
}) {
  const colorGradients = {
    blue: 'from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/30',
    emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/30',
    purple: 'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/30',
    amber: 'from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/30',
    rose: 'from-rose-500/20 to-rose-600/5 text-rose-400 border-rose-500/30'
  };

  const iconColors = {
    blue: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    rose: 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-slate-900/80 backdrop-blur-md p-5 transition-all duration-300 hover:border-slate-600 hover:shadow-lg ${colorGradients[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-1">
            {loading ? (
              <div className="h-8 w-24 bg-slate-700/50 animate-pulse rounded"></div>
            ) : (
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {prefix}
                {typeof value === 'number' ? value.toLocaleString() : value}
                {suffix}
              </h3>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${iconColors[color]} shadow-inner`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span className={trend.isPositive ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
          <span className="text-slate-400">{trend.label || 'vs last month'}</span>
        </div>
      )}
    </div>
  );
}
