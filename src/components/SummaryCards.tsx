import React from 'react';

interface Props {
  totalBalance: number;
  activeLoans: number;
  cardsCount: number;
}

export default function SummaryCards({ totalBalance, activeLoans, cardsCount }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
        <h3 className="text-sm font-medium text-slate-500 mb-1">Total System Balance</h3>
        <p className={`text-3xl font-semibold tracking-tight ${totalBalance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
          ${totalBalance.toFixed(2)}
        </p>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
        <h3 className="text-sm font-medium text-slate-500 mb-1">Total Active Loans</h3>
        <p className="text-3xl font-semibold tracking-tight text-slate-900">
          ${activeLoans.toFixed(2)}
        </p>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
        <h3 className="text-sm font-medium text-slate-500 mb-1">Active Cards</h3>
        <p className="text-3xl font-semibold tracking-tight text-slate-900">
          {cardsCount}
        </p>
      </div>
    </div>
  );
}
