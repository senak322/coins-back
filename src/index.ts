import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db';
import exchangeRateRoutes from './routes/exchangeRate';
import orderRoutes from './routes/order';
import { fetchAndSaveExchangeRates } from './services/exchangeRateService';
import cron from 'node-cron';
import cors from 'cors';

dotenv.config({ override: false });

const app = express();
const port = process.env.PORT || 5000;

// Подключение к базе данных
connectDB();
console.log('MONGODB_URI:', process.env.MONGODB_URI);
// Middleware
app.use(express.json());
app.use(cors());

// Маршруты
app.use('/api/exchange-rate', exchangeRateRoutes);
app.use('/api/order', orderRoutes);

// Запускаем задачу по расписанию каждые 2 минуты
cron.schedule('*/2 * * * *', () => {
  console.log('Fetching exchange rates...');
  fetchAndSaveExchangeRates();
});

// Начальная загрузка курсов при старте сервера
fetchAndSaveExchangeRates();

// Запуск сервера
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
