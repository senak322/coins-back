import mongoose, { Document, Schema } from 'mongoose';

export interface IExchangeRate extends Document {
  rates: {
    [key: string]: number;
  };
  timestamp: Date;
}

const ExchangeRateSchema: Schema = new Schema({
  rates: { type: Map, of: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model<IExchangeRate>('ExchangeRate', ExchangeRateSchema);
