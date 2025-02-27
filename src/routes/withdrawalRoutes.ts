import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import Withdrawal from "../models/Withdrawal";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminMiddleware } from "../middleware/adminMiddleware";
import { User } from "../models/User";
import { sendEmail } from "../services/emailService";

const router = Router();

// Создание заявки на вывод (для авторизованных пользователей)
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { amount, contact } = req.body;
    const userId = (req as any).userId;
    if (!amount || !contact) {
      return res.status(400).json({ message: "Amount and contact are required" });
    }
    const amountNumber = Number(amount);
    if (amountNumber < 1000) {
      return res.status(400).json({ message: "Минимальная сумма вывода - 1000 рублей" });
    }
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if(user.bonusBalance < amountNumber ) {
      return res.status(400).json({ message: "Cумма вывода превышает доступную" });
    }

    // Вычитаем сумму вывода из бонусного баланса пользователя
    user.bonusBalance = user.bonusBalance - amountNumber;
    await user.save();
    // Генерируем уникальный withdrawalId (например, первая часть UUID)
    const withdrawalId = uuidv4().split("-")[0];
    const withdrawal = new Withdrawal({
      withdrawalId,
      user: userId,
      amount: amountNumber,
      contact: contact.trim(),
      status: "new",
    });
    await withdrawal.save();
    if (user.emailNotificationsEnabled) {
      await sendEmail({
        toUser: user.email,
        subject: "Заявка на вывод средств создана",
        html: `<p>Здравствуйте, ${user.login}!</p>
               <p>Ваша заявка на вывод средств на сумму ${amountNumber} рублей создана и находится в статусе "новая".</p>
               <p>Мы уведомим вас при изменении статуса заявки.</p>`,
      });
    }
    res.json({ message: "Withdrawal request created", withdrawalId });
  } catch (error) {
    console.error("Error creating withdrawal:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Получение заявок на вывод для текущего пользователя
router.get("/my", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const withdrawals = await Withdrawal.find({ user: userId }).sort({ createdAt: -1 });
    res.json({ withdrawals });
  } catch (error) {
    console.error("Error fetching withdrawals:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/all", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const withdrawals = await Withdrawal.find().populate("user").sort({ createdAt: -1 });
    res.json({ withdrawals });
  } catch (error) {
    console.error("Error fetching all withdrawals:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Админ: обновление статуса заявки на вывод
router.patch("/:withdrawalId/status", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { withdrawalId } = req.params;
    const { status } = req.body;
    const validStatuses = ["new", "in_progress", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }
    const withdrawal = await Withdrawal.findOne({ withdrawalId });
    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal request not found" });
    }
    withdrawal.status = status;
    await withdrawal.save();
    const user = await User.findById(withdrawal.user);
    const amountNumber = Number(withdrawal.amount);
    if (user && user.emailNotificationsEnabled) {
      await sendEmail({
        toUser: user.email,
        subject: "Заявка на вывод средств",
        html: `<p>Здравствуйте, ${user.login}!</p>
               <p>Ваша заявка на вывод средств на сумму ${amountNumber} рублей обработана и теперь находится в статусе "${status}".</p>
               <p>Спасибо, что Вы с нами!.</p>`,
      });
    }
    res.json({ message: "Withdrawal status updated", withdrawal });
  } catch (error) {
    console.error("Error updating withdrawal status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
