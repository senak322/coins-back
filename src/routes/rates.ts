import { Router, Request, Response } from "express";
import { getLatestExchangeRates } from "../services/exchangeRateService";
import { currencies } from "../config/currencies";
import { formatAmount, getDecimalPlaces } from "../config/utils";
import { create } from "xmlbuilder2";

const router = Router();

const usdtCommissionTiers = [
  { min: 5000, max: 50000, commission: 0.04 },
  { min: 50001, max: 100000, commission: 0.03 },
  { min: 100001, max: 10000000, commission: 0.025 },
];

// Commission tiers for BTC
const btcCommissionTiers = [
  { min: 5000, max: 50000, commission: 0.06 },
  { min: 50001, max: 100000, commission: 0.05 },
  { min: 100001, max: 10000000, commission: 0.04 },
];

// Commission tiers for other altcoins
const altCommissionTiers = [
  { min: 5000, max: 100000, commission: 0.05 },
  { min: 100001, max: 10000000, commission: 0.06 },
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

// Функция для получения резервов
async function getReserves(): Promise<{ [currency: string]: number }> {
  return {
    BTC: 10,
    ETH: 500,
    USDT: 200000,
    TON: 300000,
    XMR: 400000,
    TRX: 2500000,
    DOGE: 1500000,
    USDC: 1800000,
    LTC: 1200000,
    SOL: 800000,
    DAI: 2200000,
    ADA: 1300000,
    RUB: 10000000,
  };
}

router.post("/", async (req: Request, res: Response) => {
  const { fromCurrency, toCurrency, amount, lastChanged } = req.body;
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

    const fromRateData = ratesData.rates[fromCurrency];
    const toRateData = ratesData.rates[toCurrency];

    if (!fromRateData || !toRateData) {
      return res
        .status(400)
        .json({ message: "Неверные валюты или недоступные курсы" });
    }

    const fromRate = fromRateData.rub;
    const toRate = toRateData.rub;

    const rate = isFromFiat
      ? fromRate / toRate
      : isToFiat
      ? toRate / fromRate
      : fromRate / toRate;

    if (rate === 0) {
      return res.status(400).json({ message: "Неверные валюты" });
    }

    let resultAmount = 0;
    let commissionRate = 0;
    let amountInRubForCommission = 0;
    let resultCurrency: string | undefined;

    if (lastChanged === "give") {
      if (isFromFiat && !isToFiat) {
        // Покупка криптовалюты за рубли
        amountInRubForCommission = amount;
        commissionRate = getCommission(toCurrency, amountInRubForCommission);

        const netAmount = amount * (1 - commissionRate);
        resultAmount = netAmount * rate;
        resultCurrency = toCurrency;
      } else if (!isFromFiat && isToFiat) {
        // Продажа криптовалюты за рубли
        const amountInRub = amount * fromRate;
        amountInRubForCommission = amountInRub;
        commissionRate = getCommission(fromCurrency, amountInRubForCommission);

        const netAmountInRub = amountInRub * (1 - commissionRate);
        resultAmount = netAmountInRub;
        resultCurrency = "RUB";
      } else {
        resultAmount = 0;
      }
    } else if (lastChanged === "receive") {
      if (isFromFiat && !isToFiat) {
        // Покупка криптовалюты за рубли
        const amountInRub = amount * toRate;
        amountInRubForCommission = amountInRub;
        commissionRate = getCommission(toCurrency, amountInRubForCommission);

        const grossAmount = amountInRub / (1 - commissionRate);
        resultAmount = grossAmount;
        resultCurrency = "RUB";
      } else if (!isFromFiat && isToFiat) {
        // Продажа криптовалюты за рубли
        amountInRubForCommission = amount;
        commissionRate = getCommission(fromCurrency, amountInRubForCommission);

        const grossAmountInRub = amount / (1 - commissionRate);
        resultAmount = grossAmountInRub / fromRate;
        resultCurrency = fromCurrency;
      } else {
        resultAmount = 0;
      }
    }

    let formattedResultAmount: string;

    if (resultCurrency === "RUB") {
      formattedResultAmount = Math.round(resultAmount).toString();
    } else if (resultCurrency) {
      const decimalPlaces = getDecimalPlaces(resultCurrency);
      formattedResultAmount = resultAmount.toFixed(decimalPlaces);
    } else {
      formattedResultAmount = "0";
    }

    return res.json({
      resultAmount: formattedResultAmount,
    });
  } catch (error) {
    console.error("Ошибка при получении курса:", error);
    return res.status(500).json({ message: "Ошибка при получении курса" });
  }
});

router.get("/rates.xml", async (req: Request, res: Response) => {
  try {
    const ratesData = await getLatestExchangeRates();
    if (!ratesData || !ratesData.rates) {
      return res.status(500).send("Курсы валют не найдены");
    }

    const reserves = await getReserves();

    const items: any[] = [];

    // Добавляем явное приведение типов для Object.entries
    for (const [currency, rateData] of Object.entries(ratesData.rates) as [string, {rub: number; usdt: number}][]) {
      if (currency === "RUB") continue; // пропускаем RUB

      const rubRate = rateData.rub;
      if (!rubRate) continue; // если нет rubRate, пропускаем

      const commissionForToCurrency = getCommission(currency, 1);
      const netOutForRUBToCurrency = (1 / rubRate) * (1 - commissionForToCurrency);

      items.push({
        from: "RUB",
        to: currency,
        in: "1",
        out: formatAmount(netOutForRUBToCurrency, currency),
        amount: reserves[currency]?.toString() || "0",
      });

      const amountInRubForCommission = rubRate * 1;
      const commissionForFromCurrency = getCommission(currency, amountInRubForCommission);
      const netOutForCurrencyToRUB = rubRate * (1 - commissionForFromCurrency);

      items.push({
        from: currency,
        to: "RUB",
        in: "1",
        out: formatAmount(netOutForCurrencyToRUB, "RUB"),
        amount: reserves["RUB"]?.toString() || "0",
      });
    }

    const xmlObj = {
      rates: {
        item: items.map((item) => {
          const xmlItem: any = {
            from: item.from,
            to: item.to,
            in: item.in,
            out: item.out,
            amount: item.amount,
          };
          // Если нужно minfee, fromfee, tofee - раскомментируйте и передавайте в item
          return xmlItem;
        }),
      },
    };

    const xml = create(xmlObj).end({ prettyPrint: true });

    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch (error) {
    console.error("Ошибка при генерации XML:", error);
    res.status(500).send("Внутренняя ошибка сервера");
  }
});

export default router;
