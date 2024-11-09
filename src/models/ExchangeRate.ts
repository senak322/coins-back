import mongoose, { Document, Schema } from 'mongoose';

export interface IExchangeRate extends Document {
  rates: Map<string, { rub: number; usd: number }>;
  timestamp: Date;
}

const exchangeRateSchema = new Schema<IExchangeRate>({
  rates: {
    type: Map,
    of: new Schema({
      rub: { type: Number, required: true },
      usd: { type: Number, required: true },
    }),
  },
  timestamp: { type: Date, required: true },
});

export default mongoose.model<IExchangeRate>('ExchangeRate', exchangeRateSchema);
