'use client'

import React, { useState, useMemo } from 'react';
import {
  addSheinExpense,
  updateSheinExpense,
  deleteSheinExpense,
  addSheinRevenue,
  updateSheinRevenue,
  deleteSheinRevenue,
} from '@/app/actions';
import { SheinExpense, SheinRevenue } from '@/types/database';
import { formatCurrency } from '@/lib/format';

interface Props {
  expenses: SheinExpense[];
  revenues: SheinRevenue[];
}

export default function SheinStoreView({ expenses = [], revenues = [] }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<'spending' | 'revenue'>('spending');
  const [selectedMonth, setSelectedMonth] = useState<string>('current'); // 'current', 'all', 'previous', or 'YYYY-MM'

  // Modals state
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<SheinExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<SheinExpense | null>(null);

  const [showAddRevenueModal, setShowAddRevenueModal] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<SheinRevenue | null>(null);
  const [deletingRevenue, setDeletingRevenue] = useState<SheinRevenue | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Date Key Helpers
  const currentDate = new Date();
  const currentMonthKey = currentDate.toISOString().slice(0, 7); // YYYY-MM

  const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const previousMonthKey = prevDate.toISOString().slice(0, 7);

  // Available unique months list
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentMonthKey);
    monthsSet.add(previousMonthKey);

    expenses.forEach(e => {
      const key = (e.spent_at || e.created_at || '').slice(0, 7);
      if (key && key.length === 7) monthsSet.add(key);
    });

    revenues.forEach(r => {
      const key = (r.received_at || r.created_at || '').slice(0, 7);
      if (key && key.length === 7) monthsSet.add(key);
    });

    return Array.from(monthsSet).sort().reverse();
  }, [expenses, revenues, currentMonthKey, previousMonthKey]);

  // Calculations for This Month
  const thisMonthData = useMemo(() => {
    const spent = { USD: 0, EUR: 0, IQD: 0 };
    const rev = { USD: 0, EUR: 0, IQD: 0 };

    expenses.forEach(e => {
      const key = (e.spent_at || e.created_at || '').slice(0, 7);
      if (key === currentMonthKey) {
        const cur = (e.currency || 'USD').toUpperCase() as keyof typeof spent;
        const amt = Number(e.amount) || 0;
        if (cur in spent) spent[cur] += amt;
        else spent.USD += amt;
      }
    });

    revenues.forEach(r => {
      const key = (r.received_at || r.created_at || '').slice(0, 7);
      if (key === currentMonthKey) {
        const cur = (r.currency || 'USD').toUpperCase() as keyof typeof rev;
        const amt = Number(r.amount) || 0;
        if (cur in rev) rev[cur] += amt;
        else rev.USD += amt;
      }
    });

    const netProfit = {
      USD: rev.USD - spent.USD,
      EUR: rev.EUR - spent.EUR,
      IQD: rev.IQD - spent.IQD,
    };

    return { spent, rev, netProfit };
  }, [expenses, revenues, currentMonthKey]);

  // Calculations for Previous Month
  const previousMonthData = useMemo(() => {
    const spent = { USD: 0, EUR: 0, IQD: 0 };
    const rev = { USD: 0, EUR: 0, IQD: 0 };

    expenses.forEach(e => {
      const key = (e.spent_at || e.created_at || '').slice(0, 7);
      if (key === previousMonthKey) {
        const cur = (e.currency || 'USD').toUpperCase() as keyof typeof spent;
        const amt = Number(e.amount) || 0;
        if (cur in spent) spent[cur] += amt;
        else spent.USD += amt;
      }
    });

    revenues.forEach(r => {
      const key = (r.received_at || r.created_at || '').slice(0, 7);
      if (key === previousMonthKey) {
        const cur = (r.currency || 'USD').toUpperCase() as keyof typeof rev;
        const amt = Number(r.amount) || 0;
        if (cur in rev) rev[cur] += amt;
        else rev.USD += amt;
      }
    });

    const netProfit = {
      USD: rev.USD - spent.USD,
      EUR: rev.EUR - spent.EUR,
      IQD: rev.IQD - spent.IQD,
    };

    return { spent, rev, netProfit };
  }, [expenses, revenues, previousMonthKey]);

  // Selected Month Filter Target
  const effectiveMonthKey = useMemo(() => {
    if (selectedMonth === 'current') return currentMonthKey;
    if (selectedMonth === 'previous') return previousMonthKey;
    if (selectedMonth === 'all') return null;
    return selectedMonth;
  }, [selectedMonth, currentMonthKey, previousMonthKey]);

  // Filtered lists for table display
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (effectiveMonthKey) {
        const monthKey = (e.spent_at || e.created_at || '').slice(0, 7);
        if (monthKey !== effectiveMonthKey) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (e.description || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q) ||
        (e.notes || '').toLowerCase().includes(q) ||
        e.amount.toString().includes(q)
      );
    });
  }, [expenses, effectiveMonthKey, searchQuery]);

  const filteredRevenues = useMemo(() => {
    return revenues.filter(r => {
      if (effectiveMonthKey) {
        const monthKey = (r.received_at || r.created_at || '').slice(0, 7);
        if (monthKey !== effectiveMonthKey) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (r.description || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q) ||
        r.amount.toString().includes(q)
      );
    });
  }, [revenues, effectiveMonthKey, searchQuery]);

  // Action handlers
  const handleAddExpense = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await addSheinExpense(formData);
    if (res?.error) setErrorMsg(res.error);
    else setShowAddExpenseModal(false);
  };

  const handleUpdateExpense = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await updateSheinExpense(formData);
    if (res?.error) setErrorMsg(res.error);
    else setEditingExpense(null);
  };

  const handleDeleteExpense = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await deleteSheinExpense(formData);
    if (res?.error) setErrorMsg(res.error);
    else setDeletingExpense(null);
  };

  const handleAddRevenue = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await addSheinRevenue(formData);
    if (res?.error) setErrorMsg(res.error);
    else setShowAddRevenueModal(false);
  };

  const handleUpdateRevenue = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await updateSheinRevenue(formData);
    if (res?.error) setErrorMsg(res.error);
    else setEditingRevenue(null);
  };

  const handleDeleteRevenue = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await deleteSheinRevenue(formData);
    if (res?.error) setErrorMsg(res.error);
    else setDeletingRevenue(null);
  };

  const formatMonthLabel = (mKey: string) => {
    const [year, month] = mKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header Title & Month Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🛍️</span>
            <span>SHEIN Store Manager</span>
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Track sales, stock purchases, shipping, customs fees, and calculate net store profit.
          </p>
        </div>

        {/* Filter & Add Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200 rounded-xl shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Month:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="text-sm font-medium text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="current">This Month ({formatMonthLabel(currentMonthKey)})</option>
              <option value="previous">Previous Month ({formatMonthLabel(previousMonthKey)})</option>
              <option value="all">All Time</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setErrorMsg(null);
              if (activeSubTab === 'spending') setShowAddExpenseModal(true);
              else setShowAddRevenueModal(true);
            }}
            className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span>
            <span>{activeSubTab === 'spending' ? 'Log Spending' : 'Log Revenue'}</span>
          </button>
        </div>
      </div>

      {/* Top Overview Cards (This Month, Net Profit, Previous Month) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: This Month Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              This Month Sales ({formatMonthLabel(currentMonthKey)})
            </h3>
            <span className="text-lg">💰</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">USD</span>
              <span className="text-base font-bold tracking-tight text-emerald-600">
                {formatCurrency(thisMonthData.rev.USD, 'USD')}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">EUR</span>
              <span className="text-base font-bold tracking-tight text-emerald-600">
                {formatCurrency(thisMonthData.rev.EUR, 'EUR')}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">IQD</span>
              <span className="text-base font-bold tracking-tight text-emerald-600">
                {formatCurrency(thisMonthData.rev.IQD, 'IQD')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: This Month Spending */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
              This Month Spending ({formatMonthLabel(currentMonthKey)})
            </h3>
            <span className="text-lg">🛒</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">USD</span>
              <span className="text-base font-bold tracking-tight text-rose-600">
                {formatCurrency(thisMonthData.spent.USD, 'USD')}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">EUR</span>
              <span className="text-base font-bold tracking-tight text-rose-600">
                {formatCurrency(thisMonthData.spent.EUR, 'EUR')}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">IQD</span>
              <span className="text-base font-bold tracking-tight text-rose-600">
                {formatCurrency(thisMonthData.spent.IQD, 'IQD')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: This Month Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm flex flex-col justify-between bg-gradient-to-br from-white to-pink-50/30">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-pink-700 uppercase tracking-wider">
              This Month Net Profit
            </h3>
            <span className="text-lg">📈</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-500 font-semibold">USD</span>
              <span
                className={`text-base font-bold tracking-tight ${
                  thisMonthData.netProfit.USD < 0 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {formatCurrency(thisMonthData.netProfit.USD, 'USD')}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-500 font-semibold">EUR</span>
              <span
                className={`text-base font-bold tracking-tight ${
                  thisMonthData.netProfit.EUR < 0 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {formatCurrency(thisMonthData.netProfit.EUR, 'EUR')}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-500 font-semibold">IQD</span>
              <span
                className={`text-base font-bold tracking-tight ${
                  thisMonthData.netProfit.IQD < 0 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {formatCurrency(thisMonthData.netProfit.IQD, 'IQD')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Previous Month Summary */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Previous Month ({formatMonthLabel(previousMonthKey)})
            </h3>
            <span className="text-lg">📊</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1">
              <span className="text-slate-400">Sales</span>
              <span className="font-semibold text-emerald-400">
                {formatCurrency(previousMonthData.rev.USD, 'USD')}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-1">
              <span className="text-slate-400">Spending</span>
              <span className="font-semibold text-rose-400">
                {formatCurrency(previousMonthData.spent.USD, 'USD')}
              </span>
            </div>
            <div className="flex justify-between items-center pt-0.5">
              <span className="text-slate-300 font-medium">Net Profit</span>
              <span
                className={`font-bold ${
                  previousMonthData.netProfit.USD < 0 ? 'text-red-400' : 'text-emerald-300'
                }`}
              >
                {formatCurrency(previousMonthData.netProfit.USD, 'USD')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('spending')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeSubTab === 'spending'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🛒</span>
            <span>Store Spending</span>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {filteredExpenses.length}
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('revenue')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeSubTab === 'revenue'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>💰</span>
            <span>Store Revenue</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
              {filteredRevenues.length}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder={
              activeSubTab === 'spending'
                ? 'Search spending logs…'
                : 'Search revenue logs…'
            }
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white shadow-sm"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
          </svg>
        </div>
      </div>

      {/* Sub-Tab 1: Store Spending Table */}
      {activeSubTab === 'spending' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredExpenses.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {item.spent_at || item.created_at?.split('T')[0]}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.description}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                        {item.category || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-600 whitespace-nowrap">
                      {formatCurrency(item.amount, item.currency || 'USD')}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {item.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setErrorMsg(null);
                            setEditingExpense(item);
                          }}
                          className="text-slate-400 hover:text-indigo-600 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Edit Spending"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setErrorMsg(null);
                            setDeletingExpense(item);
                          }}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Delete Spending"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                      No spending records found. Click <strong>+ Log Spending</strong> to add your first entry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Store Revenue Table */}
      {activeSubTab === 'revenue' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredRevenues.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {item.received_at || item.created_at?.split('T')[0]}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.description}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-medium border border-emerald-100">
                        {item.category || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600 whitespace-nowrap">
                      {formatCurrency(item.amount, item.currency || 'USD')}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {item.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setErrorMsg(null);
                            setEditingRevenue(item);
                          }}
                          className="text-slate-400 hover:text-indigo-600 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Edit Revenue"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setErrorMsg(null);
                            setDeletingRevenue(item);
                          }}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Delete Revenue"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRevenues.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                      No revenue records found. Click <strong>+ Log Revenue</strong> to add your first sales entry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODALS ─── */}

      {/* Add Expense Modal */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Log SHEIN Store Spending</h3>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}
            <form action={handleAddExpense} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  placeholder="e.g. Stock Order #1234, Customs Fee"
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                    required
                  />
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select name="category" defaultValue="Stock Purchase" className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black bg-white">
                    <option value="Stock Purchase">Stock Purchase</option>
                    <option value="Shipping">Shipping</option>
                    <option value="Customs">Customs</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Ads">Ads / Marketing</option>
                    <option value="General">General Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="spent_at"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Additional details..."
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button type="submit" className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 rounded-lg cursor-pointer">
                  Save Spending
                </button>
                <button type="button" onClick={() => setShowAddExpenseModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit SHEIN Store Spending</h3>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}
            <form action={handleUpdateExpense} className="flex flex-col gap-4">
              <input type="hidden" name="expense_id" value={editingExpense.id} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingExpense.description}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    defaultValue={editingExpense.amount}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                  <select name="currency" defaultValue={editingExpense.currency || 'USD'} className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black bg-white">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="IQD">IQD (د.ع)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select name="category" defaultValue={editingExpense.category || 'General'} className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black bg-white">
                    <option value="Stock Purchase">Stock Purchase</option>
                    <option value="Shipping">Shipping</option>
                    <option value="Customs">Customs</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Ads">Ads / Marketing</option>
                    <option value="General">General Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="spent_at"
                    defaultValue={editingExpense.spent_at}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  name="notes"
                  defaultValue={editingExpense.notes || ''}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button type="submit" className="flex-1 bg-slate-900 text-white font-medium py-2 rounded-lg cursor-pointer">
                  Save Changes
                </button>
                <button type="button" onClick={() => setEditingExpense(null)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Expense Modal */}
      {deletingExpense && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Spending Log</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-900">{deletingExpense.description}</span>?
            </p>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm text-left">
                {errorMsg}
              </div>
            )}
            <form action={handleDeleteExpense} className="flex gap-3">
              <input type="hidden" name="expense_id" value={deletingExpense.id} />
              <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg cursor-pointer">
                Delete
              </button>
              <button type="button" onClick={() => setDeletingExpense(null)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 cursor-pointer">
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Revenue Modal */}
      {showAddRevenueModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Log SHEIN Store Revenue</h3>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}
            <form action={handleAddRevenue} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  placeholder="e.g. Customer Orders Batch #42, Pre-order Sales"
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                    required
                  />
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select name="category" defaultValue="Customer Orders" className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black bg-white">
                    <option value="Customer Orders">Customer Orders</option>
                    <option value="Bulk Sales">Bulk Sales</option>
                    <option value="Pre-orders">Pre-orders</option>
                    <option value="General">General Revenue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="received_at"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Additional details..."
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg cursor-pointer">
                  Save Revenue
                </button>
                <button type="button" onClick={() => setShowAddRevenueModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Revenue Modal */}
      {editingRevenue && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit SHEIN Store Revenue</h3>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}
            <form action={handleUpdateRevenue} className="flex flex-col gap-4">
              <input type="hidden" name="revenue_id" value={editingRevenue.id} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingRevenue.description}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    defaultValue={editingRevenue.amount}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                  <select name="currency" defaultValue={editingRevenue.currency || 'USD'} className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black bg-white">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="IQD">IQD (د.ع)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select name="category" defaultValue={editingRevenue.category || 'General'} className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black bg-white">
                    <option value="Customer Orders">Customer Orders</option>
                    <option value="Bulk Sales">Bulk Sales</option>
                    <option value="Pre-orders">Pre-orders</option>
                    <option value="General">General Revenue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="received_at"
                    defaultValue={editingRevenue.received_at}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  name="notes"
                  defaultValue={editingRevenue.notes || ''}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button type="submit" className="flex-1 bg-slate-900 text-white font-medium py-2 rounded-lg cursor-pointer">
                  Save Changes
                </button>
                <button type="button" onClick={() => setEditingRevenue(null)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Revenue Modal */}
      {deletingRevenue && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Revenue Log</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-900">{deletingRevenue.description}</span>?
            </p>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm text-left">
                {errorMsg}
              </div>
            )}
            <form action={handleDeleteRevenue} className="flex gap-3">
              <input type="hidden" name="revenue_id" value={deletingRevenue.id} />
              <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg cursor-pointer">
                Delete
              </button>
              <button type="button" onClick={() => setDeletingRevenue(null)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 cursor-pointer">
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
