import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db';
import exchangeRateRoutes from './routes/exchangeRate';
import orderRoutes from './routes/order';
import rateRoutes from "./routes/rates";
import { fetchAndSaveExchangeRates } from './services/exchangeRateService';
import cron from 'node-cron';
import cors from 'cors';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Подключение к базе данных
connectDB();
console.log('MONGODB_URI:', process.env.MONGODB_URI);
// Middleware
app.use(express.json());
app.use(cors());

app.use('/api/auth', authRoutes);
app.use('/api/exchange-rate', exchangeRateRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/get-rate', rateRoutes);

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
