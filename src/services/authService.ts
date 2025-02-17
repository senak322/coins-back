import { User } from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export async function verifyToken(req: any, res: any) {
  try {
    // 1) Берём заголовок через req.get
    const authHeader = req.get('Authorization');

    // 2) Проверяем, что заголовок вообще есть
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // 3) Выделяем сам токен из строки типа "Bearer <token>"
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token not found' });
    }

    // 4) Проверяем валидность JWT
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    // 5) Дополнительно убеждаемся, что пользователь есть в базе
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    return res.status(200).json({
      message: 'Token is valid',
      user: {
        _id: user._id,
        login: user.login,
        email: user.email,
        last_name: user.last_name,
        first_name: user.first_name,
        phone: user.phone,
        tg: user.tg,
        twoFA: user.is2FAEnabled,
        role_id: user.role_id,
      },
      
      userId: user._id,
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export async function registerUser(login: string, email: string, password: string, referralCode?: string) {
  // Проверяем, нет ли уже пользователя с таким логином или email
  const existingUser = await User.findOne({ $or: [{ login }, { email }] });
  if (existingUser) {
    throw new Error('Пользователь с таким логином или email уже существует');
  }

  // Если передан referralCode, ищем реферала
  let referrer = null;
  if (referralCode) {
    referrer = await User.findOne({ shortId: Number(referralCode) });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Формируем объект пользователя без поля referralCode, если оно не задано
  const newUserData: Partial<typeof User.prototype> = {
    login,
    email,
    password: hashedPassword,
    referrer: referrer ? referrer._id : undefined,
  };

  // Если referralCode передан и не пуст, добавляем его
  if (referralCode && referralCode.trim() !== "") {
    newUserData.referralCode = referralCode.trim();
  }
  
  const user = new User(newUserData);
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