'use client'

import React, { useState } from 'react';
import { Transfer } from '@/types/database';
import { addTransfer } from '@/app/actions';
import { formatCurrency } from '@/lib/format';

interface Props {
  provider: 'moneygram' | 'western_union';
  title: string;
  transfers: Transfer[];
}

export default function TransferView({ provider, title, transfers }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredTransfers = transfers.filter(
    t => (t.provider || '').toLowerCase() === provider.toLowerCase()
  );

  const totals = { USD: 0, EUR: 0, IQD: 0 };
  filteredTransfers.forEach(t => {
    const cur = (t.currency || 'USD').toUpperCase();
    const amt = Number(t.amount) || 0;
    if (cur in totals) {
      totals[cur as keyof typeof totals] += amt;
    } else {
      totals.USD += amt;
    }
  });

  const handleAddTransfer = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await addTransfer(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setShowModal(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
          <p className="text-slate-500 text-sm mt-0.5">Track and manage outgoing {title} transfers</p>
        </div>
        <button
          onClick={() => { setErrorMsg(null); setShowModal(true); }}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          + Log Transfer
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Spent (USD)</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totals.USD, 'USD')}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Spent (EUR)</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totals.EUR, 'EUR')}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Spent (IQD)</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totals.IQD, 'IQD')}</p>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Log {title} Transfer</h3>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}
            <form action={handleAddTransfer} className="flex flex-col gap-4">
              <input type="hidden" name="provider" value={provider} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <input type="number" name="amount" step="0.01" placeholder="0.00" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                  <select name="currency" defaultValue="USD" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black bg-white">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="IQD">IQD (د.ع)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Name (optional)</label>
                <input type="text" name="recipient_name" placeholder="e.g. John Smith" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                <input type="text" name="notes" placeholder="e.g. Family support" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black" />
              </div>
              <div className="flex gap-3 mt-4">
                <button type="submit" className="flex-1 bg-slate-900 text-white font-medium py-2.5 rounded-lg cursor-pointer">Save Transfer</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-200 cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Transfer History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-sm text-slate-500">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Recipient</th>
                <th className="pb-3 font-medium">Notes</th>
                <th className="pb-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.map(t => (
                <tr key={t.id} className="border-b border-slate-50/50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 text-sm text-slate-500">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-4 text-sm font-medium text-slate-900">
                    {t.recipient_name || '-'}
                  </td>
                  <td className="py-4 text-sm text-slate-600">
                    {t.notes || '-'}
                  </td>
                  <td className="py-4 text-sm font-bold text-slate-900 text-right">
                    {formatCurrency(t.amount, t.currency || 'USD')}
                  </td>
                </tr>
              ))}
              {filteredTransfers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-sm text-slate-500 text-center">No transfers logged yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
