import axios from 'axios';
import ExchangeRate, { IExchangeRate } from '../models/ExchangeRate';

const API_KEY = process.env.API_KEY;

const symbolMap: { [key: string]: string } = {
  'Sber': 'RUB',
  'T-Bank': 'RUB',
  // другие соответствия, если необходимо
};

const currencies = ['BTC', 'ETH', 'USDT', 'RUB']; // Список валют, которые вы хотите получить

export const fetchAndSaveExchangeRates = async () => {
  try {
    const rates: { [key: string]: number } = {};

    for (const currency of currencies) {
      const symbol = symbolMap[currency] || currency;
      const response = await axios.get(
        'https://min-api.cryptocompare.com/data/price',
        {
          params: {
            fsym: symbol,
            tsyms: currencies.join(','),
          },
          headers: {
            authorization: `Apikey ${API_KEY}`,
          },
        }
      );

      rates[symbol] = response.data.RUB; // Предполагается, что вы получаете курс к RUB
    }

    const exchangeRate = new ExchangeRate({ rates });
    await exchangeRate.save();
    console.log('Exchange rates updated:', rates);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
  }
};

export const getLatestExchangeRates = async (): Promise<IExchangeRate | null> => {
  try {
    const latestRate = await ExchangeRate.findOne().sort({ timestamp: -1 });
    return latestRate;
  } catch (error) {
    console.error('Error fetching latest exchange rates:', error);
    return null;
  }
};
