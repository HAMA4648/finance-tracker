'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

export async function loginAction(prevState: { error?: string } | undefined, formData: FormData) {
  try {
    const password = formData.get('password') as string;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!password || password !== adminPassword) {
      return { error: 'Invalid password. Please try again.' };
    }

    const cookieStore = await cookies();
    cookieStore.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax',
    });

    redirect('/');
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    return { error: err.message || 'Login failed' };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  redirect('/login');
}

export async function addTransaction(formData: FormData) {
  try {
    const cardId = formData.get('card_id') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const type = formData.get('type') as string;
    const description = formData.get('description') as string;

    if (!cardId || isNaN(amount) || !type) return { error: 'Invalid transaction inputs' };

    const supabase = createAdminClient();

    const { data: card, error: fetchErr } = await supabase
      .from('cards')
      .select('balance, currency, is_active')
      .eq('id', cardId)
      .single();

    if (fetchErr || !card) return { error: fetchErr?.message || 'Card not found' };
    if (card.is_active === false) return { error: 'Card is disabled and cannot process transactions' };

    const currentBalance = Number(card.balance) || 0;
    const newBalance = type === 'expense' ? currentBalance - amount : currentBalance + amount;

    const { error: updateErr } = await supabase
      .from('cards')
      .update({ balance: newBalance })
      .eq('id', cardId);

    if (updateErr) return { error: updateErr.message };

    const { error: insertErr } = await supabase.from('transactions').insert({
      card_id: cardId,
      amount,
      type,
      currency: card.currency || 'USD',
      description
    });

    if (insertErr) return { error: insertErr.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Transaction failed' };
  }
}

export async function deleteTransaction(formData: FormData) {
  try {
    const transactionId = formData.get('transaction_id') as string;
    if (!transactionId) return { error: 'Transaction ID is required' };

    const supabase = createAdminClient();

    const { data: tx, error: fetchErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchErr || !tx) return { error: fetchErr?.message || 'Transaction not found' };

    if (tx.card_id) {
      const { data: card } = await supabase
        .from('cards')
        .select('balance')
        .eq('id', tx.card_id)
        .single();

      if (card) {
        const currentBalance = Number(card.balance) || 0;
        const txAmount = Number(tx.amount) || 0;
        const adjustedBalance = tx.type === 'expense' ? currentBalance + txAmount : currentBalance - txAmount;

        await supabase.from('cards').update({ balance: adjustedBalance }).eq('id', tx.card_id);
      }
    }

    const { error: deleteErr } = await supabase.from('transactions').delete().eq('id', transactionId);
    if (deleteErr) return { error: deleteErr.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete transaction' };
  }
}

export async function addLoanRepayment(formData: FormData) {
  try {
    const loanId = formData.get('loan_id') as string;
    const amount = parseFloat(formData.get('amount') as string);

    if (!loanId || isNaN(amount)) return { error: 'Invalid repayment inputs' };

    const supabase = createAdminClient();
    const { data: loan, error: fetchErr } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (fetchErr || !loan) return { error: fetchErr?.message || 'Loan not found' };

    const newRepaid = (Number(loan.amount_repaid) || 0) + amount;
    const newStatus = newRepaid >= Number(loan.amount_loaned) ? 'paid_off' : 'active';

    const { error: updateErr } = await supabase
      .from('loans')
      .update({
        amount_repaid: newRepaid,
        status: newStatus
      })
      .eq('id', loanId);

    if (updateErr) return { error: updateErr.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Loan repayment failed' };
  }
}

export async function createCard(formData: FormData) {
  try {
    const cardholderName = (formData.get('cardholder_name') as string)?.trim();
    const cardName = (formData.get('card_name') as string)?.trim();
    const initialBalance = parseFloat(formData.get('initial_balance') as string) || 0;
    const currency = (formData.get('currency') as string) || 'USD';
    const formBrand = (formData.get('brand') as string)?.trim();
    const brand = formBrand || 'Mastercard';

    if (!cardholderName || !cardName) return { error: 'Cardholder name and Card name are required' };

    const supabase = createAdminClient();
    
    let cardholderId: string;
    const { data: persons, error: searchErr } = await supabase
      .from('cardholders')
      .select('id')
      .ilike('name', cardholderName)
      .limit(1);

    if (searchErr) return { error: searchErr.message };

    if (persons && persons.length > 0) {
      cardholderId = persons[0].id;
    } else {
      const { data: newPerson, error: insertPersonErr } = await supabase
        .from('cardholders')
        .insert({ name: cardholderName })
        .select()
        .single();

      if (insertPersonErr || !newPerson) return { error: insertPersonErr?.message || 'Failed to create cardholder' };
      cardholderId = newPerson.id;
    }

    const { error: insertCardErr } = await supabase.from('cards').insert({
      cardholder_id: cardholderId,
      card_name: cardName,
      balance: initialBalance,
      currency: currency,
      brand: brand,
      is_active: true
    });

    if (insertCardErr) return { error: insertCardErr.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to create card' };
  }
}

export async function updateCard(formData: FormData) {
  try {
    const cardId = formData.get('card_id') as string;
    const cardName = (formData.get('card_name') as string)?.trim();
    const cardholderName = (formData.get('cardholder_name') as string)?.trim();
    const currency = (formData.get('currency') as string) || 'USD';
    const brand = (formData.get('brand') as string)?.trim() || 'Mastercard';

    if (!cardId || !cardName || !cardholderName) {
      return { error: 'Card ID, Card name, and Cardholder name are required' };
    }

    const supabase = createAdminClient();

    let cardholderId: string;
    const { data: persons, error: searchErr } = await supabase
      .from('cardholders')
      .select('id')
      .ilike('name', cardholderName)
      .limit(1);

    if (searchErr) return { error: searchErr.message };

    if (persons && persons.length > 0) {
      cardholderId = persons[0].id;
    } else {
      const { data: newPerson, error: insertPersonErr } = await supabase
        .from('cardholders')
        .insert({ name: cardholderName })
        .select()
        .single();

      if (insertPersonErr || !newPerson) return { error: insertPersonErr?.message || 'Failed to create cardholder' };
      cardholderId = newPerson.id;
    }

    const { error: updateErr } = await supabase
      .from('cards')
      .update({
        card_name: cardName,
        cardholder_id: cardholderId,
        currency,
        brand
      })
      .eq('id', cardId);

    if (updateErr) return { error: updateErr.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update card' };
  }
}

export async function deleteCard(formData: FormData) {
  try {
    const cardId = formData.get('card_id') as string;
    if (!cardId) return { error: 'Card ID is required' };

    const supabase = createAdminClient();
    const { error: deleteErr } = await supabase.from('cards').delete().eq('id', cardId);
    if (deleteErr) return { error: deleteErr.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete card' };
  }
}

export async function toggleCardStatus(formData: FormData) {
  try {
    const cardId = formData.get('card_id') as string;
    const currentStatus = formData.get('current_status') === 'true';

    if (!cardId) return { error: 'Card ID is required' };

    const supabase = createAdminClient();
    const newStatus = !currentStatus;

    const { error: updateErr } = await supabase
      .from('cards')
      .update({ is_active: newStatus })
      .eq('id', cardId);

    if (updateErr) return { error: updateErr.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to toggle card status' };
  }
}

export async function issueLoan(formData: FormData) {
  try {
    const borrowerName = (formData.get('borrower_name') as string)?.trim();
    const amount = parseFloat(formData.get('amount') as string);
    const currency = (formData.get('currency') as string) || 'USD';
    const notes = formData.get('notes') as string;

    if (!borrowerName || isNaN(amount)) return { error: 'Borrower name and Amount are required' };

    const supabase = createAdminClient();

    let cardholderId: string;
    const { data: persons, error: searchErr } = await supabase
      .from('cardholders')
      .select('id')
      .ilike('name', borrowerName)
      .limit(1);

    if (searchErr) return { error: searchErr.message };

    if (persons && persons.length > 0) {
      cardholderId = persons[0].id;
    } else {
      const { data: newPerson, error: insertPersonErr } = await supabase
        .from('cardholders')
        .insert({ name: borrowerName })
        .select()
        .single();

      if (insertPersonErr || !newPerson) return { error: insertPersonErr?.message || 'Failed to create cardholder' };
      cardholderId = newPerson.id;
    }

    const { error: insertLoanErr } = await supabase.from('loans').insert({
      cardholder_id: cardholderId,
      amount_loaned: amount,
      amount_repaid: 0,
      currency,
      status: 'active',
      notes
    });

    if (insertLoanErr) return { error: insertLoanErr.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to issue loan' };
  }
}

export async function updateLoan(formData: FormData) {
  try {
    const loanId = formData.get('loan_id') as string;
    const borrowerName = (formData.get('borrower_name') as string)?.trim();
    const amount = parseFloat(formData.get('amount') as string);
    const currency = (formData.get('currency') as string) || 'USD';
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!loanId || !borrowerName || isNaN(amount)) {
      return { error: 'Loan ID, Borrower name, and Amount are required' };
    }

    const supabase = createAdminClient();

    let cardholderId: string;
    const { data: persons, error: searchErr } = await supabase
      .from('cardholders')
      .select('id')
      .ilike('name', borrowerName)
      .limit(1);

    if (searchErr) return { error: searchErr.message };

    if (persons && persons.length > 0) {
      cardholderId = persons[0].id;
    } else {
      const { data: newPerson, error: insertPersonErr } = await supabase
        .from('cardholders')
        .insert({ name: borrowerName })
        .select()
        .single();

      if (insertPersonErr || !newPerson) return { error: insertPersonErr?.message || 'Failed to create cardholder' };
      cardholderId = newPerson.id;
    }

    const { data: loan } = await supabase.from('loans').select('amount_repaid').eq('id', loanId).single();
    const amountRepaid = Number(loan?.amount_repaid) || 0;
    const newStatus = amountRepaid >= amount ? 'paid_off' : 'active';

    const { error: updateErr } = await supabase
      .from('loans')
      .update({
        cardholder_id: cardholderId,
        amount_loaned: amount,
        currency,
        notes,
        status: newStatus
      })
      .eq('id', loanId);

    if (updateErr) return { error: updateErr.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update loan' };
  }
}

export async function deleteLoan(formData: FormData) {
  try {
    const loanId = formData.get('loan_id') as string;
    if (!loanId) return { error: 'Loan ID is required' };

    const supabase = createAdminClient();
    const { error: deleteErr } = await supabase.from('loans').delete().eq('id', loanId);
    if (deleteErr) return { error: deleteErr.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete loan' };
  }
}

export async function addTransfer(formData: FormData) {
  try {
    const provider = (formData.get('provider') as string)?.trim().toLowerCase();
    const amount = parseFloat(formData.get('amount') as string);
    const currency = (formData.get('currency') as string) || 'USD';
    const recipientName = (formData.get('recipient_name') as string)?.trim() || null;
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!provider || isNaN(amount)) {
      return { error: 'Provider and valid amount are required' };
    }

    const supabase = createAdminClient();

    const { error: insertErr } = await supabase.from('transfers').insert({
      provider,
      amount,
      currency,
      recipient_name: recipientName,
      notes
    });

    if (insertErr) return { error: insertErr.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to record transfer' };
  }
}

export async function updateTransfer(formData: FormData) {
  try {
    const transferId = formData.get('transfer_id') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const currency = (formData.get('currency') as string) || 'USD';
    const recipientName = (formData.get('recipient_name') as string)?.trim() || null;
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!transferId || isNaN(amount)) {
      return { error: 'Transfer ID and valid amount are required' };
    }

    const supabase = createAdminClient();

    const { error: updateErr } = await supabase
      .from('transfers')
      .update({
        amount,
        currency,
        recipient_name: recipientName,
        notes
      })
      .eq('id', transferId);

    if (updateErr) return { error: updateErr.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update transfer' };
  }
}

export async function deleteTransfer(formData: FormData) {
  try {
    const transferId = formData.get('transfer_id') as string;
    if (!transferId) return { error: 'Transfer ID is required' };

    const supabase = createAdminClient();
    const { error: deleteErr } = await supabase.from('transfers').delete().eq('id', transferId);
    if (deleteErr) return { error: deleteErr.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete transfer' };
  }
}

// ─── Backup Action ────────────────────────────────────────────────────────────

export async function triggerBackupAction(): Promise<{ success?: boolean; file?: string; error?: string }> {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return { error: 'CRON_SECRET is not configured on the server.' };
    }

    const supabase = createAdminClient();

    // Fetch all data in parallel
    const [
      { data: cards, error: cardsError },
      { data: cardholders, error: cardholdersError },
      { data: loans, error: loansError },
      { data: loanRepayments, error: repayError },
      { data: transactions, error: txError },
      { data: transfers, error: transfersError },
    ] = await Promise.all([
      supabase.from('cards').select('*').order('created_at', { ascending: true }),
      supabase.from('cardholders').select('*').order('created_at', { ascending: true }),
      supabase.from('loans').select('*').order('created_at', { ascending: true }),
      supabase.from('loan_repayments').select('*').order('created_at', { ascending: true }),
      supabase.from('transactions').select('*').order('created_at', { ascending: true }),
      supabase.from('transfers').select('*').order('created_at', { ascending: true }),
    ]);

    const errors = [cardsError, cardholdersError, loansError, repayError, txError, transfersError]
      .filter(Boolean)
      .map((e: any) => e?.message);

    if (errors.length > 0) {
      return { error: `Data fetch failed: ${errors.join('; ')}` };
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
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
      },
      summary: {
        cards_count: (cards ?? []).length,
        cardholders_count: (cardholders ?? []).length,
        loans_count: (loans ?? []).length,
        loan_repayments_count: (loanRepayments ?? []).length,
        transactions_count: (transactions ?? []).length,
        transfers_count: (transfers ?? []).length,
      },
    };

    const fileName = `backup_${dateStr}.json`;
    const fileContent = JSON.stringify(backupPayload, null, 2);
    const fileBytes = new TextEncoder().encode(fileContent);

    const { error: uploadError } = await supabase.storage
      .from('database-backups')
      .upload(fileName, fileBytes, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      return { error: `Storage upload failed: ${uploadError.message}` };
    }

    return { success: true, file: fileName };
  } catch (err: any) {
    return { error: err.message || 'Backup failed unexpectedly.' };
  }
}
