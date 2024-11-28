import { currencies, ICurrency } from './currencies';

export function getDecimalPlaces(currency: string): number {
  const foundCurrency = currencies.find(c => c.symbol === currency);
  return foundCurrency ? foundCurrency.decimalPlaces : 6; // По умолчанию 6 знаков
}

export function formatAmount(amount: number, currency: string): string {
    if (currency === "RUB") {
      return Math.round(amount).toString(); // Целое число
    } else {
      const decimalPlaces = getDecimalPlaces(currency);
      return amount.toFixed(decimalPlaces).replace(/\.?0+$/, ''); // Удаляем лишние нули
    }
  }