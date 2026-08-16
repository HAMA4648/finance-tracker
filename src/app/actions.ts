'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

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
  const cardholderId = formData.get('cardholder_id') as string;
  const cardName = formData.get('card_name') as string;
  const brand = formData.get('brand') as string;

  if (!cardholderId || !cardName) return;

  const supabase = createAdminClient();
  await supabase.from('cards').insert({
    cardholder_id: cardholderId,
    card_name: cardName,
    balance: 0,
    brand
  });

  revalidatePath('/');
}

export async function issueLoan(formData: FormData) {
  const cardholderId = formData.get('cardholder_id') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const notes = formData.get('notes') as string;

  if (!cardholderId || isNaN(amount)) return;

  const supabase = createAdminClient();
  await supabase.from('loans').insert({
    cardholder_id: cardholderId,
    amount_loaned: amount,
    amount_repaid: 0,
    status: 'active',
    notes
  });

  revalidatePath('/');
}
