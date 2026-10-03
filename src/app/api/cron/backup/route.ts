import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron or an authorized manual trigger
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Fetch all data in parallel
    const [
      { data: cards, error: cardsError },
      { data: cardholders, error: cardholdersError },
      { data: loans, error: loansError },
      { data: loanRepayments, error: repayError },
      { data: transactions, error: txError },
      { data: transfers, error: transfersError },
      { data: personalExpenses, error: personalErr },
      { data: personalRevenues, error: revenueErr },
      { data: sheinExpenses, error: sheinExpensesErr },
      { data: sheinRevenues, error: sheinRevenuesErr },
    ] = await Promise.all([
      supabase.from('cards').select('*').order('created_at', { ascending: true }),
      supabase.from('cardholders').select('*').order('created_at', { ascending: true }),
      supabase.from('loans').select('*').order('created_at', { ascending: true }),
      supabase.from('loan_repayments').select('*').order('created_at', { ascending: true }),
      supabase.from('transactions').select('*').order('created_at', { ascending: true }),
      supabase.from('transfers').select('*').order('created_at', { ascending: true }),
      supabase.from('personal_expenses').select('*').order('created_at', { ascending: true }),
      supabase.from('personal_revenues').select('*').order('created_at', { ascending: true }),
      supabase.from('shein_expenses').select('*').order('created_at', { ascending: true }),
      supabase.from('shein_revenues').select('*').order('created_at', { ascending: true }),
    ]);

    // Collect any errors
    const errors = [
      cardsError, cardholdersError, loansError, repayError, txError, transfersError,
      personalErr, revenueErr, sheinExpensesErr, sheinRevenuesErr
    ]
      .filter(Boolean)
      .map(e => e?.message);

    if (errors.length > 0) {
      console.error('Backup fetch errors:', errors);
      return NextResponse.json({ error: `Fetch failed: ${errors.join('; ')}` }, { status: 500 });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timestamp = now.toISOString();

    const backupPayload = {
      timestamp,
      generated_at: timestamp,
      version: '1.0',
      tables: {
        cards: cards ?? [],
        cardholders: cardholders ?? [],
        loans: loans ?? [],
        loan_repayments: loanRepayments ?? [],
        transactions: transactions ?? [],
        transfers: transfers ?? [],
        personal_expenses: personalExpenses ?? [],
        personal_revenues: personalRevenues ?? [],
        shein_expenses: sheinExpenses ?? [],
        shein_revenues: sheinRevenues ?? [],
      },
      summary: {
        cards_count: (cards ?? []).length,
        cardholders_count: (cardholders ?? []).length,
        loans_count: (loans ?? []).length,
        loan_repayments_count: (loanRepayments ?? []).length,
        transactions_count: (transactions ?? []).length,
        transfers_count: (transfers ?? []).length,
        personal_expenses_count: (personalExpenses ?? []).length,
        personal_revenues_count: (personalRevenues ?? []).length,
        shein_expenses_count: (sheinExpenses ?? []).length,
        shein_revenues_count: (sheinRevenues ?? []).length,
      },
    };

    const fileName = `backup_${dateStr}.json`;
    const fileContent = JSON.stringify(backupPayload, null, 2);
    const fileBytes = new TextEncoder().encode(fileContent);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('database-backups')
      .upload(fileName, fileBytes, {
        contentType: 'application/json',
        upsert: true, // overwrite if same date backup already exists
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    console.log(`✅ Backup created: ${fileName}`);
    return NextResponse.json({
      success: true,
      file: fileName,
      timestamp,
      summary: backupPayload.summary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Backup error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
