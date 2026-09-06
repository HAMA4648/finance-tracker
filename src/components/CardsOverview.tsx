'use client'
import React, { useState } from 'react';
import { addTransaction, createCard } from '@/app/actions';
import { formatCurrency } from '@/lib/format';

export default function CardsOverview({ cards, cardholders }: { cards: any[], cardholders: any[] }) {
  const [showTopupModal, setShowTopupModal] = useState<string | null>(null);
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreateCard = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await createCard(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setShowCreateCardModal(false);
    }
  };

  const handleTransaction = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await addTransaction(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setShowTopupModal(null);
    }
  };

  return (
    <div className="mb-8 relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Cards Overview</h2>
        <button onClick={() => { setErrorMsg(null); setShowCreateCardModal(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          + Add Card
        </button>
      </div>

      {showCreateCardModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add New Card</h3>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}
            <form action={handleCreateCard} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Card Name</label>
                <input type="text" name="card_name" placeholder="e.g. Main Mastercard" className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cardholder Name</label>
                <input type="text" name="cardholder_name" placeholder="e.g. John Doe" className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Initial Balance</label>
                  <input type="number" name="initial_balance" step="0.01" defaultValue="0" className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black" required />
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
              <div className="flex gap-3 mt-4">
                <button type="submit" className="flex-1 bg-slate-900 text-white font-medium py-2 rounded-lg">Create</button>
                <button type="button" onClick={() => setShowCreateCardModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map(card => {
          const owner = cardholders.find(c => c.id === card.cardholder_id);
          const cardCurrency = card.currency || 'USD';
          return (
            <div key={card.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-slate-900">{card.card_name}</h3>
                  <p className="text-sm text-slate-500">{owner?.name}</p>
                </div>
                <div className="flex gap-1">
                  <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full uppercase tracking-wider">
                    {cardCurrency}
                  </span>
                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full uppercase tracking-wider">
                    {card.brand || 'Card'}
                  </span>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-sm text-slate-500 mb-1">Balance</p>
                <p className={`text-2xl font-semibold ${card.balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  {formatCurrency(card.balance, cardCurrency)}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setErrorMsg(null); setShowTopupModal(card.id); }} className="text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors w-full">
                  + Add Transaction
                </button>
              </div>

              {showTopupModal === card.id && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm p-4 rounded-2xl z-10 flex flex-col justify-center border border-slate-200">
                  <h4 className="font-medium text-slate-900 mb-2">Record Transaction ({cardCurrency})</h4>
                  {errorMsg && (
                    <div className="mb-2 p-2 bg-red-50 border border-red-100 text-red-600 rounded text-xs">
                      {errorMsg}
                    </div>
                  )}
                  <form action={handleTransaction} className="flex flex-col gap-2">
                    <input type="hidden" name="card_id" value={card.id} />
                    <select name="type" className="p-2 border border-slate-200 rounded-lg text-sm bg-white text-black" required>
                      <option value="top_up">Top-up</option>
                      <option value="expense">Expense</option>
                    </select>
                    <input type="number" name="amount" step="0.01" placeholder="Amount" className="p-2 border border-slate-200 rounded-lg text-sm text-black" required />
                    <input type="text" name="description" placeholder="Description" className="p-2 border border-slate-200 rounded-lg text-sm text-black" required />
                    <div className="flex gap-2 mt-2">
                      <button type="submit" className="flex-1 bg-slate-900 text-white text-sm font-medium py-2 rounded-lg">Save</button>
                      <button type="button" onClick={() => setShowTopupModal(null)} className="flex-1 bg-slate-100 text-slate-700 text-sm font-medium py-2 rounded-lg">Cancel</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          );
        })}
        {cards.length === 0 && <div className="text-slate-500 text-sm py-4">No cards found. Add one to get started!</div>}
      </div>
    </div>
  );
}
