// src/models/ExchangeRate.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IRateData {
  rub: number;
  usdt: number;
}

export interface IExchangeRate extends Document {
  rates: {
    [key: string]: IRateData;
  };
  timestamp: Date;
}


const exchangeRateSchema = new Schema<IExchangeRate>({
  // Вместо Map используем просто объект
  rates: { type: Object, required: true },
  timestamp: { type: Date, required: true },
});

const ExchangeRate = mongoose.model<IExchangeRate>("ExchangeRate", exchangeRateSchema);

export default ExchangeRate;
