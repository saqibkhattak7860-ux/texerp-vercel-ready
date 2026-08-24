import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to perform this action? This cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger' // 'danger', 'warning', 'info'
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center space-y-4 py-2">
        <div
          className={`p-3 rounded-full ${
            type === 'danger'
              ? 'bg-rose-500/20 text-rose-400'
              : type === 'warning'
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-blue-500/20 text-blue-400'
          }`}
        >
          <AlertTriangle className="w-8 h-8" />
        </div>
        <p className="text-sm text-slate-300">{message}</p>

        <div className="flex items-center justify-center gap-3 w-full pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-lg transition-all ${
              type === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30'
                : 'bg-brand-600 hover:bg-brand-500 shadow-brand-900/30'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
