import { createClient } from '@/lib/supabase/server';
import DashboardTabs from '@/components/DashboardTabs';

export default async function Dashboard() {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: cards },
    { data: cardholders },
    { data: loans },
    { data: transactions },
    { data: transfers },
    { data: personalExpenses },
    { data: personalRevenues },
    { data: cardTicks },
    { data: sheinExpenses },
    { data: sheinRevenues }
  ] = await Promise.all([
    supabase.from('cards').select('*'),
    supabase.from('cardholders').select('*'),
    supabase.from('loans').select('*').order('created_at', { ascending: false }),
    supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('transfers').select('*').order('created_at', { ascending: false }),
    supabase.from('personal_expenses').select('*').order('spent_at', { ascending: false }),
    supabase.from('personal_revenues').select('*').order('received_at', { ascending: false }),
    supabase.from('card_ticks').select('*').gte('ticked_at', thirtyDaysAgo).order('ticked_at', { ascending: true }),
    supabase.from('shein_expenses').select('*').order('spent_at', { ascending: false }),
    supabase.from('shein_revenues').select('*').order('received_at', { ascending: false })
  ]);

  return (
    <DashboardTabs
      cards={(cards || []) as any[]}
      cardholders={(cardholders || []) as any[]}
      loans={(loans || []) as any[]}
      transactions={(transactions || []) as any[]}
      transfers={(transfers || []) as any[]}
      personalExpenses={(personalExpenses || []) as any[]}
      personalRevenues={(personalRevenues || []) as any[]}
      cardTicks={(cardTicks || []) as any[]}
      sheinExpenses={(sheinExpenses || []) as any[]}
      sheinRevenues={(sheinRevenues || []) as any[]}
    />
  );
}
