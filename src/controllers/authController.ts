import { Request, Response } from 'express';
import { registerUser, loginUser } from '../services/authService';

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