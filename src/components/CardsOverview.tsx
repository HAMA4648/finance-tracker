'use client'
import React, { useState } from 'react';
import {
  addTransaction,
  createCard,
  updateCard,
  deleteCard,
  toggleCardStatus,
  tickCardTransfer,
  deleteCardTick,
  resetCardTicks,
} from '@/app/actions';
import { formatCurrency } from '@/lib/format';
import { CardTick } from '@/types/database';

// ─── Helper: rolling 30-day window ───────────────────────────────────────────
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getActiveTicks(ticks: CardTick[], cardId: string): CardTick[] {
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  return ticks.filter(
    t => t.card_id === cardId && new Date(t.ticked_at).getTime() >= cutoff
  );
}

/** Returns how many days until the oldest active tick expires (frees up a slot). */
function getDaysUntilNextSlot(activeTicks: CardTick[]): number | null {
  if (activeTicks.length === 0) return null;
  const oldest = activeTicks.reduce((a, b) =>
    new Date(a.ticked_at) < new Date(b.ticked_at) ? a : b
  );
  const expiresAt = new Date(oldest.ticked_at).getTime() + THIRTY_DAYS_MS;
  const msLeft = expiresAt - Date.now();
  return Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

function formatTickDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Sub-component: Transfer Counter Badge ────────────────────────────────────
function TransferCounterBadge({
  card,
  activeTicks,
  onTick,
  onDeleteTick,
  onReset,
  isTickingThis,
}: {
  card: any;
  activeTicks: CardTick[];
  onTick: () => void;
  onDeleteTick: (tickId: string) => void;
  onReset: () => void;
  isTickingThis: boolean;
}) {
  const [showTicks, setShowTicks] = useState(false);
  const maxTransfers: number | null = card.max_transfers ?? null;
  if (maxTransfers === null) return null;

  const activeCount = activeTicks.length;
  const isLimitReached = activeCount >= maxTransfers;
  const daysUntilSlot = getDaysUntilNextSlot(activeTicks);

  // Find expiry date of oldest active tick for user-friendly messaging
  const oldestTick = activeTicks.length > 0
    ? activeTicks.reduce((a, b) => new Date(a.ticked_at) < new Date(b.ticked_at) ? a : b)
    : null;
  const nextSlotDate = oldestTick
    ? new Date(new Date(oldestTick.ticked_at).getTime() + THIRTY_DAYS_MS)
    : null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      {/* Counter badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
              isLimitReached
                ? 'bg-red-100 text-red-700 border border-red-200'
                : activeCount >= maxTransfers * 0.8
                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}
          >
            <span>🔄</span>
            <span>{activeCount} / {maxTransfers} Transfers Used</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Expand tick list */}
          {activeTicks.length > 0 && (
            <button
              onClick={() => setShowTicks(v => !v)}
              title={showTicks ? 'Hide tick log' : 'Show tick log'}
              className="text-slate-400 hover:text-indigo-600 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                {showTicks
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                }
              </svg>
            </button>
          )}

          {/* Reset button */}
          <button
            onClick={onReset}
            title="Clear all tick logs for this card"
            className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable tick log */}
      {showTicks && activeTicks.length > 0 && (
        <div className="mb-2 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 pt-2 pb-1">
            Active Ticks (rolling 30 days)
          </p>
          <ul className="divide-y divide-slate-100">
            {[...activeTicks]
              .sort((a, b) => new Date(a.ticked_at).getTime() - new Date(b.ticked_at).getTime())
              .map((tick, i) => {
                const expiresAt = new Date(new Date(tick.ticked_at).getTime() + THIRTY_DAYS_MS);
                const daysLeft = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
                return (
                  <li key={tick.id} className="flex items-center justify-between px-3 py-1.5">
                    <div>
                      <p className="text-[11px] font-medium text-slate-700">
                        #{i + 1} — {formatTickDate(tick.ticked_at)}
                      </p>
                      <p className="text-[10px] text-slate-400">Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={() => onDeleteTick(tick.id)}
                      title="Undo this tick"
                      className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      {/* Next slot countdown */}
      {isLimitReached && nextSlotDate && daysUntilSlot !== null && (
        <p className="text-[10px] text-slate-500 mb-2">
          Next slot opens in{' '}
          <span className="font-semibold text-indigo-600">{daysUntilSlot} day{daysUntilSlot !== 1 ? 's' : ''}</span>
          {' '}(
          {nextSlotDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          )
        </p>
      )}
      {!isLimitReached && activeCount > 0 && nextSlotDate && daysUntilSlot !== null && (
        <p className="text-[10px] text-slate-400 mb-2">
          Oldest slot frees up in {daysUntilSlot} day{daysUntilSlot !== 1 ? 's' : ''} (
          {nextSlotDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          )
        </p>
      )}

      {/* Limit reached warning OR tick button */}
      {isLimitReached ? (
        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-2 rounded-lg">
          <span>🚫</span>
          <span>Rolling 30-Day Limit Reached</span>
        </div>
      ) : (
        <button
          onClick={onTick}
          disabled={isTickingThis}
          className="w-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2 rounded-lg transition-colors cursor-pointer disabled:cursor-wait flex items-center justify-center gap-1.5"
        >
          <span>＋</span>
          <span>{isTickingThis ? 'Recording…' : 'Tick Transfer'}</span>
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CardsOverview({
  cards,
  cardholders,
  cardTicks = [],
}: {
  cards: any[];
  cardholders: any[];
  cardTicks?: CardTick[];
}) {
  const [showTopupModal, setShowTopupModal] = useState<string | null>(null);
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [deletingCard, setDeletingCard] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tickingCardId, setTickingCardId] = useState<string | null>(null);
  const [tickError, setTickError] = useState<Record<string, string>>({});

  // Local optimistic tick store — starts from SSR data, mutations append/remove
  const [localTicks, setLocalTicks] = useState<CardTick[]>(cardTicks);

  const handleCreateCard = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await createCard(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setShowCreateCardModal(false);
    }
  };

  const handleUpdateCard = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await updateCard(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setEditingCard(null);
    }
  };

  const handleDeleteCard = async (formData: FormData) => {
    setErrorMsg(null);
    const res = await deleteCard(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setDeletingCard(null);
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

  const handleToggleStatus = async (cardId: string, currentStatus: boolean) => {
    setErrorMsg(null);
    const formData = new FormData();
    formData.append('card_id', cardId);
    formData.append('current_status', String(currentStatus));
    const res = await toggleCardStatus(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    }
  };

  const handleTickTransfer = async (cardId: string) => {
    setTickingCardId(cardId);
    setTickError(prev => ({ ...prev, [cardId]: '' }));
    const res = await tickCardTransfer(cardId);
    if (res?.error) {
      setTickError(prev => ({ ...prev, [cardId]: res.error! }));
    } else if (res?.tick) {
      // Optimistic: add the returned tick to local state
      setLocalTicks(prev => [...prev, { id: res.tick!.id, card_id: cardId, ticked_at: res.tick!.ticked_at }]);
    }
    setTickingCardId(null);
  };

  const handleDeleteTick = async (tickId: string, cardId: string) => {
    // Optimistic removal
    setLocalTicks(prev => prev.filter(t => t.id !== tickId));
    setTickError(prev => ({ ...prev, [cardId]: '' }));
    const res = await deleteCardTick(tickId);
    if (res?.error) {
      // Revert
      setTickError(prev => ({ ...prev, [cardId]: res.error! }));
      setLocalTicks(prev => {
        const original = cardTicks.find(t => t.id === tickId);
        return original ? [...prev, original] : prev;
      });
    }
  };

  const handleResetTicks = async (cardId: string) => {
    setTickError(prev => ({ ...prev, [cardId]: '' }));
    // Optimistic removal
    const removed = localTicks.filter(t => t.card_id === cardId);
    setLocalTicks(prev => prev.filter(t => t.card_id !== cardId));
    const res = await resetCardTicks(cardId);
    if (res?.error) {
      setTickError(prev => ({ ...prev, [cardId]: res.error! }));
      setLocalTicks(prev => [...prev, ...removed]);
    }
  };

  return (
    <div className="mb-8 relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Cards Overview</h2>
        <button
          onClick={() => { setErrorMsg(null); setShowCreateCardModal(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
        >
          + Add Card
        </button>
      </div>

      {/* Create Card Modal */}
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                <select name="brand" defaultValue="Mastercard" className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black bg-white">
                  <option value="Mastercard">Mastercard</option>
                  <option value="Visa">Visa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Max Transfers (Rolling 30-Day Limit) <span className="text-slate-400 font-normal">— optional</span>
                </label>
                <input
                  type="number"
                  name="max_transfers"
                  min="1"
                  step="1"
                  placeholder="e.g. 5"
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                />
                <p className="text-[11px] text-slate-400 mt-1">Leave blank to disable the transfer counter on this card.</p>
              </div>
              <div className="flex gap-3 mt-2">
                <button type="submit" className="flex-1 bg-slate-900 text-white font-medium py-2 rounded-lg cursor-pointer">Create</button>
                <button type="button" onClick={() => setShowCreateCardModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Card Modal */}
      {editingCard && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit Card</h3>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}
            <form action={handleUpdateCard} className="flex flex-col gap-4">
              <input type="hidden" name="card_id" value={editingCard.id} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Card Name</label>
                <input
                  type="text"
                  name="card_name"
                  defaultValue={editingCard.card_name}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cardholder Name</label>
                <input
                  type="text"
                  name="cardholder_name"
                  defaultValue={cardholders.find(c => c.id === editingCard.cardholder_id)?.name || ''}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                  <select
                    name="currency"
                    defaultValue={editingCard.currency || 'USD'}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black bg-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="IQD">IQD (د.ع)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                  <select
                    name="brand"
                    defaultValue={editingCard.brand || 'Mastercard'}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black bg-white"
                  >
                    <option value="Mastercard">Mastercard</option>
                    <option value="Visa">Visa</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Max Transfers (Rolling 30-Day Limit) <span className="text-slate-400 font-normal">— optional</span>
                </label>
                <input
                  type="number"
                  name="max_transfers"
                  min="1"
                  step="1"
                  defaultValue={editingCard.max_transfers ?? ''}
                  placeholder="e.g. 5 — leave blank to disable"
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button type="submit" className="flex-1 bg-slate-900 text-white font-medium py-2 rounded-lg cursor-pointer">Save Changes</button>
                <button type="button" onClick={() => setEditingCard(null)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Card Confirmation Modal */}
      {deletingCard && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Card</h3>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to delete <span className="font-semibold text-slate-900">{deletingCard.card_name}</span>? This action cannot be undone.</p>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm text-left">
                {errorMsg}
              </div>
            )}
            <form action={handleDeleteCard} className="flex gap-3">
              <input type="hidden" name="card_id" value={deletingCard.id} />
              <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg cursor-pointer">Delete</button>
              <button type="button" onClick={() => setDeletingCard(null)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 cursor-pointer">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map(card => {
          const owner = cardholders.find(c => c.id === card.cardholder_id);
          const cardCurrency = card.currency || 'USD';
          const isActive = card.is_active !== false;
          const cardTickError = tickError[card.id] || '';
          const isTickingThis = tickingCardId === card.id;
          const activeTicks = getActiveTicks(localTicks, card.id);

          return (
            <div
              key={card.id}
              className={`bg-white p-6 rounded-2xl border shadow-sm relative overflow-hidden transition-all ${
                isActive ? 'border-slate-100' : 'border-slate-200 bg-slate-50/70 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-medium text-slate-900">{card.card_name}</h3>
                    <button
                      onClick={() => { setErrorMsg(null); setEditingCard(card); }}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors cursor-pointer"
                      title="Edit Card"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button
                      onClick={() => { setErrorMsg(null); setDeletingCard(card); }}
                      className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                      title="Delete Card"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-slate-500">{owner?.name}</p>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {cardCurrency}
                    </span>
                    <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {card.brand || 'Card'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-slate-500 mb-1">Balance</p>
                <p className={`text-2xl font-semibold ${card.balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  {formatCurrency(card.balance, cardCurrency)}
                </p>
              </div>

              {/* Transfer Counter Section */}
              {card.max_transfers != null && isActive && (
                <>
                  <TransferCounterBadge
                    card={card}
                    activeTicks={activeTicks}
                    onTick={() => handleTickTransfer(card.id)}
                    onDeleteTick={(tickId) => handleDeleteTick(tickId, card.id)}
                    onReset={() => handleResetTicks(card.id)}
                    isTickingThis={isTickingThis}
                  />
                  {cardTickError && (
                    <p className="text-xs text-red-600 mt-1.5 font-medium">{cardTickError}</p>
                  )}
                </>
              )}

              <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100">
                {isActive ? (
                  <button
                    onClick={() => { setErrorMsg(null); setShowTopupModal(card.id); }}
                    className="text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors flex-1 cursor-pointer"
                  >
                    + Add Transaction
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 font-medium py-2 flex-1 text-center bg-slate-100 rounded-lg">
                    Transactions Disabled
                  </span>
                )}

                <button
                  onClick={() => handleToggleStatus(card.id, isActive)}
                  className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                    isActive
                      ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  {isActive ? 'Disable' : 'Enable'}
                </button>
              </div>

              {/* Record Transaction Inline Modal */}
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
                      <button type="submit" className="flex-1 bg-slate-900 text-white text-sm font-medium py-2 rounded-lg cursor-pointer">Save</button>
                      <button type="button" onClick={() => setShowTopupModal(null)} className="flex-1 bg-slate-100 text-slate-700 text-sm font-medium py-2 rounded-lg cursor-pointer">Cancel</button>
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
