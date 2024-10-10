import { Router, Request, Response } from "express";
import Order from "../models/Order";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "../services/emailService";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { amountGive, currencyGive, amountReceive, currencyReceive, telegramNickname, networkGive  } = req.body;

  // Проверяем, что ник Telegram присутствует
  if (!telegramNickname || telegramNickname.trim() === '') {
    return res.status(400).json({ message: 'Ник Telegram обязателен' });
  }

  if (!amountGive || !currencyGive || !amountReceive || !currencyReceive) {
    return res.status(400).json({ message: "Invalid order data" });
  }

  let orderId: string;
  let isUnique = false;

  orderId = "";
  // Попытка генерации уникального orderId
  while (!isUnique) {
    orderId = uuidv4().split("-")[0]; // Берем первую часть UUID для короткого ID
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
    networkGive,
    telegramNickname: telegramNickname.trim(),
  });

  try {
    await order.save();

    // Отправляем письмо администратору
    await sendEmail({
      subject: "Новая заявка",
      html: `
    <h1>Новая заявка создана</h1>
    <p><strong>Номер заявки:</strong> ${order.orderId}</p>
    <p><strong>Ник в Telegram:</strong> ${telegramNickname.trim()}</p>
    <p><strong>К отправке:</strong> ${amountGive} ${currencyGive}</p>
    <p><strong>К получениюо:</strong> ${amountReceive} ${currencyReceive}</p>
    <p><strong>Дата:</strong> ${new Date().toLocaleString()}</p>
  `,
    });

    res.json({ message: "Order created", orderId });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/latest", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(6);
    res.json({ orders });
  } catch (error) {
    console.error("Error fetching latest orders:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
