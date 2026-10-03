'use client'

import React, { useState } from 'react';
import SummaryCards from '@/components/SummaryCards';
import CardsOverview from '@/components/CardsOverview';
import LoanTracker from '@/components/LoanTracker';
import TransactionFeed from '@/components/TransactionFeed';
import TransferView from '@/components/TransferView';
import PersonalExpenseView from '@/components/PersonalExpenseView';
import PersonalRevenueView from '@/components/PersonalRevenueView';
import RefreshButton from '@/components/RefreshButton';
import { logoutAction, triggerBackupAction } from '@/app/actions';
import { Card, Cardholder, Loan, Transaction, Transfer, PersonalExpense, PersonalRevenue, CardTick } from '@/types/database';

interface Props {
  cards: Card[];
  cardholders: Cardholder[];
  loans: Loan[];
  transactions: Transaction[];
  transfers: Transfer[];
  personalExpenses?: PersonalExpense[];
  personalRevenues?: PersonalRevenue[];
  cardTicks?: CardTick[];
}

type TabType = 'home' | 'moneygram' | 'western_union' | 'cards' | 'loans' | 'personal' | 'personal_revenue';

export default function DashboardTabs({
  cards,
  cardholders,
  loans,
  transactions,
  transfers,
  personalExpenses = [],
  personalRevenues = [],
  cardTicks = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [backupMessage, setBackupMessage] = useState('');

  async function handleInstantBackup() {
    setBackupStatus('loading');
    setBackupMessage('');
    try {
      const result = await triggerBackupAction();
      if (result.error) {
        setBackupStatus('error');
        setBackupMessage(result.error);
      } else {
        setBackupStatus('success');
        setBackupMessage(`Backup saved: ${result.file ?? ''}`);
      }
    } catch {
      setBackupStatus('error');
      setBackupMessage('Unexpected error during backup.');
    }
    setTimeout(() => setBackupStatus('idle'), 5000);
  }

  const balancesByCurrency = { USD: 0, EUR: 0, IQD: 0 };
  cards.forEach(card => {
    const cur = (card.currency || 'USD').toUpperCase();
    const bal = Number(card.balance) || 0;
    if (cur in balancesByCurrency) {
      balancesByCurrency[cur as keyof typeof balancesByCurrency] += bal;
    } else {
      balancesByCurrency.USD += bal;
    }
  });

  const activeLoansByCurrency = { USD: 0, EUR: 0, IQD: 0 };
  loans.filter(l => l.status === 'active').forEach(loan => {
    const cur = (loan.currency || 'USD').toUpperCase();
    const remaining = (Number(loan.amount_loaned) || 0) - (Number(loan.amount_repaid) || 0);
    if (cur in activeLoansByCurrency) {
      activeLoansByCurrency[cur as keyof typeof activeLoansByCurrency] += remaining;
    } else {
      activeLoansByCurrency.USD += remaining;
    }
  });

  const moneygramByCurrency = { USD: 0, EUR: 0, IQD: 0 };
  transfers.filter(t => (t.provider || '').toLowerCase() === 'moneygram').forEach(t => {
    const cur = (t.currency || 'USD').toUpperCase();
    const amt = Number(t.amount) || 0;
    if (cur in moneygramByCurrency) {
      moneygramByCurrency[cur as keyof typeof moneygramByCurrency] += amt;
    } else {
      moneygramByCurrency.USD += amt;
    }
  });

  const westernUnionByCurrency = { USD: 0, EUR: 0, IQD: 0 };
  transfers.filter(t => (t.provider || '').toLowerCase() === 'western_union').forEach(t => {
    const cur = (t.currency || 'USD').toUpperCase();
    const amt = Number(t.amount) || 0;
    if (cur in westernUnionByCurrency) {
      westernUnionByCurrency[cur as keyof typeof westernUnionByCurrency] += amt;
    } else {
      westernUnionByCurrency.USD += amt;
    }
  });

  // Calculate Personal Spent (This Month)
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const personalSpentThisMonthByCurrency = { USD: 0, EUR: 0, IQD: 0 };
  personalExpenses.forEach(e => {
    const spentMonthKey = (e.spent_at || e.created_at || '').slice(0, 7);
    if (spentMonthKey === currentMonthKey) {
      const cur = (e.currency || 'USD').toUpperCase();
      const amt = Number(e.amount) || 0;
      if (cur in personalSpentThisMonthByCurrency) {
        personalSpentThisMonthByCurrency[cur as keyof typeof personalSpentThisMonthByCurrency] += amt;
      } else {
        personalSpentThisMonthByCurrency.USD += amt;
      }
    }
  });

  // Calculate Personal Revenue (This Month)
  const personalRevenueThisMonthByCurrency = { USD: 0, EUR: 0, IQD: 0 };
  personalRevenues.forEach(r => {
    const receivedMonthKey = (r.received_at || r.created_at || '').slice(0, 7);
    if (receivedMonthKey === currentMonthKey) {
      const cur = (r.currency || 'USD').toUpperCase();
      const amt = Number(r.amount) || 0;
      if (cur in personalRevenueThisMonthByCurrency) {
        personalRevenueThisMonthByCurrency[cur as keyof typeof personalRevenueThisMonthByCurrency] += amt;
      } else {
        personalRevenueThisMonthByCurrency.USD += amt;
      }
    }
  });

  const cardsCount = cards.filter(c => c.is_active !== false).length;

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'moneygram', label: 'Moneygram', icon: '💸' },
    { id: 'western_union', label: 'Western Union', icon: '🌐' },
    { id: 'cards', label: 'Cards', icon: '💳' },
    { id: 'loans', label: 'Loans', icon: '🤝' },
    { id: 'personal', label: 'Personal Daily', icon: '🛒' },
    { id: 'personal_revenue', label: 'Personal Revenue', icon: '💰' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Finance Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Tailored for Mr. Marwan</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handleInstantBackup}
                disabled={backupStatus === 'loading'}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-wait ${
                  backupStatus === 'success'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : backupStatus === 'error'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{backupStatus === 'loading' ? '⏳' : backupStatus === 'success' ? '✅' : backupStatus === 'error' ? '❌' : '💾'}</span>
                <span>{backupStatus === 'loading' ? 'Backing up…' : 'Create Instant Backup'}</span>
              </button>
              <RefreshButton />
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                >
                  Log Out
                </button>
              </form>
            </div>
            {backupMessage && (
              <p className={`text-xs font-medium ${backupStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {backupMessage}
              </p>
            )}
          </div>
        </header>

        <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm mb-8 flex flex-wrap gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'home' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-xs font-semibold bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-500/30 mb-3 inline-block">
                  Executive Dashboard
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                  Welcome back, Dear Mr. Marwan
                </h2>
                <p className="text-indigo-200 text-sm mt-2 max-w-xl">
                  Here is your real-time financial overview across all active cards, loans, Moneygram, Western Union transfers, personal expenses, and personal revenues.
                </p>
              </div>
            </div>

            <SummaryCards
              balancesByCurrency={balancesByCurrency}
              activeLoansByCurrency={activeLoansByCurrency}
              moneygramByCurrency={moneygramByCurrency}
              westernUnionByCurrency={westernUnionByCurrency}
              personalSpentThisMonthByCurrency={personalSpentThisMonthByCurrency}
              personalRevenueThisMonthByCurrency={personalRevenueThisMonthByCurrency}
              cardsCount={cardsCount}
            />

            <TransactionFeed transactions={transactions} cards={cards} />
          </div>
        )}

        {activeTab === 'moneygram' && (
          <div className="animate-fadeIn">
            <TransferView provider="moneygram" title="Moneygram" transfers={transfers} />
          </div>
        )}

        {activeTab === 'western_union' && (
          <div className="animate-fadeIn">
            <TransferView provider="western_union" title="Western Union" transfers={transfers} />
          </div>
        )}

        {activeTab === 'cards' && (
          <div className="animate-fadeIn">
            <CardsOverview cards={cards} cardholders={cardholders} cardTicks={cardTicks} />
          </div>
        )}

        {activeTab === 'loans' && (
          <div className="animate-fadeIn">
            <LoanTracker loans={loans} cardholders={cardholders} />
          </div>
        )}

        {activeTab === 'personal' && (
          <div className="animate-fadeIn">
            <PersonalExpenseView expenses={personalExpenses} />
          </div>
        )}

        {activeTab === 'personal_revenue' && (
          <div className="animate-fadeIn">
            <PersonalRevenueView revenues={personalRevenues} />
          </div>
        )}
      </div>
    </div>
  );
}
