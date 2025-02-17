import { Router, Request, Response } from "express";
import Order from "../models/Order";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminMiddleware } from "../middleware/adminMiddleware";

const router = Router();

// GET /api/admin/orders – получение всех заявок с возможностью фильтрации по статусу
router.get("/", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    // Фильтрация по статусу (например, ?status=completed)
    const { status } = req.query;
    const filter: any = {};
    if (status && typeof status === "string") {
      filter.status = status;
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/admin/orders/:orderId/status – обновление статуса заявки
router.patch("/:orderId/status", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const validStatuses = ['new', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    order.status = status;
    await order.save();
    res.json({ message: "Status updated", order });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
