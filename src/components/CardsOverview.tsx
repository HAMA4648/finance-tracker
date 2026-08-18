'use client'
import React, { useState } from 'react';
import { addTransaction, createCard } from '@/app/actions';

export default function CardsOverview({ cards, cardholders }: { cards: any[], cardholders: any[] }) {
  const [showTopupModal, setShowTopupModal] = useState<string | null>(null);
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);

  return (
    <div className="mb-8 relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Cards Overview</h2>
        <button onClick={() => setShowCreateCardModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          + Add Card
        </button>
      </div>

      {showCreateCardModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add New Card</h3>
            <form action={createCard} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Card Name</label>
                <input type="text" name="card_name" placeholder="e.g. Main Mastercard" className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cardholder Name</label>
                <input type="text" name="cardholder_name" placeholder="e.g. John Doe" className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Initial Balance</label>
                <input type="number" name="initial_balance" step="0.01" defaultValue="0" className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black" required />
              </div>
              <div className="flex gap-3 mt-4">
                <button type="submit" onClick={() => setTimeout(() => setShowCreateCardModal(false), 100)} className="flex-1 bg-slate-900 text-white font-medium py-2 rounded-lg">Create</button>
                <button type="button" onClick={() => setShowCreateCardModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map(card => {
          const owner = cardholders.find(c => c.id === card.cardholder_id);
          return (
            <div key={card.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-slate-900">{card.card_name}</h3>
                  <p className="text-sm text-slate-500">{owner?.name}</p>
                </div>
                <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full uppercase tracking-wider">
                  {card.brand || 'Card'}
                </span>
              </div>
              <div className="mb-4">
                <p className="text-sm text-slate-500 mb-1">Balance</p>
                <p className={`text-2xl font-semibold ${card.balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  ${card.balance.toFixed(2)}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowTopupModal(card.id)} className="text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors w-full">
                  + Add Transaction
                </button>
              </div>

              {showTopupModal === card.id && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm p-4 rounded-2xl z-10 flex flex-col justify-center border border-slate-200">
                  <h4 className="font-medium text-slate-900 mb-2">Record Transaction</h4>
                  <form action={addTransaction} className="flex flex-col gap-2">
                    <input type="hidden" name="card_id" value={card.id} />
                    <select name="type" className="p-2 border border-slate-200 rounded-lg text-sm bg-white text-black" required>
                      <option value="top_up">Top-up</option>
                      <option value="expense">Expense</option>
                    </select>
                    <input type="number" name="amount" step="0.01" placeholder="Amount" className="p-2 border border-slate-200 rounded-lg text-sm text-black" required />
                    <input type="text" name="description" placeholder="Description" className="p-2 border border-slate-200 rounded-lg text-sm text-black" required />
                    <div className="flex gap-2 mt-2">
                      <button type="submit" onClick={() => setTimeout(() => setShowTopupModal(null), 100)} className="flex-1 bg-slate-900 text-white text-sm font-medium py-2 rounded-lg">Save</button>
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
