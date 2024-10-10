import axios from "axios";
import ExchangeRate, { IExchangeRate } from "../models/ExchangeRate";

const API_KEY = process.env.API_KEY;

// const symbolMap: { [key: string]: string } = {
//   Sber: "RUB",
//   "T-Bank": "RUB",
  
//   // другие соответствия, если необходимо
// };

const currencies = ['BTC', 'ETH', 'USDT', 'LTC', 'TON', 'XMR', 'TRX', 'DOGE', 'USDC', 'SOL', 'DAI', 'ADA', 'RUB']; // Список валют, которые хотиm получить

export const fetchAndSaveExchangeRates = async () => {
  try {
    const response = await axios.get(
      "https://min-api.cryptocompare.com/data/pricemulti",
      {
        params: {
          fsyms: currencies.join(","),
          tsyms: "RUB",
        },
        headers: {
          authorization: `Apikey ${API_KEY}`,
        },
      }
    );

    const rawRates = response.data;
    const rates: { [key: string]: number } = {};

    // Преобразуем данные в формат, ожидаемый Mongoose
    for (const [currency, rateData] of Object.entries(rawRates)) {
      if (typeof rateData === 'object' && rateData !== null && 'RUB' in rateData) {
        const rubRate = rateData['RUB'];
        if (typeof rubRate === 'number') {
          rates[currency] = rubRate;
        }
      }
    }

    const exchangeRate = new ExchangeRate({ rates });
    await exchangeRate.save();
    console.log("Exchange rates updated:", rates);
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
  }
};

export const getLatestExchangeRates =
  async (): Promise<IExchangeRate | null> => {
    try {
      const latestRate = await ExchangeRate.findOne().sort({ timestamp: -1 });
      return latestRate;
    } catch (error) {
      console.error("Error fetching latest exchange rates:", error);
      return null;
    }
  };
