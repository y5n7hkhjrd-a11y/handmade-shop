import { Router, type Request, type Response, type NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, createUserSchema } from '@handmade-shop/shared';
import { AppError } from '../middleware/errorHandler.js';

export const authRouter: Router = Router();

authRouter.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post(
  '/register',
  validate(createUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.createUser(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },
);

authRouter.get(
  '/profile',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const user = await authService.getProfile(req.user.id);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },
);
