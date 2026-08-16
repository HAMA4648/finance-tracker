'use client'
import React, { useState } from 'react';
import { addLoanRepayment } from '@/app/actions';

export default function LoanTracker({ loans, cardholders }: { loans: any[], cardholders: any[] }) {
  const [repayModal, setRepayModal] = useState<string | null>(null);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
      <h2 className="text-xl font-semibold text-slate-900 mb-6">Micro-Loans</h2>
      <div className="flex flex-col gap-4">
        {loans.map(loan => {
          const owner = cardholders.find(c => c.id === loan.cardholder_id);
          const percent = Math.min(100, Math.round((loan.amount_repaid / loan.amount_loaned) * 100));
          const isActive = loan.status === 'active';

          return (
            <div key={loan.id} className="p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-medium text-slate-900">{owner?.name}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {isActive ? 'Active' : 'Paid Off'}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{loan.notes || 'No notes'}</p>
              </div>
              
              <div className="flex-1 max-w-xs w-full">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">${loan.amount_repaid.toFixed(2)} repaid</span>
                  <span className="text-slate-900 font-medium">${loan.amount_loaned.toFixed(2)} total</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${isActive ? 'bg-amber-400' : 'bg-green-500'}`} style={{ width: `${percent}%` }}></div>
                </div>
              </div>

              {isActive && (
                <div className="flex gap-2">
                  <button onClick={() => setRepayModal(loan.id)} className="text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
                    Repay
                  </button>
                </div>
              )}

              {repayModal === loan.id && (
                <div className="absolute right-0 top-0 bottom-0 bg-white/95 backdrop-blur-sm p-4 rounded-xl z-10 flex items-center border border-slate-200 shadow-lg min-w-[300px]">
                  <form action={addLoanRepayment} className="flex gap-2 w-full">
                    <input type="hidden" name="loan_id" value={loan.id} />
                    <input type="number" name="amount" step="0.01" placeholder="Amount" className="p-2 border border-slate-200 rounded-lg text-sm flex-1 text-black" required />
                    <button type="submit" onClick={() => setTimeout(() => setRepayModal(null), 100)} className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg">Log</button>
                    <button type="button" onClick={() => setRepayModal(null)} className="bg-slate-100 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg">X</button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
        {loans.length === 0 && <p className="text-slate-500 text-sm">No active loans.</p>}
      </div>
    </div>
  );
}
