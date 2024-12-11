import axios from "axios";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import ExchangeRate, { IExchangeRate } from "../models/ExchangeRate";
import dotenv from 'dotenv';
import { Buffer } from 'node:buffer';
dotenv.config();

const host = "garantex.org";
const privateKeyBase64 = process.env.GARANTEX_PRIVATE_KEY || "";
const uid = process.env.GARANTEX_UID || "";

async function getToken(): Promise<string | null> {
  const somedata = Buffer.from(privateKeyBase64, "base64").toString("ascii");

  try {
    let { data } = await axios.post(
      "https://dauth." + host + "/api/v1/sessions/generate_jwt",
      {
        kid: uid,
        jwt_token: jwt.sign(
          {
            exp: Math.round(Date.now() / 1000) + 30 * 60, // JWT Request TTL: 30 minutes
            jti: crypto.randomBytes(12).toString("hex"),
          },
          somedata,
          { algorithm: "RS256" }
        ),
      }
    );
    return data.token;
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function getUsdtToRubRate(token: string): Promise<number> {
  const { data } = await axios.get(`https://${host}/api/v2/depth?market=usdtrub`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  

  // Убедитесь, что data содержит нужную структуру
  // if (!Array.isArray(data) || data.length === 0) {
  //   throw new Error("Ответ от API не содержит данные или массив пуст");
  // }

  // Получаем первый элемент и извлекаем его цену
  const firstItem = data.asks[0]; // Убедитесь, что data[0] существует
  if (!firstItem || !firstItem.price) {
    throw new Error("Первый элемент данных не содержит цену");
  }

  return parseFloat(firstItem.price);
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

    // Получаем токен Garantex
    const token = await getToken();
    if (!token) {
      throw new Error("Не удалось получить токен для Garantex");
    }

    // Получаем курс USDT→RUB от Garantex
    const usdtToRubRate = await getUsdtToRubRate(token);

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
