import { Router } from 'express';
import Order from '../models/Order';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/', async (req, res) => {
  const { amountGive, currencyGive, amountReceive, currencyReceive } = req.body;

  if (
    !amountGive ||
    !currencyGive ||
    !amountReceive ||
    !currencyReceive
  ) {
    return res.status(400).json({ message: 'Invalid order data' });
  }

  const orderId = uuidv4(); // Генерируем уникальный идентификатор заказа

  const order = new Order({
    orderId,
    amountGive,
    currencyGive,
    amountReceive,
    currencyReceive,
  });

  try {
    await order.save();
    res.json({ message: 'Order created', orderId });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
