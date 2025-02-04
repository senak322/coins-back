import { Router } from 'express';
import { register, login, changePassword, generate2FASecret, enable2FA, disable2FA, verify2FACode } from '../controllers/authController';
import { body } from 'express-validator';
import { verifyToken } from '../services/authService';
import { authMiddleware } from '../middleware/authMiddleware';
import { updateUser } from '../controllers/authController';

const router = Router();

router.post('/register', 
  // Валидация входных данных
  body('login').isString().isLength({ min: 3 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  // Здесь можно добавить middleware для обработки ошибок валидации
  register
);

router.post('/login', 
  body('loginOrEmail').exists(),
  body('password').exists(),
  login
);

router.get('/verify', verifyToken);

router.patch('/update', authMiddleware, updateUser);

router.patch('/change-password', authMiddleware, changePassword);

router.post('/2fa/generate', authMiddleware, generate2FASecret);
router.post('/2fa/enable', authMiddleware, enable2FA);
router.post('/2fa/disable', authMiddleware, disable2FA);
router.post('/2fa/verify', verify2FACode);

export default router;