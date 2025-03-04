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
import accountRoutes from "./routes/accountRoutes";
import partnerRoutes from './routes/partnerRoutes';
import adminOrdersRoutes from "./routes/adminOrdersRoutes";
import { getCommissionConfig } from './models/CommissionConfig';
import adminCommissionRoutes from "./routes/adminCommissionRoutes";
import withdrawalRoutes from "./routes/withdrawalRoutes";
import userRoutes from "./routes/userRoutes";

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
app.use("/api/accounts", accountRoutes);
app.use("/api/partner", partnerRoutes);
app.use("/api/admin/orders", adminOrdersRoutes);
app.use("/api/admin/commissions", adminCommissionRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/users", userRoutes);

// Запускаем задачу по расписанию каждые 2 минуты
cron.schedule('*/2 * * * *', () => {
  console.log('Fetching exchange rates...');
  fetchAndSaveExchangeRates();
});

// Начальная загрузка курсов при старте сервера
fetchAndSaveExchangeRates();
getCommissionConfig();
// Запуск сервера
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
