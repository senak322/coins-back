import axios from "axios";
import ExchangeRate, { IExchangeRate } from "../models/ExchangeRate";
import dotenv from 'dotenv';
dotenv.config();



async function getUsdtToRubRate(): Promise<any> {
  const {data} = await axios.get("https://api.rapira.net/open/market/rates")
  const price = data.data.find((el: any) => el.symbol === "USDT/RUB");
  

  return parseFloat(price.bidPrice);
}

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
];

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
};

export const fetchAndSaveExchangeRates = async () => {
  try {
    // Получаем курсы монет к USD от CoinGecko
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price",
      {
        params: {
          ids: currencies.join(","),
          vs_currencies: "usd",
        },
      }
    );
    const rawRates = response.data;

    const usdtToRubRate = await getUsdtToRubRate();

    const rates: { [key: string]: { rub: number; usd: number } } = {};

    // Преобразуем курсы валют из данных CoinGecko
    for (const [coin, rateData] of Object.entries(rawRates)) {
      if (typeof rateData === "object" && rateData !== null && "usd" in rateData) {
        const usdPrice = rateData["usd"];
        if (typeof usdPrice === "number") {
          const mappedCurrency = currencyMap[coin];
          if (mappedCurrency) {
            const rubPrice = usdPrice * usdtToRubRate; // Переводим в RUB
            rates[mappedCurrency] = { rub: rubPrice, usd: usdPrice };
          }
        }
      }
    }

    // Добавляем USDT и RUB
    rates["USDT"] = { rub: usdtToRubRate, usd: 1 };
    rates["RUB"] = { rub: 1, usd: 1 / usdtToRubRate };

    // Сохраняем в базу данных
    const updatedExchangeRate = await ExchangeRate.findOneAndUpdate(
      {},
      { rates, timestamp: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
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
