import { createClient } from '@/lib/supabase/server';
import DashboardTabs from '@/components/DashboardTabs';

export default async function Dashboard() {
  const supabase = await createClient();

  const [
    { data: cards },
    { data: cardholders },
    { data: loans },
    { data: transactions },
    { data: transfers },
    { data: personalExpenses }
  ] = await Promise.all([
    supabase.from('cards').select('*'),
    supabase.from('cardholders').select('*'),
    supabase.from('loans').select('*').order('created_at', { ascending: false }),
    supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('transfers').select('*').order('created_at', { ascending: false }),
    supabase.from('personal_expenses').select('*').order('spent_at', { ascending: false })
  ]);

  return (
    <DashboardTabs
      cards={(cards || []) as any[]}
      cardholders={(cardholders || []) as any[]}
      loans={(loans || []) as any[]}
      transactions={(transactions || []) as any[]}
      transfers={(transfers || []) as any[]}
      personalExpenses={(personalExpenses || []) as any[]}
    />
  );
}
