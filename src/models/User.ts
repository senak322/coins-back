import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  login: string;
  email: string;
  password: string;
  // Можно добавить поле для 2FA, подтверждения почты и т.д.
  // twoFactorEnabled?: boolean;
}

const userSchema = new Schema<IUser>({
  login: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

export const User = model<IUser>('User', userSchema);