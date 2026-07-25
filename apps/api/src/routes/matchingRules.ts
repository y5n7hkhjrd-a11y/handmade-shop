import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { matchingRuleRepository } from '../repositories/matchingRuleRepository.js';
import { validate } from '../middleware/validate.js';
import {
  createMatchingRuleSchema,
  updateMatchingRuleSchema,
  paginationSchema,
} from '@handmade-shop/shared';
import { AppError } from '../middleware/errorHandler.js';

export const matchingRuleRouter: Router = Router();

matchingRuleRouter.get(
  '/',
  validate(paginationSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, search } = req.query as any;
      const result = await matchingRuleRepository.list({ page, limit, search });
      res.json({
        success: true,
        data: result.data,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

matchingRuleRouter.get('/all', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await matchingRuleRepository.listAll();
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
});

matchingRuleRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rule = await matchingRuleRepository.findById(req.params.id!);
    if (!rule) throw new AppError('Matching rule not found', 404);
    res.json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
});

matchingRuleRouter.post(
  '/',
  validate(createMatchingRuleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rule = await matchingRuleRepository.create(req.body);
      res.status(201).json({ success: true, data: rule });
    } catch (error) {
      next(error);
    }
  },
);

matchingRuleRouter.put(
  '/:id',
  validate(updateMatchingRuleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rule = await matchingRuleRepository.update(req.params.id!, req.body);
      if (!rule) throw new AppError('Matching rule not found', 404);
      res.json({ success: true, data: rule });
    } catch (error) {
      next(error);
    }
  },
);

matchingRuleRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if matching rule is used in any recipe that has active orders
    const recipeProductCount = await prisma.recipeProduct.count({
      where: {
        matchingRuleId: req.params.id!,
        recipe: { orders: { some: { deletedAt: null } } },
      },
    });
    if (recipeProductCount > 0) {
      throw new AppError(
        `Không thể xóa quy tắc ghép này vì đã được sử dụng trong ${recipeProductCount} công thức có đơn hàng. Chỉ có thể vô hiệu hóa.`,
        400,
      );
    }
    await matchingRuleRepository.softDelete(req.params.id!);
    res.json({ success: true, message: 'Matching rule deleted' });
  } catch (error) {
    next(error);
  }
});
