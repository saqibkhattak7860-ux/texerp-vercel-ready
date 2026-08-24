import React from 'react';

const colorStyles = {
  emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  rose: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  indigo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  slate: 'bg-slate-700/40 text-slate-300 border-slate-600/40'
};

const statusColorMap = {
  // Payment
  Paid: 'emerald',
  Partial: 'amber',
  Unpaid: 'rose',
  Received: 'emerald',
  
  // Printing / Production / Sales Statuses
  Draft: 'slate',
  Sent: 'blue',
  'Partial Received': 'amber',
  Completed: 'emerald',
  Cancelled: 'rose',
  Planned: 'slate',
  'In Progress': 'purple',
  Confirmed: 'blue',
  'In Production': 'purple',
  Ready: 'cyan',
  'Partially Delivered': 'amber',
  Delivered: 'emerald',
  
  // Categories
  'Raw Fabric': 'blue',
  'Printed Fabric': 'purple',
  'Thread': 'indigo',
  'Buttons': 'amber',
  'Zipper': 'cyan',
  'Accessories': 'slate',
  'Packing Material': 'rose',
  'Finished Products': 'emerald'
};

export default function Badge({ children, variant, color, size = 'sm', className = '' }) {
  const resolvedColor = color || (variant && statusColorMap[variant]) || 'slate';
  const colorClass = colorStyles[resolvedColor] || colorStyles.slate;
  
  const sizeClasses = {
    xs: 'text-[10px] px-2 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5'
  };

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-full ${sizeClasses[size]} ${colorClass} ${className}`}
    >
      {children || variant}
    </span>
  );
}
