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
function getCommission(currency: string, amountInRub: number): number {
  let commissionTiers =
    currency === "USDT"
      ? usdtCommissionTiers
      : currency === "BTC"
      ? btcCommissionTiers
      : altCommissionTiers;
  for (const tier of commissionTiers) {
    if (amountInRub >= tier.min && amountInRub < tier.max) {
      return tier.commission;
    }
  }
  return amountInRub < 5000
    ? commissionTiers[0].commission
    : commissionTiers[commissionTiers.length - 1].commission;
}

router.post("/", async (req: Request, res: Response) => {
  const { fromCurrency, toCurrency, amount, lastChanged } = req.body; // lastChanged = "give" или "receive"
  const isFromFiat = fromCurrency === "RUB";
  const isToFiat = toCurrency === "RUB";

  if (!fromCurrency || !toCurrency || !amount || !lastChanged) {
    return res.status(400).json({
      message:
        "Необходимы все параметры: fromCurrency, toCurrency, amount, lastChanged",
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
      return res
        .status(400)
        .json({ message: "Неверные валюты или недоступные курсы" });
    }

    // Получаем только курсы RUB
    const fromRate = fromRateData.rub;
    const toRate = toRateData.rub;

    const rate = isFromFiat
      ? fromRate / toRate
      : isToFiat
      ? toRate / fromRate
      : fromRate / toRate;
      console.log(rate);
      
    // const rate = fromRate / toRate;
    // let rate: number;
    // if (isFromFiat) {
    //   // Конвертация из RUB в другую валюту
    //   rate = 1 / toRate;
    // } else if (isToFiat) {
    //   // Конвертация из другой валюты в RUB
    //   rate = fromRate;
    // } else {
    //   // Конвертация между двумя не-RUB валютами
    //   rate = fromRate / toRate;
    // }

    if (rate === 0) {
      return res.status(400).json({ message: "Неверные валюты" });
    }

    // Получаем комиссию в зависимости от валюты
    let resultAmount = 0;
    let commissionRate = 0;
    let amountInRubForCommission = 0;

    if (lastChanged === "give") {
      // Рассчёт по сумме отправки
      if (isFromFiat && !isToFiat) {
        // Покупка криптовалюты за рубли
        amountInRubForCommission = amount; // Сумма в RUB
        commissionRate = getCommission(toCurrency, amountInRubForCommission);

        const netAmount = amount * (1 - commissionRate); // Сумма после вычета комиссии
        resultAmount = netAmount * rate; // Конвертируем в криптовалюту
      } else if (!isFromFiat && isToFiat) {
        // Продажа криптовалюты за рубли
        const amountInRub = amount * fromRate; // Конвертируем сумму в RUB
        amountInRubForCommission = amountInRub;
        commissionRate = getCommission(fromCurrency, amountInRubForCommission);

        const netAmountInRub = amountInRub * (1 - commissionRate); // Сумма после вычета комиссии
        resultAmount = netAmountInRub; // Сумма в RUB
      } else {
        // Обмен между двумя валютами (не RUB)
        resultAmount = 0;
      }
    } else if (lastChanged === "receive") {
      // Рассчёт по сумме получения
      if (isFromFiat && !isToFiat) {
        // Покупка криптовалюты за рубли
        const amountInRub = amount * toRate; // Конвертируем сумму криптовалюты в RUB
        amountInRubForCommission = amountInRub;
        commissionRate = getCommission(toCurrency, amountInRubForCommission);

        const grossAmount = amountInRub / (1 - commissionRate); // Сумма до вычета комиссии
        resultAmount = grossAmount; // Сумма в RUB
      } else if (!isFromFiat && isToFiat) {
        // Продажа криптовалюты за рубли
        amountInRubForCommission = amount; // Сумма в RUB
        commissionRate = getCommission(fromCurrency, amountInRubForCommission);

        const grossAmountInRub = amount / (1 - commissionRate); // Сумма до вычета комиссии
        resultAmount = grossAmountInRub / fromRate; // Конвертируем в криптовалюту
      } else {
        // Обмен между двумя валютами (не RUB)
        resultAmount = 0;
      }
    }

    return res.json({
      // rate: rate.toFixed(6),
      // commission: commission.toFixed(2),
      resultAmount: resultAmount.toFixed(6),
    });
  } catch (error) {
    console.error("Ошибка при получении курса:", error);
    return res.status(500).json({ message: "Ошибка при получении курса" });
  }
});

export default router;
