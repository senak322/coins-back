import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminMiddleware } from "../middleware/adminMiddleware";
import { CommissionConfig } from "../models/CommissionConfig";

const router = Router();

// GET /api/admin/commissions – получение текущей конфигурации комиссий
router.get("/", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const config = await CommissionConfig.findOne();
    if (!config) {
      return res.status(404).json({ error: "Commission config not found" });
    }
    res.json(config);
  } catch (error) {
    console.error("Error fetching commissions:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/admin/commissions – обновление конфигурации комиссий
router.patch("/", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { usdt, btc, alt } = req.body;
    let config = await CommissionConfig.findOne();
    if (!config) {
      config = new CommissionConfig({});
    }
    if (usdt) config.usdt = usdt;
    if (btc) config.btc = btc;
    if (alt) config.alt = alt;
    await config.save();
    res.json({ message: "Commission config updated", config });
  } catch (error) {
    console.error("Error updating commissions:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
