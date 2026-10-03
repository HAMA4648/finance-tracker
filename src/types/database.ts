export type CurrencyType = 'USD' | 'EUR' | 'IQD';

export interface Cardholder {
  id: string;
  created_at: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface Card {
  id: string;
  created_at: string;
  cardholder_id: string;
  card_name: string;
  balance: number;
  currency?: CurrencyType | string;
  last_four?: string;
  brand?: string | null;
  is_active?: boolean;
  max_transfers?: number | null;
  transfers_used?: number;
  last_reset_date?: string | null;
}

export interface Transaction {
  id: string;
  created_at: string;
  card_id: string;
  amount: number;
  type: string;
  currency?: CurrencyType | string;
  description?: string | null;
  date?: string;
}

export interface Loan {
  id: string;
  created_at: string;
  cardholder_id: string;
  amount_loaned: number;
  amount_repaid: number;
  currency?: CurrencyType | string;
  notes?: string | null;
  status: string;
  date?: string;
}

export interface CardTick {
  id: string;
  card_id: string;
  ticked_at: string;
}

export interface Transfer {
  id: string;
  provider: 'moneygram' | 'western_union' | string;
  amount: number;
  currency: CurrencyType | string;
  recipient_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface PersonalExpense {
  id: string;
  created_at: string;
  description: string;
  amount: number;
  currency: CurrencyType | string;
  category?: string | null;
  spent_at: string;
  notes?: string | null;
}

export interface PersonalRevenue {
  id: string;
  created_at: string;
  description: string;
  amount: number;
  currency: CurrencyType | string;
  category?: string | null;
  received_at: string;
  notes?: string | null;
}

export interface Database {
  public: {
    Tables: {
      cardholders: {
        Row: Cardholder;
        Insert: Omit<Cardholder, 'id' | 'created_at'>;
        Update: Partial<Omit<Cardholder, 'id' | 'created_at'>>;
      };
      cards: {
        Row: Card;
        Insert: Omit<Card, 'id' | 'created_at'>;
        Update: Partial<Omit<Card, 'id' | 'created_at'>>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at'>;
        Update: Partial<Omit<Transaction, 'id' | 'created_at'>>;
      };
      loans: {
        Row: Loan;
        Insert: Omit<Loan, 'id' | 'created_at'>;
        Update: Partial<Omit<Loan, 'id' | 'created_at'>>;
      };
      transfers: {
        Row: Transfer;
        Insert: Omit<Transfer, 'id' | 'created_at'>;
        Update: Partial<Omit<Transfer, 'id' | 'created_at'>>;
      };
      personal_expenses: {
        Row: PersonalExpense;
        Insert: Omit<PersonalExpense, 'id' | 'created_at'>;
        Update: Partial<Omit<PersonalExpense, 'id' | 'created_at'>>;
      };
      personal_revenues: {
        Row: PersonalRevenue;
        Insert: Omit<PersonalRevenue, 'id' | 'created_at'>;
        Update: Partial<Omit<PersonalRevenue, 'id' | 'created_at'>>;
      };
      card_ticks: {
        Row: CardTick;
        Insert: Omit<CardTick, 'id'>;
        Update: Partial<Omit<CardTick, 'id'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
