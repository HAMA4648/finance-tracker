'use client'

import React, { useState } from 'react';
import { Transaction } from '@/types/database';
import { formatCurrency } from '@/lib/format';
import { deleteTransaction } from '@/app/actions';

export default function TransactionFeed({ transactions, cards }: { transactions: Transaction[], cards: any[] }) {
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDeleteTransaction = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await deleteTransaction(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setDeletingTx(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative">
      <h2 className="text-xl font-semibold text-slate-900 mb-6">Recent Transactions</h2>

      {/* Delete Confirmation Modal */}
      {deletingTx && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Transaction</h3>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to delete this transaction? The card balance will be adjusted accordingly.</p>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm text-left">
                {errorMsg}
              </div>
            )}
            <form action={handleDeleteTransaction} className="flex gap-3">
              <input type="hidden" name="transaction_id" value={deletingTx.id} />
              <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg cursor-pointer">Delete</button>
              <button type="button" onClick={() => setDeletingTx(null)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 cursor-pointer">Cancel</button>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-sm text-slate-500">
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Card</th>
              <th className="pb-3 font-medium">Description</th>
              <th className="pb-3 font-medium text-right">Amount</th>
              <th className="pb-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => {
              const card = cards.find(c => c.id === tx.card_id);
              const isExpense = tx.type === 'expense';
              const currency = tx.currency || card?.currency || 'USD';
              return (
                <tr key={tx.id} className="border-b border-slate-50/50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 text-sm text-slate-500">
                    {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-4 text-sm font-medium text-slate-900">
                    {card?.card_name || 'Unknown'}
                  </td>
                  <td className="py-4 text-sm text-slate-600">
                    {tx.description || '-'}
                  </td>
                  <td className={`py-4 text-sm font-medium text-right ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                    {isExpense ? '-' : '+'}{formatCurrency(tx.amount, currency)}
                  </td>
                  <td className="py-4 text-sm text-right">
                    <button
                      onClick={() => { setErrorMsg(null); setDeletingTx(tx); }}
                      className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                      title="Delete Transaction"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-sm text-slate-500 text-center">No recent transactions</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
