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

// Функция для получения комиссии
function getCommission(currency: string, amount: number): number {
  let commissionTiers =
    currency === "USDT"
      ? usdtCommissionTiers
      : currency === "BTC"
      ? btcCommissionTiers
      : altCommissionTiers;
  for (const tier of commissionTiers) {
    if (amount >= tier.min && amount < tier.max) {
      return tier.commission;
    }
  }
  return amount < 5000
    ? commissionTiers[0].commission
    : commissionTiers[commissionTiers.length - 1].commission;
}

router.post("/", async (req: Request, res: Response) => {
  const { fromCurrency, toCurrency, amount, lastChanged } = req.body; // lastChanged = "give" или "receive"
  const isFromFiat = fromCurrency === "RUB";
  const isToFiat = toCurrency === "RUB";

  if (!fromCurrency || !toCurrency || !amount || !lastChanged) {
    return res.status(400).json({
      message: "Необходимы все параметры: fromCurrency, toCurrency, amount, lastChanged",
    });
  } 

  try {
    const ratesData = await getLatestExchangeRates();
    if (!ratesData || !ratesData.rates) {
      return res.status(500).json({ message: "Курсы валют не найдены" });
    }

    const fromRateData = ratesData.rates.get(fromCurrency);
    const toRateData = ratesData.rates.get(toCurrency);

    // Проверяем, что курсы существуют и содержат данные по RUB
    if (!fromRateData || !toRateData) {
      return res.status(400).json({ message: "Неверные валюты или недоступные курсы" });
    }

    // Получаем только курсы RUB
    const fromRate = fromRateData.rub;
    const toRate = toRateData.rub;

    let rate = isFromFiat ? fromRate / toRate : isToFiat ? toRate / fromRate : 0;
    if (rate === 0) {
      return res.status(400).json({ message: "Неверные валюты" });
    }

    // Получаем комиссию в зависимости от валюты
    const commissionRateFrom = getCommission(fromCurrency, amount);
    const commissionRateTo = getCommission(toCurrency, amount);

    // Рассчитываем комиссию в зависимости от направления обмена
    let commission = 0;
    let resultAmount = 0;

    if (lastChanged === "give") {
      // Рассчёт по сумме отправки
      if (isFromFiat) {
        commission = amount * commissionRateTo;
        const netAmount = amount - commission;
        resultAmount = netAmount * rate;
      } else if (isToFiat) {
        const grossAmount = amount / rate;
        commission = grossAmount * commissionRateFrom;
        resultAmount = grossAmount - commission;
      }
    } else if (lastChanged === "receive") {
      // Рассчёт по сумме получения
      if (isFromFiat) {
        const netAmount = amount / rate;
        commission = netAmount * commissionRateTo / (1 - commissionRateTo);
        resultAmount = netAmount + commission;
      } else if (isToFiat) {
        const netAmount = amount * (1 - commissionRateFrom);
        resultAmount = netAmount * rate;
      }
    }

    return res.json({
      rate: rate.toFixed(6),
      // commission: commission.toFixed(2),
      resultAmount: resultAmount.toFixed(6),
    });
  } catch (error) {
    console.error("Ошибка при получении курса:", error);
    return res.status(500).json({ message: "Ошибка при получении курса" });
  }
});

export default router;
