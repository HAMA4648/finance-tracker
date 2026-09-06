import { createClient } from '@/lib/supabase/server';
import SummaryCards from '@/components/SummaryCards';
import CardsOverview from '@/components/CardsOverview';
import LoanTracker from '@/components/LoanTracker';
import TransactionFeed from '@/components/TransactionFeed';
import { revalidatePath } from 'next/cache';
import { logoutAction } from '@/app/actions';

export default async function Dashboard() {
  const supabase = await createClient();

  const [{ data: cards }, { data: cardholders }, { data: loans }, { data: transactions }] = await Promise.all([
    supabase.from('cards').select('*'),
    supabase.from('cardholders').select('*'),
    supabase.from('loans').select('*').order('created_at', { ascending: false }),
    supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(20)
  ]);

  const safeCards = cards || [];
  const safeLoans = loans || [];
  const safeTransactions = transactions || [];
  const safeCardholders = cardholders || [];

  const totalBalance = safeCards.reduce((sum, card) => sum + (Number(card.balance) || 0), 0);
  const activeLoans = safeLoans.filter(l => l.status === 'active').reduce((sum, loan) => sum + (Number(loan.amount_loaned) - Number(loan.amount_repaid)), 0);
  const cardsCount = safeCards.length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Finance Dashboard</h1>
            <p className="text-slate-500 mt-1">Manage cards, transactions, and micro-loans</p>
          </div>
          <div className="flex items-center gap-3">
            <form action={async () => { 'use server'; revalidatePath('/'); }}>
              <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">
                Refresh Data
              </button>
            </form>
            <form action={logoutAction}>
              <button type="submit" className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
                Log Out
              </button>
            </form>
          </div>
        </header>

        <SummaryCards totalBalance={totalBalance} activeLoans={activeLoans} cardsCount={cardsCount} />

        <CardsOverview cards={safeCards as any[]} cardholders={safeCardholders as any[]} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <LoanTracker loans={safeLoans as any[]} cardholders={safeCardholders as any[]} />
          <TransactionFeed transactions={safeTransactions as any[]} cards={safeCards as any[]} />
        </div>
      </div>
    </div>
  );
}
