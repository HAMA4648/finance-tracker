'use client'

import React, { useState, useMemo } from 'react';
import { PersonalExpense } from '@/types/database';
import { addPersonalExpense, updatePersonalExpense, deletePersonalExpense } from '@/app/actions';
import { formatCurrency } from '@/lib/format';

interface Props {
  expenses: PersonalExpense[];
}

const CATEGORIES = ['Food', 'Transport', 'Bills', 'Shopping', 'General'];

function getMonthKey(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey: string): string {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function PersonalExpenseView({ expenses }: Props) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthKey = useMemo(() => getMonthKey(todayStr), [todayStr]);

  const lastMonthKey = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PersonalExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<PersonalExpense | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all unique month keys present in expenses + current & last month
  const availableMonths = useMemo(() => {
    const keysSet = new Set<string>();
    keysSet.add(currentMonthKey);
    keysSet.add(lastMonthKey);
    expenses.forEach(e => {
      const key = getMonthKey(e.spent_at || e.created_at);
      if (key) keysSet.add(key);
    });
    return Array.from(keysSet).sort().reverse();
  }, [expenses, currentMonthKey, lastMonthKey]);

  // Calculate This Month's spending (current active calendar month)
  const thisMonthTotals = useMemo(() => {
    const totals = { USD: 0, EUR: 0, IQD: 0 };
    expenses.forEach(e => {
      if (getMonthKey(e.spent_at || e.created_at) === currentMonthKey) {
        const cur = (e.currency || 'USD').toUpperCase() as 'USD' | 'EUR' | 'IQD';
        const amt = Number(e.amount) || 0;
        if (cur in totals) totals[cur] += amt;
        else totals.USD += amt;
      }
    });
    return totals;
  }, [expenses, currentMonthKey]);

  // Calculate Last Month's spending
  const lastMonthTotals = useMemo(() => {
    const totals = { USD: 0, EUR: 0, IQD: 0 };
    expenses.forEach(e => {
      if (getMonthKey(e.spent_at || e.created_at) === lastMonthKey) {
        const cur = (e.currency || 'USD').toUpperCase() as 'USD' | 'EUR' | 'IQD';
        const amt = Number(e.amount) || 0;
        if (cur in totals) totals[cur] += amt;
        else totals.USD += amt;
      }
    });
    return totals;
  }, [expenses, lastMonthKey]);

  // Calculate Selected Month's spending
  const selectedMonthTotals = useMemo(() => {
    const totals = { USD: 0, EUR: 0, IQD: 0 };
    expenses.forEach(e => {
      if (getMonthKey(e.spent_at || e.created_at) === selectedMonth) {
        const cur = (e.currency || 'USD').toUpperCase() as 'USD' | 'EUR' | 'IQD';
        const amt = Number(e.amount) || 0;
        if (cur in totals) totals[cur] += amt;
        else totals.USD += amt;
      }
    });
    return totals;
  }, [expenses, selectedMonth]);

  // Filter expenses list by selected month and search query
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchMonth = getMonthKey(e.spent_at || e.created_at) === selectedMonth;
      const matchSearch =
        !searchQuery ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.category && e.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchMonth && matchSearch;
    });
  }, [expenses, selectedMonth, searchQuery]);

  const handleAdd = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await addPersonalExpense(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setShowAddModal(false);
    }
  };

  const handleUpdate = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await updatePersonalExpense(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setEditingExpense(null);
    }
  };

  const handleDelete = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await deletePersonalExpense(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setDeletingExpense(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Personal Daily Expenses</h2>
          <p className="text-slate-500 text-sm mt-0.5">Track daily personal spending and review historical monthly totals.</p>
        </div>
        <button
          onClick={() => { setErrorMsg(null); setShowAddModal(true); }}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer flex items-center gap-2"
        >
          <span>＋ Log Daily Expense</span>
        </button>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: This Month's Snapshot */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">This Month ({formatMonthLabel(currentMonthKey)})</h3>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full">Current</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">USD</span>
              <span className="text-base font-bold text-slate-900">{formatCurrency(thisMonthTotals.USD, 'USD')}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">EUR</span>
              <span className="text-base font-bold text-slate-900">{formatCurrency(thisMonthTotals.EUR, 'EUR')}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">IQD</span>
              <span className="text-base font-bold text-slate-900">{formatCurrency(thisMonthTotals.IQD, 'IQD')}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Last Month's Snapshot */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Month ({formatMonthLabel(lastMonthKey)})</h3>
            <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-0.5 rounded-full">Previous</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">USD</span>
              <span className="text-base font-bold text-slate-900">{formatCurrency(lastMonthTotals.USD, 'USD')}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">EUR</span>
              <span className="text-base font-bold text-slate-900">{formatCurrency(lastMonthTotals.EUR, 'EUR')}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">IQD</span>
              <span className="text-base font-bold text-slate-900">{formatCurrency(lastMonthTotals.IQD, 'IQD')}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Selected Month Total & Filter */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Historical Review</h3>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 bg-white shadow-sm cursor-pointer"
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)} {m === currentMonthKey ? '(Current)' : m === lastMonthKey ? '(Last Month)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">USD</span>
              <span className="text-base font-bold text-indigo-600">{formatCurrency(selectedMonthTotals.USD, 'USD')}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">EUR</span>
              <span className="text-base font-bold text-indigo-600">{formatCurrency(selectedMonthTotals.EUR, 'EUR')}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">IQD</span>
              <span className="text-base font-bold text-indigo-600">{formatCurrency(selectedMonthTotals.IQD, 'IQD')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expense Log Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Expenses Log — {formatMonthLabel(selectedMonth)}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Showing {filteredExpenses.length} entries</p>
          </div>
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4 rounded-l-lg">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right rounded-r-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 text-slate-900 font-medium whitespace-nowrap">
                    {exp.spent_at ? new Date(exp.spent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{exp.description}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {exp.category || 'General'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                    {formatCurrency(exp.amount, exp.currency)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-xs max-w-xs truncate">{exp.notes || '-'}</td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setErrorMsg(null); setEditingExpense(exp); }}
                        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit Expense"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setErrorMsg(null); setDeletingExpense(exp); }}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Delete Expense"
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
                    No personal expenses logged for {formatMonthLabel(selectedMonth)}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Daily Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Log Daily Expense</h3>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}
            <form action={handleAdd} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  placeholder="e.g., Lunch, Petrol, Shopping"
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                  <select
                    name="currency"
                    defaultValue="USD"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="IQD">IQD (د.ع)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    name="category"
                    defaultValue="General"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="spent_at"
                    defaultValue={todayStr}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes <span className="text-slate-400 font-normal">— optional</span></label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Additional context or notes..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg cursor-pointer">
                  Save Expense
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Daily Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit Personal Expense</h3>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}
            <form action={handleUpdate} className="flex flex-col gap-4">
              <input type="hidden" name="expense_id" value={editingExpense.id} />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingExpense.description}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                  <select
                    name="currency"
                    defaultValue={editingExpense.currency || 'USD'}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="IQD">IQD (د.ع)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    name="category"
                    defaultValue={editingExpense.category || 'General'}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="spent_at"
                    defaultValue={editingExpense.spent_at ? editingExpense.spent_at.split('T')[0] : todayStr}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes <span className="text-slate-400 font-normal">— optional</span></label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingExpense.notes || ''}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg cursor-pointer">
                  Save Changes
                </button>
                <button type="button" onClick={() => setEditingExpense(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Expense Confirmation Modal */}
      {deletingExpense && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Expense</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-900">{deletingExpense.description}</span> ({formatCurrency(deletingExpense.amount, deletingExpense.currency)})?
            </p>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm text-left">
                {errorMsg}
              </div>
            )}
            <form action={handleDelete} className="flex gap-3">
              <input type="hidden" name="expense_id" value={deletingExpense.id} />
              <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg cursor-pointer">Delete</button>
              <button type="button" onClick={() => setDeletingExpense(null)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 cursor-pointer">Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
