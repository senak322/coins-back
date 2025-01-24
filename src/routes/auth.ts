import { Router } from 'express';
import { register, login } from '../controllers/authController';
import { body } from 'express-validator';
import { verifyToken } from '../services/authService';

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

export default router;