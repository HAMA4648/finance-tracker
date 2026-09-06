import React from 'react';
import { Transaction } from '@/types/database';
import { formatCurrency } from '@/lib/format';

export default function TransactionFeed({ transactions, cards }: { transactions: Transaction[], cards: any[] }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900 mb-6">Recent Transactions</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-sm text-slate-500">
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Card</th>
              <th className="pb-3 font-medium">Description</th>
              <th className="pb-3 font-medium text-right">Amount</th>
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
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-sm text-slate-500 text-center">No recent transactions</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
