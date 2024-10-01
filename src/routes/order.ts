import { Router, Request, Response } from "express";
import Order from "../models/Order";
import { v4 as uuidv4 } from 'uuid';
// import { nanoid } from "nanoid";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { amountGive, currencyGive, amountReceive, currencyReceive } = req.body;

  if (!amountGive || !currencyGive || !amountReceive || !currencyReceive) {
    return res.status(400).json({ message: "Invalid order data" });
  }

  let orderId: string;
  let isUnique = false;

  orderId = ""
  // Попытка генерации уникального orderId
  while (!isUnique) {
    orderId = uuidv4().split('-')[0]; // Берем первую часть UUID для короткого ID
    const existingOrder = await Order.findOne({ orderId });
    if (!existingOrder) {
      isUnique = true;
    }
  }

  const order = new Order({
    orderId,
    amountGive,
    currencyGive,
    amountReceive,
    currencyReceive,
  });

  try {
    await order.save();
    res.json({ message: "Order created", orderId });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
