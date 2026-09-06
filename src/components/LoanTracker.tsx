'use client'
import React, { useState } from 'react';
import { addLoanRepayment, issueLoan } from '@/app/actions';
import { formatCurrency } from '@/lib/format';

export default function LoanTracker({ loans, cardholders }: { loans: any[], cardholders: any[] }) {
  const [repayModal, setRepayModal] = useState<string | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleIssueLoan = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await issueLoan(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setShowIssueModal(false);
    }
  };

  const handleRepay = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await addLoanRepayment(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setRepayModal(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Micro-Loans</h2>
        <button onClick={() => { setErrorMsg(null); setShowIssueModal(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          + Issue Loan
        </button>
      </div>

      {showIssueModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Issue New Loan</h3>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}
            <form action={handleIssueLoan} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Borrower Name</label>
                <input type="text" name="borrower_name" placeholder="e.g. Jane Smith" className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount Loaned</label>
                  <input type="number" name="amount" step="0.01" placeholder="e.g. 50.00" className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                  <select name="currency" defaultValue="USD" className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black bg-white">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="IQD">IQD (د.ع)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                <input type="text" name="notes" placeholder="e.g. Lunch money" className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black" />
              </div>
              <div className="flex gap-3 mt-4">
                <button type="submit" className="flex-1 bg-slate-900 text-white font-medium py-2 rounded-lg">Issue Loan</button>
                <button type="button" onClick={() => setShowIssueModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {loans.map(loan => {
          const owner = cardholders.find(c => c.id === loan.cardholder_id);
          const loanCurrency = loan.currency || 'USD';
          const amountLoaned = Number(loan.amount_loaned) || 0;
          const amountRepaid = Number(loan.amount_repaid) || 0;
          const percent = amountLoaned > 0 ? Math.min(100, Math.round((amountRepaid / amountLoaned) * 100)) : 100;
          const isActive = loan.status === 'active';

          return (
            <div key={loan.id} className="p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-medium text-slate-900">{owner?.name}</h3>
                  <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {loanCurrency}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {isActive ? 'Active' : 'Paid Off'}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{loan.notes || 'No notes'}</p>
              </div>
              
              <div className="flex-1 max-w-xs w-full">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{formatCurrency(amountRepaid, loanCurrency)} repaid</span>
                  <span className="text-slate-900 font-medium">{formatCurrency(amountLoaned, loanCurrency)} total</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${isActive ? 'bg-amber-400' : 'bg-green-500'}`} style={{ width: `${percent}%` }}></div>
                </div>
              </div>

              {isActive && (
                <div className="flex gap-2 relative">
                  <button onClick={() => { setErrorMsg(null); setRepayModal(loan.id); }} className="text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
                    Repay
                  </button>
                  
                  {repayModal === loan.id && (
                    <div className="absolute right-0 top-0 bottom-0 bg-white/95 backdrop-blur-sm p-2 rounded-xl z-10 flex items-center border border-slate-200 shadow-lg min-w-[260px]">
                      <form action={handleRepay} className="flex gap-2 w-full">
                        <input type="hidden" name="loan_id" value={loan.id} />
                        <input type="number" name="amount" step="0.01" placeholder="Amount" className="p-2 border border-slate-200 rounded-lg text-sm flex-1 text-black min-w-0" required />
                        <button type="submit" className="bg-slate-900 text-white text-sm font-medium px-3 py-2 rounded-lg">Log</button>
                        <button type="button" onClick={() => setRepayModal(null)} className="bg-slate-100 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg">X</button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {loans.length === 0 && <p className="text-slate-500 text-sm">No loans found. Issue one to get started!</p>}
      </div>
    </div>
  );
}
