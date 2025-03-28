import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/authService";
import { User } from "../models/User";
import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import crypto from 'crypto';
import { sendEmail } from "../services/emailService";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

export async function register(req: Request, res: Response) {
  try {
    const { login, email, password, referralCode } = req.body;
    // Можно добавить валидацию данных
    const user = await registerUser(login, email, password, referralCode);
    const verificationCode = crypto.randomBytes(3).toString('hex');
    user.emailVerificationCode = verificationCode;
    // Устанавливаем срок действия кода (например, 1 час)
    user.emailVerificationExpires = new Date(Date.now() + 3600000);
    await user.save();
    
    // Отправляем e-mail с кодом подтверждения
    await sendEmail({
      toUser: user.email,
      subject: "Подтверждение e-mail",
      html: `<p>Здравствуйте, ${user.login}!</p>
             <p>Для завершения регистрации введите следующий код подтверждения:</p>
             <h2>${verificationCode}</h2>
             <p>Код действителен в течение 1 часа.</p>`
    });
    
    return res.status(201).json({ message: "Регистрация почти завершена. Для завершения на ваш e-mail отправлен код подтверждения.", user });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Email и код обязательны" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: "E-mail уже подтвержден" });
    }

    // Проверяем код и срок действия
    if (user.emailVerificationCode !== code || (user.emailVerificationExpires && user.emailVerificationExpires < new Date())) {
      return res.status(400).json({ error: "Неверный или просроченный код подтверждения" });
    }

    // Обновляем пользователя: подтверждаем e-mail
    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return res.json({ message: "E-mail успешно подтвержден" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { loginOrEmail, password } = req.body;
    const { user, token } = await loginUser(loginOrEmail, password);

    if (user.is2FAEnabled) {
      // Если 2FA включена – возвращаем идентификатор пользователя для последующей проверки
      return res.status(200).json({
        message: "Требуется двухфакторная верификация",
        user: {
          _id: user._id,
          login: user.login,
          email: user.email,
          last_name: user.last_name,
          first_name: user.first_name,
          phone: user.phone,
          tg: user.tg,
          twoFA: true,
          role_id: user.role_id,
        },
        userId: user._id,
      });
    }
    return res.status(200).json({ message: "Успешный вход", token, user });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    // userId мы клали в authMiddleware как (req as any).userId:
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "No user id in request" });
    }

    // Поля, которые разрешено обновлять
    const { first_name, last_name, phone, tg, email } = req.body;

    // Находим пользователя в БД
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Присваиваем новые значения (только если они переданы)
    if (typeof first_name === "string") {
      user.first_name = first_name;
    }
    if (typeof last_name === "string") {
      user.last_name = last_name;
    }
    if (typeof phone === "string") {
      user.phone = phone;
    }
    if (typeof tg === "string") {
      user.tg = tg;
    }
    // E-mail можно обновить отдельно (с верификацией),
    if (typeof email === "string") {
      user.email = email;
    }

    // Сохраняем изменения в БД
    await user.save();

    // Возвращаем обновлённого пользователя
    return res.json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    // userId берем из authMiddleware (req as any).userId
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "No user ID in request" });
    }

    // Берём новый пароль из тела запроса
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: "No new password provided" });
    }

    // Находим пользователя
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Здесь можно также проверить старый пароль, если нужно
    // Например, если требуется:
    // const { oldPassword } = req.body;
    // if (!await bcrypt.compare(oldPassword, user.password)) {
    //   return res.status(400).json({ error: 'Old password is incorrect' });
    // }

    // Хешируем новый пароль и сохраняем
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("changePassword error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

export async function generate2FASecret(req: Request, res: Response) {
  try {
    const user = await User.findById((req as any).userId);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const secret = speakeasy.generateSecret({ name: `Coins (${user.email})` });
    user.twoFASecret = secret.base32;
    await user.save();

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
    return res.json({ secret: secret.base32, qrCode });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function enable2FA(req: Request, res: Response) {
  try {
    const { token } = req.body;
    const user = await User.findById((req as any).userId);
    if (!user || !user.twoFASecret)
      return res.status(400).json({ error: "2FA не настроена" });

    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: "base32",
      token,
    });

    if (!verified) return res.status(400).json({ error: "Неверный код" });

    user.is2FAEnabled = true;
    await user.save();
    return res.json({ message: "2FA успешно включена" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function disable2FA(req: Request, res: Response) {
  try {
    const user = await User.findById((req as any).userId);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    user.is2FAEnabled = false;
    user.twoFASecret = undefined;
    await user.save();
    return res.json({ message: "2FA успешно отключена" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function verify2FACode(req: Request, res: Response) {
  try {
    const { userId, token } = req.body;
    const user = await User.findById(userId);

    if (!user || !user.is2FAEnabled || !user.twoFASecret) {
      return res
        .status(400)
        .json({ error: "Двухфакторная аутентификация не настроена" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: "base32",
      token,
      // window: 2,
    });

    if (!verified) return res.status(400).json({ error: "Неверный 2FA код" });

    const jwtToken = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.json({ token: jwtToken });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Ошибка сервера" });
  }
}
