// partnerRoutes.ts
import { Router, Request, Response } from "express";
import { User } from "../models/User";
import Order from "../models/Order";
import { authMiddleware } from "../middleware/authMiddleware";
import Withdrawal from "../models/Withdrawal";

const router = Router();

const rubCurrencies = [
  "RUB",
  "СБП",
  "СБЕР",
  "СБЕРБАНК",
  "Т-БАНК",
  "АЛЬФА",
  "ВТБ",
  "РАЙФ",
  "ГАЗПРОМ",
  "РОСБАНК",
  "МТС",
  "ОЗОН",
  "УРАЛСИБ",
  "АК БАРС",
  "РСХБ",
  "ПРОМСВЯЗЬ",
  "Ю МАНИ",
  "PAYEER",
].map((s) => s.toUpperCase());

// GET /api/partner/info – возвращает статистику партнёрского аккаунта для текущего пользователя
router.get("/info", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Подсчитаем количество рефералов
    const referralCount = await User.countDocuments({ referrer: userId });

    // Получим список ID пользователей, приглашённых данным партнером
    const referrals = await User.find({ referrer: userId }, { _id: 1 });
    const referralIds = referrals.map((r) => r._id);

    // Найдём завершённые заказы, созданные рефералами
    const referralOrders = await Order.find({ user: { $in: referralIds }, status: "completed" });
    const exchangesCount = referralOrders.length;

    // Получаем заявки на вывод для подсчёта ожидающих выплат и выплаченных
    const withdrawals = await Withdrawal.find({ user: userId });
    const pendingPayout = withdrawals.filter((w) => w.status === "new").reduce((sum, w) => sum + w.amount, 0);
    const totalPaid = withdrawals.filter((w) => w.status === "completed").reduce((sum, w) => sum + w.amount, 0);

    const currentBalance = user.bonusBalance || 0;
    const availableForPayout = currentBalance - pendingPayout;

    // partnerPercent – можно считать, что бонус начисляется по ставке 0.1%
    const partnerPercent = 0.1;

    res.json({
      accountId: user.shortId,
      registrationDate: user.createdAt,
      email: user.email,
      partnerPercent,
      referralCount,
      exchangesCount,
      totalExchangesSum: referralOrders.reduce((sum, order) => sum + (order.currencyGive === "RUB" ? order.amountGive : order.amountReceive), 0),
      earnedAllTime: user.earnedAllTime,  // Это ваш бонус
      pendingPayout,
      totalPaid,
      currentBalance,
      availableForPayout,
    });
  } catch (error) {
    console.error("Error fetching partner info:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/referrals", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      // Находим всех пользователей, у которых поле referrer равно userId,
      // выбираем необходимые поля (например, login, email, createdAt)
      const referrals = await User.find({ referrer: userId }).select("login email createdAt");
      res.json({ referrals });
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Эндпоинт для получения информации о партнёрских обменах
router.get("/exchanges", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      
      // Находим всех пользователей, которых пригласил текущий партнёр
      const referrals = await User.find({ referrer: userId }, { _id: 1, login: 1, email: 1 });
      const referralIds = referrals.map((ref) => ref._id);
  
      // Выбираем завершённые заказы (например, со статусом "completed") рефералов
      const orders = await Order.find({ user: { $in: referralIds }, status: "completed" }).sort({ createdAt: -1 });
  
      // Для каждого заказа вычисляем бонус (0.1% от суммы в рублях)
      const exchanges = orders.map((order) => {
        let rubAmount = 0;
        if (rubCurrencies.includes(order.currencyGive.toUpperCase())) {
          rubAmount = order.amountGive;
        } else if (rubCurrencies.includes(order.currencyReceive.toUpperCase())) {
          rubAmount = order.amountReceive;
        }
        const bonus = rubAmount * 0.001; // 0.1%
        return {
          id: order.orderId,
          date: order.createdAt,
          // Можно вывести email или ник, здесь используем telegramNickname
          user: order.telegramNickname,
          reward: bonus.toFixed(2) + " RUB",
        };
      });
  
      res.json({ exchanges });
    } catch (error) {
      console.error("Error fetching partner exchanges:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

export default router;
