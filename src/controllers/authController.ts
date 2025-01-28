import { Request, Response } from 'express';
import { registerUser, loginUser } from '../services/authService';
import { User } from '../models/User';

export async function register(req: Request, res: Response) {
  try {
    const { login, email, password } = req.body;
    // Можно добавить валидацию данных
    const user = await registerUser(login, email, password);
    return res.status(201).json({ message: 'Регистрация успешно завершена', user });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { loginOrEmail, password } = req.body;
    const { user, token } = await loginUser(loginOrEmail, password);
    return res.status(200).json({ message: 'Успешный вход', token, user });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    // userId мы клали в authMiddleware как (req as any).userId:
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'No user id in request' });
    }

    // Поля, которые разрешено обновлять
    const { first_name, last_name, phone, tg, email } = req.body;

    // Находим пользователя в БД
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Присваиваем новые значения (только если они переданы)
    if (typeof first_name === 'string') {
      user.first_name = first_name;
    }
    if (typeof last_name === 'string') {
      user.last_name = last_name;
    }
    if (typeof phone === 'string') {
      user.phone = phone;
    }
    if (typeof tg === 'string') {
      user.tg = tg;
    }
    // E-mail обычно обновляется отдельно (с верификацией), 
    // но если хотите, можно обновить тут:
    if (typeof email === 'string') {
      user.email = email;
    }

    // Сохраняем изменения в БД
    await user.save();

    // Возвращаем обновлённого пользователя
    return res.json({
      message: 'User updated successfully',
      user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
}