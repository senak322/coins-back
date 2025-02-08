import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  orderId: string;
  user?: mongoose.Types.ObjectId;
  amountGive: number;
  currencyGive: string;
  amountReceive: number;
  currencyReceive: string;
  telegramNickname: string;
  networkGive?: string;  // поле для сети
  status: 'new' | 'completed' | 'in_progress' | 'cancelled';
  accountId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema({
  orderId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amountGive: { type: Number, required: true },
  currencyGive: { type: String, required: true },
  amountReceive: { type: Number, required: true },
  currencyReceive: { type: String, required: true },
  accountId: { type: String },
  status: { type: String, enum: ['new', 'completed', 'in_progress', 'cancelled'], default: 'new' },
  telegramNickname: { type: String, required: true },
  networkGive: { type: String }, 
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

OrderSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IOrder>('Order', OrderSchema);
