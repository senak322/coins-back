import { Router, Request, Response } from "express";
import { getLatestExchangeRates } from "../services/exchangeRateService";

const router = Router();

const usdtCommissionTiers = [
  { min: 5000, max: 50000, commission: 0.04 }, // 4%
  { min: 50001, max: 100000, commission: 0.03 }, // 3%
  { min: 100001, max: 10000000, commission: 0.025 }, // 2.5%
];

// Commission tiers for BTC
const btcCommissionTiers = [
  { min: 5000, max: 50000, commission: 0.06 }, // 6%
  { min: 50001, max: 100000, commission: 0.05 }, // 5%
  { min: 100001, max: 10000000, commission: 0.04 }, // 4%
];

// Commission tiers for other altcoins
const altCommissionTiers = [
  { min: 5000, max: 100000, commission: 0.05 }, // 5%
  { min: 100001, max: 10000000, commission: 0.06 }, // 6%
];

function getCommission(currency: string, amount: number): number {
  let commissionTiers;

  if (currency === "USDT") {
    commissionTiers = usdtCommissionTiers;
  } else if (currency === "BTC") {
    commissionTiers = btcCommissionTiers;
  } else {
    commissionTiers = altCommissionTiers;
  }

  for (const tier of commissionTiers) {
    if (amount >= tier.min && amount < tier.max) {
      // console.log(`Комиссия для суммы ${amount}: ${tier.commission}`);
      return tier.commission;
    }
  }

  // Если сумма не попадает в диапазон, выбираем ближайшую комиссию
  if (amount < 5000) {
    return commissionTiers[0].commission;
  } else {
    return commissionTiers[commissionTiers.length - 1].commission;
  }
}

router.post("/", async (req: Request, res: Response) => {
  const { fromCurrency, toCurrency, amount } = req.body;
  const isFromFiat = fromCurrency === "RUB";
  const isToFiat = toCurrency === "RUB";

  if (!fromCurrency || !toCurrency || !amount) {
    return res.status(400).json({
      message: "Необходимы все параметры: fromCurrency, toCurrency, amount",
    });
  }

  try {
    const ratesData = await getLatestExchangeRates();

    if (!ratesData || !ratesData.rates) {
      return res.status(500).json({ message: "Курсы валют не найдены" });
    }

    // Проверка существования ключей в объекте
    if (
      !(fromCurrency in ratesData.rates) ||
      !(toCurrency in ratesData.rates)
    ) {
      return res.status(400).json({ message: "Неверные валюты" });
    }

    // Приведение типа для предотвращения ошибки TypeScript
    const fromRate = (
      ratesData.rates[isFromFiat ? "RUB" : fromCurrency] as { rub: number; usd: number }
    )?.rub;
    const toRate = (ratesData.rates[isToFiat ? "RUB" : toCurrency] as { rub: number; usd: number })
      ?.rub;

    if (typeof fromRate !== "number" || typeof toRate !== "number") {
      return res.status(400).json({ message: "Курсы валют недоступны" });
    }

    let rate = 0;
    
    if (isFromFiat) {
      rate = fromRate / toRate;
    } else if (isToFiat) {
      rate = toRate / fromRate;
    } else {
      rate = 0;
    }

    // Получаем комиссию в зависимости от валюты
    const commissionRateFrom = getCommission(fromCurrency, amount);
    const commissionRateTo = getCommission(toCurrency, amount);

    // Рассчитываем комиссию в зависимости от направления обмена
    let commission = 0;
    let resultAmount = 0;

    if (isFromFiat) {
      // Покупка валюты за рубли
      commission = amount * commissionRateTo;
      const netAmount = amount - commission;
      resultAmount = netAmount * rate;
    } else if (isToFiat) {
      // Продажа валюты за рубли
      const grossAmount = amount / rate;
      commission = grossAmount * commissionRateFrom;
      const netAmount = grossAmount - commission;
      resultAmount = netAmount;
    }

    return res.json({
      rate: rate.toFixed(6),
      commission: commission.toFixed(2),
      resultAmount: resultAmount.toFixed(6),
    });
  } catch (error) {
    console.error("Ошибка при получении курса:", error);
    return res.status(500).json({ message: "Ошибка при получении курса" });
  }
});

export default router;
