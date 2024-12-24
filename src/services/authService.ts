import { User } from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret'; // Хранить в .env

export async function registerUser(login: string, email: string, password: string) {
  // Проверяем, нет ли уже пользователя с таким логином или email
  const existingUser = await User.findOne({ $or: [{ login }, { email }] });
  if (existingUser) {
    throw new Error('Пользователь с таким логином или email уже существует');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = new User({ login, email, password: hashedPassword });
  await user.save();
  return user;
}

export async function loginUser(loginOrEmail: string, password: string) {
  // Ищем пользователя по логину или email
  const user = await User.findOne({
    $or: [{ login: loginOrEmail }, { email: loginOrEmail }]
  });
  if (!user) {
    throw new Error('Неверный логин или пароль');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Неверный логин или пароль');
  }

  // Генерируем JWT
  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
  return { token, user };
}