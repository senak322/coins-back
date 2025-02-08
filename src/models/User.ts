import mongoose, { Schema, model, Document } from 'mongoose';

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
  referralCode: string;
  referrer?: mongoose.Types.ObjectId;
  bonusBalance: number;
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
  referralCode: { type: String, unique: true, required: true },
  referrer: { type: Schema.Types.ObjectId, ref: 'User' },
  bonusBalance: { type: Number, default: 0 },
});

export const User = model<IUser>('User', userSchema);