import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import Withdrawal from "../models/Withdrawal";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminMiddleware } from "../middleware/adminMiddleware";

const router = Router();

// Создание заявки на вывод (для авторизованных пользователей)
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { amount, contact } = req.body;
    if (!amount || !contact) {
      return res.status(400).json({ message: "Amount and contact are required" });
    }
    const amountNumber = Number(amount);
    if (amountNumber < 1000) {
      return res.status(400).json({ message: "Минимальная сумма вывода - 1000 рублей" });
    }
    const userId = (req as any).userId;
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
    res.json({ message: "Withdrawal status updated", withdrawal });
  } catch (error) {
    console.error("Error updating withdrawal status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
