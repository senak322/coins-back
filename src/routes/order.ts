import { Router, Request, Response } from "express";
import Order from "../models/Order";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "../services/emailService";
import { authMiddleware } from "../middleware/authMiddleware";
import { User } from "../models/User";
import jwt from "jsonwebtoken";
import { adminMiddleware } from "../middleware/adminMiddleware";
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

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

const verifyCaptcha = async (captchaToken: string) => {
  const secretKey = process.env.REACT_APP_CAPTCHA_SITEKEY;
  if (!secretKey) {
    throw new Error("Secret key is not set");
  }
  const params = new URLSearchParams({
    secret: secretKey,
    token: captchaToken,
  });
  const url = `https://smartcaptcha.yandexcloud.net/validate?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
  });
  const text = await response.text();
  if (!text) {
    throw new Error("Empty response from captcha verification");
  }
  try {
    const data = JSON.parse(text);
    // Проверяем свойство status вместо success
    return data.status === "ok";
  } catch (err) {
    console.error("Error parsing captcha verification response:", err);
    throw err;
  }
};

router.post("/", async (req: Request, res: Response) => {
  const {
    amountGive,
    currencyGive,
    amountReceive,
    currencyReceive,
    telegramNickname,
    networkGive,
    accountId,
    captchaToken,
  } = req.body;
  try {
    const isVerif = await verifyCaptcha(captchaToken)
    if (!isVerif) {
      return res.status(400).json({ message: "Капча не прошла проверку" });
    }
  } catch (err) {
    console.log(err)
    return res.status(400).json({ message: "Капча обязательна" });
  }
  


  // Проверяем, что ник Telegram присутствует
  if (!telegramNickname || telegramNickname.trim() === "") {
    return res.status(400).json({ message: "Ник Telegram обязателен" });
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

  let userId = null;
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (e) {
      // Если токен не валиден, продолжаем как неавторизованный пользователь
      console.error("Invalid token, proceeding without user id");
    }
  }

  const order = new Order({
    orderId,
    user: userId,
    amountGive,
    currencyGive,
    amountReceive,
    currencyReceive,
    networkGive,
    telegramNickname: telegramNickname.trim(),
    accountId, // может быть undefined, если пользователь не выбрал счет
    status: "new",
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
    <p><strong>К получению:</strong> ${amountReceive} ${currencyReceive}</p>
    <p><strong>Дата:</strong> ${new Date().toLocaleString()}</p>
  `,
    });
    const user = await User.findById(userId);
    if (user && user.emailNotificationsEnabled) {
      await sendEmail({
        toUser: user.email,
        subject: "Новая заявка",
        html: `<p>Здравствуйте, ${user.login}!</p>
        <h1>Новая заявка создана</h1>
        <p><strong>Номер заявки:</strong> ${order.orderId}</p>
        <p><strong>Ник в Telegram:</strong> ${telegramNickname.trim()}</p>
        <p><strong>К отправке:</strong> ${amountGive} ${currencyGive}</p>
        <p><strong>К получению:</strong> ${amountReceive} ${currencyReceive}</p>
        <p><strong>Дата:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Отследить статус заявки можно в личном кабинете.</strong></p>
        <p><strong>Что-бы связаться с оператором для совершения обмена напишите в Telegram: @Coins_Change</strong></p>
      `,
      });
    }
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

router.get("/my", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// router.patch("/:orderId/status", authMiddleware, async (req: Request, res: Response) => {
//   try {
//     const { orderId } = req.params;
//     const { status } = req.body; // Ожидаем статус, например, "completed" или "cancelled"
//     // Валидация допустимых значений статуса
//     const validStatuses = ['new', 'in_progress', 'completed', 'cancelled'];
//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({ message: "Invalid status value" });
//     }

//     const order = await Order.findOne({ orderId });
//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }
//     order.status = status;
//     await order.save();
//     res.json({ message: "Status updated", order });
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// });

router.patch(
  "/:orderId/status",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      const validStatuses = ["new", "in_progress", "completed", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      const order = await Order.findOne({ orderId }).populate("user");
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Если заявка переводится в статус completed, начисляем бонус рефереру (если он есть)
      if (
        status === "completed" &&
        order.user &&
        (order.user as any).referrer
      ) {
        let bonus = 0;
        // Если RUB используется как отправляемая валюта
        if (rubCurrencies.includes(order.currencyGive.toUpperCase())) {
          bonus = order.amountGive * 0.001;
        }
        // Если RUB используется как получаемая валюта
        else if (rubCurrencies.includes(order.currencyReceive.toUpperCase())) {
          bonus = order.amountReceive * 0.001;
        }
        if (bonus > 0) {
          const referrerId = (order.user as any).referrer;
          await User.findByIdAndUpdate(referrerId, {
            $inc: { bonusBalance: bonus, earnedAllTime: bonus },
          });
        } else {
          console.log(
            `Bonus is zero. currencyGive: ${order.currencyGive}, currencyReceive: ${order.currencyReceive}`
          );
        }
      }

      order.status = status;
      await order.save();
      res.json({ message: "Status updated", order });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);



export default router;
