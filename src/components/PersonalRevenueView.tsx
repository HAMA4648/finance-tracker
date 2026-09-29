'use client'

import React, { useState, useMemo } from 'react';
import { PersonalRevenue } from '@/types/database';
import { addPersonalRevenue, updatePersonalRevenue, deletePersonalRevenue } from '@/app/actions';
import { formatCurrency } from '@/lib/format';

interface Props {
  revenues: PersonalRevenue[];
}

const CATEGORIES = ['Salary', 'Business', 'Investment', 'Gifts', 'General'];

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

export default function PersonalRevenueView({ revenues }: Props) {
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
  const [editingRevenue, setEditingRevenue] = useState<PersonalRevenue | null>(null);
  const [deletingRevenue, setDeletingRevenue] = useState<PersonalRevenue | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all unique month keys present in revenues + current & last month
  const availableMonths = useMemo(() => {
    const keysSet = new Set<string>();
    keysSet.add(currentMonthKey);
    keysSet.add(lastMonthKey);
    revenues.forEach(r => {
      const key = getMonthKey(r.received_at || r.created_at);
      if (key) keysSet.add(key);
    });
    return Array.from(keysSet).sort().reverse();
  }, [revenues, currentMonthKey, lastMonthKey]);

  // Calculate This Month's revenue (current active calendar month)
  const thisMonthTotals = useMemo(() => {
    const totals = { USD: 0, EUR: 0, IQD: 0 };
    revenues.forEach(r => {
      if (getMonthKey(r.received_at || r.created_at) === currentMonthKey) {
        const cur = (r.currency || 'USD').toUpperCase() as 'USD' | 'EUR' | 'IQD';
        const amt = Number(r.amount) || 0;
        if (cur in totals) totals[cur] += amt;
        else totals.USD += amt;
      }
    });
    return totals;
  }, [revenues, currentMonthKey]);

  // Calculate Last Month's revenue
  const lastMonthTotals = useMemo(() => {
    const totals = { USD: 0, EUR: 0, IQD: 0 };
    revenues.forEach(r => {
      if (getMonthKey(r.received_at || r.created_at) === lastMonthKey) {
        const cur = (r.currency || 'USD').toUpperCase() as 'USD' | 'EUR' | 'IQD';
        const amt = Number(r.amount) || 0;
        if (cur in totals) totals[cur] += amt;
        else totals.USD += amt;
      }
    });
    return totals;
  }, [revenues, lastMonthKey]);

  // Calculate Selected Month's revenue
  const selectedMonthTotals = useMemo(() => {
    const totals = { USD: 0, EUR: 0, IQD: 0 };
    revenues.forEach(r => {
      if (getMonthKey(r.received_at || r.created_at) === selectedMonth) {
        const cur = (r.currency || 'USD').toUpperCase() as 'USD' | 'EUR' | 'IQD';
        const amt = Number(r.amount) || 0;
        if (cur in totals) totals[cur] += amt;
        else totals.USD += amt;
      }
    });
    return totals;
  }, [revenues, selectedMonth]);

  // Filter revenues list by selected month and search query
  const filteredRevenues = useMemo(() => {
    return revenues.filter(r => {
      const matchMonth = getMonthKey(r.received_at || r.created_at) === selectedMonth;
      const matchSearch =
        !searchQuery ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.category && r.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchMonth && matchSearch;
    });
  }, [revenues, selectedMonth, searchQuery]);

  const handleAdd = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await addPersonalRevenue(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setShowAddModal(false);
    }
  };

  const handleUpdate = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await updatePersonalRevenue(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setEditingRevenue(null);
    }
  };

  const handleDelete = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await deletePersonalRevenue(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setDeletingRevenue(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Personal Revenue</h2>
          <p className="text-slate-500 text-sm mt-0.5">Track personal earnings, salary, and business income over time.</p>
        </div>
        <button
          onClick={() => { setErrorMsg(null); setShowAddModal(true); }}
          className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer flex items-center gap-2"
        >
          <span>＋ Log Daily Revenue</span>
        </button>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: This Month's Revenue Snapshot */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">This Month ({formatMonthLabel(currentMonthKey)})</h3>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full">Current</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">USD</span>
              <span className="text-base font-bold text-emerald-600">{formatCurrency(thisMonthTotals.USD, 'USD')}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">EUR</span>
              <span className="text-base font-bold text-emerald-600">{formatCurrency(thisMonthTotals.EUR, 'EUR')}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">IQD</span>
              <span className="text-base font-bold text-emerald-600">{formatCurrency(thisMonthTotals.IQD, 'IQD')}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Last Month's Revenue Snapshot */}
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

        {/* Card 3: Selected Month Revenue Total & Filter */}
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
              <span className="text-base font-bold text-emerald-600">{formatCurrency(selectedMonthTotals.USD, 'USD')}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">EUR</span>
              <span className="text-base font-bold text-emerald-600">{formatCurrency(selectedMonthTotals.EUR, 'EUR')}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 font-semibold">IQD</span>
              <span className="text-base font-bold text-emerald-600">{formatCurrency(selectedMonthTotals.IQD, 'IQD')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Log Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Revenue Log — {formatMonthLabel(selectedMonth)}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Showing {filteredRevenues.length} entries</p>
          </div>
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search revenue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Revenue Table */}
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
              {filteredRevenues.map((rev) => (
                <tr key={rev.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 text-slate-900 font-medium whitespace-nowrap">
                    {rev.received_at ? new Date(rev.received_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{rev.description}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      {rev.category || 'General'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-600 whitespace-nowrap">
                    + {formatCurrency(rev.amount, rev.currency)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-xs max-w-xs truncate">{rev.notes || '-'}</td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setErrorMsg(null); setEditingRevenue(rev); }}
                        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit Revenue"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setErrorMsg(null); setDeletingRevenue(rev); }}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
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
                    No personal revenue logged for {formatMonthLabel(selectedMonth)}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Daily Revenue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Log Daily Revenue</h3>
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
                  placeholder="e.g., Salary, Client Payment, Sales"
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                  <select
                    name="currency"
                    defaultValue="USD"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    defaultValue="Salary"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date Received</label>
                  <input
                    type="date"
                    name="received_at"
                    defaultValue={todayStr}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes <span className="text-slate-400 font-normal">— optional</span></label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Additional details or notes..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg cursor-pointer">
                  Save Revenue
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Daily Revenue Modal */}
      {editingRevenue && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit Personal Revenue</h3>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}
            <form action={handleUpdate} className="flex flex-col gap-4">
              <input type="hidden" name="revenue_id" value={editingRevenue.id} />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingRevenue.description}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                  <select
                    name="currency"
                    defaultValue={editingRevenue.currency || 'USD'}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    defaultValue={editingRevenue.category || 'Salary'}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date Received</label>
                  <input
                    type="date"
                    name="received_at"
                    defaultValue={editingRevenue.received_at ? editingRevenue.received_at.split('T')[0] : todayStr}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes <span className="text-slate-400 font-normal">— optional</span></label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingRevenue.notes || ''}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg cursor-pointer">
                  Save Changes
                </button>
                <button type="button" onClick={() => setEditingRevenue(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Revenue Confirmation Modal */}
      {deletingRevenue && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Revenue</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-900">{deletingRevenue.description}</span> ({formatCurrency(deletingRevenue.amount, deletingRevenue.currency)})?
            </p>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm text-left">
                {errorMsg}
              </div>
            )}
            <form action={handleDelete} className="flex gap-3">
              <input type="hidden" name="revenue_id" value={deletingRevenue.id} />
              <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg cursor-pointer">Delete</button>
              <button type="button" onClick={() => setDeletingRevenue(null)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 cursor-pointer">Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
