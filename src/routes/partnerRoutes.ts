// partnerRoutes.ts
import { Router, Request, Response } from "express";
import { User } from "../models/User";
import Order from "../models/Order";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

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

    // Вычисляем суммарную сумму обменов (в рублях) и заработанные бонусы (0.1% от суммы)
    let totalExchangesSum = 0;
    let earnedAllTime = 0;
    referralOrders.forEach((order) => {
      let rubAmount = 0;
      if (order.currencyGive.toUpperCase() === "RUB") {
        rubAmount = order.amountGive;
      } else if (order.currencyReceive.toUpperCase() === "RUB") {
        rubAmount = order.amountReceive;
      }
      totalExchangesSum += rubAmount;
      earnedAllTime += rubAmount * 0.001;
    });

    // Пока не реализованы выплаты – считаем их равными нулю
    const pendingPayout = 0;
    const totalPaid = 0;
    const currentBalance = user.bonusBalance || 0;
    const availableForPayout = currentBalance; // если нет отчислений

    // partnerPercent – можно считать, что бонус начисляется по ставке 0.1%
    const partnerPercent = 0.1;

    res.json({
      accountId: user.shortId,
      registrationDate: user.createdAt,
      email: user.email,
      partnerPercent,
      referralCount,
      visitors: 0, // аналитика по посетителям пока не реализована
      exchangesCount,
      totalExchangesSum,
      ctrValue: "—",
      earnedAllTime,
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

export default router;
