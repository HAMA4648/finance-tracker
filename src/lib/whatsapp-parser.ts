import { createAdminClient } from '@/lib/supabase/admin';

export async function processWhatsAppMessage(messageText: string): Promise<string> {
  const supabase = createAdminClient();
  const trimmed = messageText.trim();
  const parts = trimmed.split(/\s+/);
  
  if (parts.length === 0) return 'Empty message';

  const action = parts[0].toUpperCase();

  try {
    if (action === 'EXPENSE') {
      if (parts.length < 3) return 'Usage: EXPENSE <card_name> <amount> <description>';
      const cardName = parts[1];
      const amount = parseFloat(parts[2]);
      const description = parts.slice(3).join(' ');

      const { data: cards, error: cardError } = await supabase
        .from('cards')
        .select('*')
        .ilike('card_name', cardName)
        .limit(1);

      if (cardError || !cards || cards.length === 0) return `Card not found: ${cardName}`;
      const card = cards[0];

      const newBalance = card.balance - amount;
      const { error: updateError } = await supabase
        .from('cards')
        .update({ balance: newBalance })
        .eq('id', card.id);

      if (updateError) return `Failed to update balance: ${updateError.message}`;

      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          card_id: card.id,
          amount: amount,
          type: 'expense',
          description: description
        });

      if (txError) return `Failed to insert transaction: ${txError.message}`;

      return `Successfully recorded EXPENSE of ${amount} on ${card.card_name}. New balance: ${newBalance}.`;
    }

    if (action === 'TOPUP') {
      if (parts.length < 3) return 'Usage: TOPUP <card_name> <amount> <description>';
      const cardName = parts[1];
      const amount = parseFloat(parts[2]);
      const description = parts.slice(3).join(' ');

      const { data: cards, error: cardError } = await supabase
        .from('cards')
        .select('*')
        .ilike('card_name', cardName)
        .limit(1);

      if (cardError || !cards || cards.length === 0) return `Card not found: ${cardName}`;
      const card = cards[0];

      const newBalance = card.balance + amount;
      const { error: updateError } = await supabase
        .from('cards')
        .update({ balance: newBalance })
        .eq('id', card.id);

      if (updateError) return `Failed to update balance: ${updateError.message}`;

      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          card_id: card.id,
          amount: amount,
          type: 'top_up',
          description: description
        });

      if (txError) return `Failed to insert transaction: ${txError.message}`;

      return `Successfully recorded TOPUP of ${amount} on ${card.card_name}. New balance: ${newBalance}.`;
    }

    if (action === 'LOAN') {
      if (parts.length < 3) return 'Usage: LOAN <person_name> <amount> <notes>';
      const personName = parts[1];
      const amount = parseFloat(parts[2]);
      const notes = parts.slice(3).join(' ');

      let cardholderId: string;
      const { data: persons, error: personError } = await supabase
        .from('cardholders')
        .select('*')
        .ilike('name', personName)
        .limit(1);

      if (personError) return `Error finding person: ${personError.message}`;

      if (!persons || persons.length === 0) {
        const { data: newPerson, error: insertError } = await supabase
          .from('cardholders')
          .insert({ name: personName })
          .select()
          .single();

        if (insertError) return `Failed to create person: ${insertError.message}`;
        cardholderId = newPerson.id;
      } else {
        cardholderId = persons[0].id;
      }

      const { error: loanError } = await supabase
        .from('loans')
        .insert({
          cardholder_id: cardholderId,
          amount_loaned: amount,
          amount_repaid: 0,
          status: 'active',
          notes: notes
        });

      if (loanError) return `Failed to create loan: ${loanError.message}`;

      return `Successfully recorded LOAN of ${amount} to ${personName}.`;
    }

    if (action === 'REPAY') {
      if (parts.length < 3) return 'Usage: REPAY <person_name> <amount>';
      const personName = parts[1];
      const amount = parseFloat(parts[2]);

      const { data: persons, error: personError } = await supabase
        .from('cardholders')
        .select('*')
        .ilike('name', personName)
        .limit(1);

      if (personError || !persons || persons.length === 0) return `Person not found: ${personName}`;
      const person = persons[0];

      const { data: loans, error: loanSearchError } = await supabase
        .from('loans')
        .select('*')
        .eq('cardholder_id', person.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1);

      if (loanSearchError || !loans || loans.length === 0) return `No active loan found for ${personName}`;
      const loan = loans[0];

      const newRepaid = loan.amount_repaid + amount;
      const newStatus = newRepaid >= loan.amount_loaned ? 'paid_off' : 'active';

      const { error: loanUpdateError } = await supabase
        .from('loans')
        .update({
          amount_repaid: newRepaid,
          status: newStatus
        })
        .eq('id', loan.id);

      if (loanUpdateError) return `Failed to update loan: ${loanUpdateError.message}`;

      return `Successfully recorded REPAY of ${amount} from ${personName}. Loan is now ${newStatus}.`;
    }

    return `Unknown action: ${action}. Valid actions: EXPENSE, TOPUP, LOAN, REPAY.`;
  } catch (err: any) {
    return `Error processing message: ${err.message}`;
  }
}
