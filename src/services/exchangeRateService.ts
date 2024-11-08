import axios from "axios";
import ExchangeRate, { IExchangeRate } from "../models/ExchangeRate";

const currencies = [
  "bitcoin",
  "ethereum",
  "tether",
  "litecoin",
  "the-open-network",
  "monero",
  "tron",
  "dogecoin",
  "usd-coin",
  "solana",
  "dai",
  "cardano",
]; // Список валют, которые хотим получить

const currencyMap: { [key: string]: string } = {
  bitcoin: "BTC",
  ethereum: "ETH",
  tether: "USDT",
  litecoin: "LTC",
  "the-open-network": "TON",
  monero: "XMR",
  tron: "TRX",
  dogecoin: "DOGE",
  "usd-coin": "USDC",
  solana: "SOL",
  dai: "DAI",
  cardano: "ADA",
  rub: "RUB",
};

export const fetchAndSaveExchangeRates = async () => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price",
      {
        params: {
          ids: currencies.join(","),
          vs_currencies: "rub,usd",
        },
      }
    );

    const rawRates = response.data;
    // console.log("Raw rates from CoinGecko:", rawRates); // Добавлено логирование для отладки
    const rates: { [key: string]: { rub: number; usd: number } } = {};

    // Преобразуем данные в формат, ожидаемый Mongoose
    for (const [currency, rateData] of Object.entries(rawRates)) {
      if (
        typeof rateData === "object" &&
        rateData !== null &&
        "rub" in rateData &&
        "usd" in rateData
      ) {
        const rubRate = rateData["rub"];
        const usdRate = rateData["usd"];
        if (typeof rubRate === "number" && typeof usdRate === "number") {
          const mappedCurrency = currencyMap[currency];
          if (mappedCurrency) {
            rates[mappedCurrency] = { rub: rubRate, usd: usdRate };
          }
        }
      }
    }

    // Добавляем RUB и USD в список курсов
    if ("tether" in rawRates && "rub" in rawRates["tether"]) {
      const usdToRubRate = rawRates["tether"]["rub"];

      rates["RUB"] = { rub: 1, usd: parseFloat((1 / usdToRubRate).toFixed(4)) };
      rates["USD"] = { rub: parseFloat(usdToRubRate.toFixed(2)), usd: 1 };
    }

    // Используем findOneAndUpdate для обновления или создания записи
    const updatedExchangeRate = await ExchangeRate.findOneAndUpdate(
      {}, // Условие поиска: пустой объект, чтобы выбрать первый документ в коллекции
      { rates, timestamp: new Date() }, // Новые данные для обновления
      { upsert: true, new: true, setDefaultsOnInsert: true } // Опции: создать, если нет (upsert), вернуть новый документ (new)
    );

    console.log("Exchange rates updated:", updatedExchangeRate);
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
