'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

export async function loginAction(prevState: { error?: string } | undefined, formData: FormData) {
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
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  redirect('/login');
}

export async function addTransaction(formData: FormData) {
  const cardId = formData.get('card_id') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const type = formData.get('type') as string;
  const description = formData.get('description') as string;

  if (!cardId || isNaN(amount) || !type) return;

  const supabase = createAdminClient();

  const { data: card } = await supabase.from('cards').select('balance').eq('id', cardId).single();
  if (!card) return;

  const newBalance = type === 'expense' ? card.balance - amount : card.balance + amount;

  await supabase.from('cards').update({ balance: newBalance }).eq('id', cardId);
  await supabase.from('transactions').insert({
    card_id: cardId,
    amount,
    type,
    description
  });

  revalidatePath('/');
}

export async function addLoanRepayment(formData: FormData) {
  const loanId = formData.get('loan_id') as string;
  const amount = parseFloat(formData.get('amount') as string);

  if (!loanId || isNaN(amount)) return;

  const supabase = createAdminClient();
  const { data: loan } = await supabase.from('loans').select('*').eq('id', loanId).single();
  if (!loan) return;

  const newRepaid = loan.amount_repaid + amount;
  const newStatus = newRepaid >= loan.amount_loaned ? 'paid_off' : 'active';

  await supabase.from('loans').update({
    amount_repaid: newRepaid,
    status: newStatus
  }).eq('id', loanId);

  revalidatePath('/');
}

export async function createCard(formData: FormData) {
  const cardholderName = formData.get('cardholder_name') as string;
  const cardName = formData.get('card_name') as string;
  const initialBalance = parseFloat(formData.get('initial_balance') as string) || 0;
  const brand = 'Mastercard'; // Defaulting for simplicity

  if (!cardholderName || !cardName) return;

  const supabase = createAdminClient();
  
  let cardholderId: string;
  const { data: persons } = await supabase.from('cardholders').select('id').ilike('name', cardholderName).limit(1);
  if (persons && persons.length > 0) {
    cardholderId = persons[0].id;
  } else {
    const { data: newPerson } = await supabase.from('cardholders').insert({ name: cardholderName }).select().single();
    if (!newPerson) return;
    cardholderId = newPerson.id;
  }

  await supabase.from('cards').insert({
    cardholder_id: cardholderId,
    card_name: cardName,
    balance: initialBalance,
    brand
  });

  revalidatePath('/');
}

export async function issueLoan(formData: FormData) {
  const borrowerName = formData.get('borrower_name') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const notes = formData.get('notes') as string;

  if (!borrowerName || isNaN(amount)) return;

  const supabase = createAdminClient();

  let cardholderId: string;
  const { data: persons } = await supabase.from('cardholders').select('id').ilike('name', borrowerName).limit(1);
  if (persons && persons.length > 0) {
    cardholderId = persons[0].id;
  } else {
    const { data: newPerson } = await supabase.from('cardholders').insert({ name: borrowerName }).select().single();
    if (!newPerson) return;
    cardholderId = newPerson.id;
  }

  await supabase.from('loans').insert({
    cardholder_id: cardholderId,
    amount_loaned: amount,
    amount_repaid: 0,
    status: 'active',
    notes
  });

  revalidatePath('/');
}
