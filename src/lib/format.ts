export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const code = (currency || 'USD').toUpperCase();
  const num = Number(amount) || 0;

  if (code === 'EUR') {
    return `€${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (code === 'IQD') {
    return `${Math.round(num).toLocaleString('en-US')} د.ع`;
  }

  // Default USD
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
