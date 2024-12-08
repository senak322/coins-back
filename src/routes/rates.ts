import { Router, Request, Response } from "express";
import { getLatestExchangeRates } from "../services/exchangeRateService";
import { currencies } from "../config/currencies";
import { formatAmount, getDecimalPlaces } from "../config/utils";
import { create } from "xmlbuilder2";

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

// Функция для получения резервов
async function getReserves(): Promise<{ [currency: string]: number }> {
  // Реализуйте получение резервов из базы данных или другого источника
  // Здесь используем статические значения для примера
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
    RUB: 10000000, // Пример резерва RUB
    // Добавьте остальные валюты
  };
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
    // console.log(rate);

    if (rate === 0) {
      return res.status(400).json({ message: "Неверные валюты" });
    }

    // Получаем комиссию в зависимости от валюты
    let resultAmount = 0;
    let commissionRate = 0;
    let amountInRubForCommission = 0;
    let resultCurrency: string | undefined;

    if (lastChanged === "give") {
      // Рассчёт по сумме отправки
      if (isFromFiat && !isToFiat) {
        // Покупка криптовалюты за рубли
        amountInRubForCommission = amount; // Сумма в RUB
        commissionRate = getCommission(toCurrency, amountInRubForCommission);

        const netAmount = amount * (1 - commissionRate); // Сумма после вычета комиссии
        resultAmount = netAmount * rate; // Конвертируем в криптовалюту
        resultCurrency = toCurrency;
      } else if (!isFromFiat && isToFiat) {
        // Продажа криптовалюты за рубли
        const amountInRub = amount * fromRate; // Конвертируем сумму в RUB
        amountInRubForCommission = amountInRub;
        commissionRate = getCommission(fromCurrency, amountInRubForCommission);

        const netAmountInRub = amountInRub * (1 - commissionRate); // Сумма после вычета комиссии
        resultAmount = netAmountInRub; // Сумма в RUB
        resultCurrency = "RUB";
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
        resultCurrency = "RUB";
      } else if (!isFromFiat && isToFiat) {
        // Продажа криптовалюты за рубли
        amountInRubForCommission = amount; // Сумма в RUB
        commissionRate = getCommission(fromCurrency, amountInRubForCommission);

        const grossAmountInRub = amount / (1 - commissionRate); // Сумма до вычета комиссии
        resultAmount = grossAmountInRub / fromRate; // Конвертируем в криптовалюту
        resultCurrency = fromCurrency;
      } else {
        // Обмен между двумя валютами (не RUB)
        resultAmount = 0;
      }
    }

    // Форматирование результата
    let formattedResultAmount: string;

    if (resultCurrency === "RUB") {
      formattedResultAmount = Math.round(resultAmount).toString(); // Целое число
    } else {
      const decimalPlaces = getDecimalPlaces(resultCurrency!);
      formattedResultAmount = resultAmount.toFixed(decimalPlaces);
    }

    return res.json({
      resultAmount: formattedResultAmount,
    });
  } catch (error) {
    console.error("Ошибка при получении курса:", error);
    return res.status(500).json({ message: "Ошибка при получении курса" });
  }
});

// Маршрут для отдачи XML-файла с курсами
router.get("/rates.xml", async (req: Request, res: Response) => {
  try {
    const ratesData = await getLatestExchangeRates();
    if (!ratesData || !ratesData.rates) {
      return res.status(500).send("Курсы валют не найдены");
    }

    const reserves = await getReserves(); // Реализуйте функцию получения резервов

    const items: any[] = [];

    ratesData.rates.forEach((rateData, currency) => {
      if (currency === "RUB") return;

      const rubRate = rateData.rub;
      if (!rubRate) return;

      // Пара RUB - Валюта
      const commissionForToCurrency = getCommission(currency, 1); // Комиссия для обмена 1 RUB на Валюту
      const netOutForRUBToCurrency = (1 / rubRate) * (1 - commissionForToCurrency);
      items.push({
        from: "RUB",
        to: currency,
        in: "1",
        out: formatAmount(netOutForRUBToCurrency, currency),
        amount: reserves[currency]?.toString() || "0",
        // minfee: "5 RUB", // По необходимости
        // fromfee: "2 EUR", // По необходимости
        // tofee: "2 RUB", // По необходимости
      });

      // Пара Валюта - RUB
      const amountInRubForCommission = rubRate * 1; // Сумма в RUB при обмене 1 Валюты на RUB
      const commissionForFromCurrency = getCommission(currency, amountInRubForCommission);
      const netOutForCurrencyToRUB = rubRate * (1 - commissionForFromCurrency);
      items.push({
        from: currency,
        to: "RUB",
        in: "1",
        out: formatAmount(netOutForCurrencyToRUB, "RUB"),
        amount: reserves["RUB"]?.toString() || "0",
        // minfee: "5 RUB", // По необходимости
        // fromfee: "2 USD", // По необходимости
        // tofee: "2 RUB", // По необходимости
      });
    });

    // Создаём XML-документ
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
          if (item.minfee) xmlItem.minfee = item.minfee;
          if (item.fromfee) xmlItem.fromfee = item.fromfee;
          if (item.tofee) xmlItem.tofee = item.tofee;
          return xmlItem;
        }),
      },
    };

    const xml = create(xmlObj).end({ prettyPrint: true });

    // Устанавливаем заголовки и отправляем XML
    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch (error) {
    console.error("Ошибка при генерации XML:", error);
    res.status(500).send("Внутренняя ошибка сервера");
  }
});


export default router;
