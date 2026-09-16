'use client'

import React, { useState } from 'react';
import { Transfer } from '@/types/database';
import { addTransfer, updateTransfer, deleteTransfer } from '@/app/actions';
import { formatCurrency } from '@/lib/format';

interface Props {
  provider: 'moneygram' | 'western_union';
  title: string;
  transfers: Transfer[];
}

export default function TransferView({ provider, title, transfers }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [deletingTransfer, setDeletingTransfer] = useState<Transfer | null>(null);
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

  const handleUpdateTransfer = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await updateTransfer(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setEditingTransfer(null);
    }
  };

  const handleDeleteTransfer = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await deleteTransfer(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setDeletingTransfer(null);
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

      {/* Log Transfer Modal */}
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

      {/* Edit Transfer Modal */}
      {editingTransfer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit {title} Transfer</h3>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}
            <form action={handleUpdateTransfer} className="flex flex-col gap-4">
              <input type="hidden" name="transfer_id" value={editingTransfer.id} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    defaultValue={editingTransfer.amount}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                  <select
                    name="currency"
                    defaultValue={editingTransfer.currency || 'USD'}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black bg-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="IQD">IQD (د.ع)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Name (optional)</label>
                <input
                  type="text"
                  name="recipient_name"
                  defaultValue={editingTransfer.recipient_name || ''}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  name="notes"
                  defaultValue={editingTransfer.notes || ''}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button type="submit" className="flex-1 bg-slate-900 text-white font-medium py-2.5 rounded-lg cursor-pointer">Save Changes</button>
                <button type="button" onClick={() => setEditingTransfer(null)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-200 cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Transfer Modal */}
      {deletingTransfer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Transfer</h3>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to delete this transfer? This action cannot be undone.</p>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm text-left">
                {errorMsg}
              </div>
            )}
            <form action={handleDeleteTransfer} className="flex gap-3">
              <input type="hidden" name="transfer_id" value={deletingTransfer.id} />
              <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg cursor-pointer">Delete</button>
              <button type="button" onClick={() => setDeletingTransfer(null)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 cursor-pointer">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* History Table */}
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
                <th className="pb-3 font-medium text-right">Actions</th>
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
                  <td className="py-4 text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setErrorMsg(null); setEditingTransfer(t); }}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors cursor-pointer"
                        title="Edit Transfer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setErrorMsg(null); setDeletingTransfer(t); }}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                        title="Delete Transfer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTransfers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-sm text-slate-500 text-center">No transfers logged yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
