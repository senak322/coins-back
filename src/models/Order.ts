import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  orderId: string;
  amountGive: number;
  currencyGive: string;
  amountReceive: number;
  currencyReceive: string;
  telegramNickname: string;
  createdAt: Date;
}

const OrderSchema: Schema = new Schema({
  orderId: { type: String, required: true, unique: true },
  amountGive: { type: Number, required: true },
  currencyGive: { type: String, required: true },
  amountReceive: { type: Number, required: true },
  currencyReceive: { type: String, required: true },
  telegramNickname: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IOrder>('Order', OrderSchema);
