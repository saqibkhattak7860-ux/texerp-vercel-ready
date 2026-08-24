import React from 'react';
import { Printer, Download, Sparkles } from 'lucide-react';
import Badge from './Badge';

export default function PrintableInvoice({ invoice, onClose }) {
  if (!invoice) return null;

  const company = invoice.company || {};
  const companyInitial = company.name?.trim()?.[0]?.toUpperCase() || 'C';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto shadow-2xl space-y-6">
      {/* Actions Toolbar (hidden on print) */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 no-print">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Invoice Preview</span>
          <Badge variant={invoice.payment_status} />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-brand-600/30 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Invoice Document (Print Friendly) */}
      <div className="bg-white text-slate-900 p-8 sm:p-10 rounded-xl shadow-md space-y-8 font-sans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              {company.logo_url ? (
                <img src={company.logo_url} alt={`${company.name || 'Company'} logo`} className="h-10 w-10 rounded-lg object-contain border border-slate-200 p-1" />
              ) : (
                <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                  {companyInitial}
                </div>
              )}
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{company.name || 'Company'}</h1>
            </div>
            {company.address && <p className="text-xs text-slate-500 mt-1">{company.address}</p>}
            {(company.phone || company.tax_number) && (
              <p className="text-xs text-slate-500">
                {company.phone && `Phone: ${company.phone}`}
                {company.phone && company.tax_number && ' | '}
                {company.tax_number && `Tax No: ${company.tax_number}`}
              </p>
            )}
          </div>

          <div className="text-left sm:text-right">
            <h2 className="text-2xl font-black tracking-wider text-blue-600 uppercase">INVOICE</h2>
            <p className="text-sm font-semibold text-slate-800 mt-1">{invoice.invoice_number}</p>
            <p className="text-xs text-slate-500">Date: {invoice.invoice_date}</p>
            {invoice.due_date && <p className="text-xs text-slate-500">Due Date: {invoice.due_date}</p>}
          </div>
        </div>

        {/* Bill To Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Billed To:</span>
            <h4 className="font-bold text-slate-900 text-base mt-1">{invoice.customer_name}</h4>
            <p className="text-slate-600 font-medium">{invoice.customer_company}</p>
            <p className="text-slate-500 text-xs mt-1">{invoice.customer_address || 'Pakistan'}</p>
            <p className="text-slate-500 text-xs">Phone: {invoice.customer_phone || '—'}</p>
          </div>

          <div className="sm:text-right flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Order Reference:</span>
              <p className="text-slate-700 font-semibold text-sm mt-1">{invoice.order_number || 'Direct Invoice'}</p>
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
              <span className={`ml-2 inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                invoice.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {invoice.payment_status}
              </span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs font-bold text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Product Description</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Rate</th>
                <th className="py-3 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td className="py-3 px-4 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium">
                      {it.product_name}
                      <span className="block text-xs text-slate-500 font-normal">{it.product_code}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold">{parseFloat(it.quantity).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono">Rs. {parseFloat(it.rate).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">Rs. {parseFloat(it.total_amount).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-slate-400">No items listed.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <div className="w-full sm:w-72 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">Rs. {parseFloat(invoice.subtotal || invoice.total_amount).toLocaleString()}</span>
            </div>
            {parseFloat(invoice.discount || 0) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span className="font-mono">- Rs. {parseFloat(invoice.discount).toLocaleString()}</span>
              </div>
            )}
            {parseFloat(invoice.tax || 0) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Tax:</span>
                <span className="font-mono">+ Rs. {parseFloat(invoice.tax).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-300 pt-2">
              <span>Total Amount:</span>
              <span className="font-mono text-blue-600">Rs. {parseFloat(invoice.total_amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1 text-xs">
              <span>Paid Amount:</span>
              <span className="font-mono font-bold text-emerald-600">Rs. {parseFloat(invoice.paid_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold text-sm bg-slate-100 p-2 rounded">
              <span>Due Balance:</span>
              <span className="font-mono text-rose-600">Rs. {parseFloat(invoice.due_amount || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="border-t border-slate-200 pt-6 text-xs text-slate-500 space-y-1">
          {(company.notes || invoice.notes) && <p className="whitespace-pre-line">{company.notes || invoice.notes}</p>}
          <p className="italic pt-2 text-center text-slate-400">Thank you for your business!</p>
        </div>
      </div>
    </div>
  );
}
