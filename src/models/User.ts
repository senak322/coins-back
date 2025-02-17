import mongoose, { Schema, model, Document } from 'mongoose';
import { Counter } from './Counter';

export interface IUser extends Document {
  login: string;
  email: string;
  password: string;
  last_name?: string;
  first_name?: string;
  phone?: string;
  tg?: string;
  is2FAEnabled: boolean;
  twoFASecret?: string;
  referralCode?: string;
  referrer?: mongoose.Types.ObjectId;
  bonusBalance: number;
  shortId: number;
  role_id: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  login: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  last_name: { type: String, required: false },
  first_name: { type: String, required: false },
  phone: { type: String, required: false },
  tg: { type: String, required: false },
  is2FAEnabled: { type: Boolean, default: false },
  twoFASecret: { type: String },
  referralCode: { type: String, required: false, sparse: true, default: undefined },
  referrer: { type: Schema.Types.ObjectId, ref: 'User' },
  bonusBalance: { type: Number, default: 0 },
  shortId: { type: Number, unique: true },
  role_id: { type: Number, default: 1 },
},{ timestamps: true } // автоматически добавляет createdAt и updatedAt
);

// Создаем частичный индекс для referralCode,
// чтобы уникальность проверялась только если referralCode существует и не равен null.
userSchema.index(
  { referralCode: 1 },
  { unique: true, partialFilterExpression: { referralCode: { $exists: true, $ne: null } } }
);

userSchema.pre<IUser>('save', async function (next) {
  if (this.isNew && this.shortId == null) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'userId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.shortId = counter.seq;
      next();
    } catch (error) {
      next();
    }
  } else {
    next();
  }
});

export const User = model<IUser>('User', userSchema);