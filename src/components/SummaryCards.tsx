import React from 'react';
import { formatCurrency } from '@/lib/format';

interface Props {
  balancesByCurrency: { USD: number; EUR: number; IQD: number };
  activeLoansByCurrency: { USD: number; EUR: number; IQD: number };
  moneygramByCurrency?: { USD: number; EUR: number; IQD: number };
  westernUnionByCurrency?: { USD: number; EUR: number; IQD: number };
  cardsCount: number;
}

export default function SummaryCards({
  balancesByCurrency,
  activeLoansByCurrency,
  moneygramByCurrency = { USD: 0, EUR: 0, IQD: 0 },
  westernUnionByCurrency = { USD: 0, EUR: 0, IQD: 0 },
  cardsCount
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total System Balance</h3>
        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-400 font-semibold">USD</span>
            <span className={`text-base font-bold tracking-tight ${balancesByCurrency.USD < 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {formatCurrency(balancesByCurrency.USD, 'USD')}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-400 font-semibold">EUR</span>
            <span className={`text-base font-bold tracking-tight ${balancesByCurrency.EUR < 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {formatCurrency(balancesByCurrency.EUR, 'EUR')}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-400 font-semibold">IQD</span>
            <span className={`text-base font-bold tracking-tight ${balancesByCurrency.IQD < 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {formatCurrency(balancesByCurrency.IQD, 'IQD')}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Active Loans</h3>
        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-400 font-semibold">USD</span>
            <span className="text-base font-bold tracking-tight text-slate-900">
              {formatCurrency(activeLoansByCurrency.USD, 'USD')}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-400 font-semibold">EUR</span>
            <span className="text-base font-bold tracking-tight text-slate-900">
              {formatCurrency(activeLoansByCurrency.EUR, 'EUR')}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-400 font-semibold">IQD</span>
            <span className="text-base font-bold tracking-tight text-slate-900">
              {formatCurrency(activeLoansByCurrency.IQD, 'IQD')}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Moneygram Spent</h3>
        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-400 font-semibold">USD</span>
            <span className="text-base font-bold tracking-tight text-slate-900">
              {formatCurrency(moneygramByCurrency.USD, 'USD')}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-400 font-semibold">EUR</span>
            <span className="text-base font-bold tracking-tight text-slate-900">
              {formatCurrency(moneygramByCurrency.EUR, 'EUR')}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-400 font-semibold">IQD</span>
            <span className="text-base font-bold tracking-tight text-slate-900">
              {formatCurrency(moneygramByCurrency.IQD, 'IQD')}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Western Union Spent</h3>
        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-400 font-semibold">USD</span>
            <span className="text-base font-bold tracking-tight text-slate-900">
              {formatCurrency(westernUnionByCurrency.USD, 'USD')}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-400 font-semibold">EUR</span>
            <span className="text-base font-bold tracking-tight text-slate-900">
              {formatCurrency(westernUnionByCurrency.EUR, 'EUR')}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-400 font-semibold">IQD</span>
            <span className="text-base font-bold tracking-tight text-slate-900">
              {formatCurrency(westernUnionByCurrency.IQD, 'IQD')}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Active Cards</h3>
        <p className="text-4xl font-extrabold tracking-tight text-slate-900">
          {cardsCount}
        </p>
      </div>
    </div>
  );
}
