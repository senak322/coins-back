import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { User } from "../models/User";

const router = Router();

// PATCH /api/users/notifications
router.patch("/notifications", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { emailNotificationsEnabled } = req.body;
    // Обновляем настройку уведомлений для пользователя
    const user = await User.findByIdAndUpdate(
      userId,
      { emailNotificationsEnabled },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "Настройки уведомлений обновлены", emailNotificationsEnabled: user.emailNotificationsEnabled });
  } catch (error) {
    console.error("Error updating notification settings:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
