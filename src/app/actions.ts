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
      .select('balance, currency')
      .eq('id', cardId)
      .single();

    if (fetchErr || !card) return { error: fetchErr?.message || 'Card not found' };

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
      brand: brand
    });

    if (insertCardErr) return { error: insertCardErr.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to create card' };
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
