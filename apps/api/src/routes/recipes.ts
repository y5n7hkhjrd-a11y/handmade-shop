import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { recipeRepository } from '../repositories/recipeRepository.js';
import { validate } from '../middleware/validate.js';
import { createRecipeSchema, updateRecipeSchema, paginationSchema } from '@handmade-shop/shared';
import { AppError } from '../middleware/errorHandler.js';

export const recipeRouter: Router = Router();

recipeRouter.get(
  '/',
  validate(paginationSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query as any;
      const search = req.query.search as string | undefined;
      const result = await recipeRepository.list({ page, limit, search });
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

recipeRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recipe = await recipeRepository.findById(req.params.id!);
    if (!recipe) throw new AppError('Recipe not found', 404);
    res.json({ success: true, data: recipe });
  } catch (error) {
    next(error);
  }
});

recipeRouter.post(
  '/',
  validate(createRecipeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recipe = await recipeRepository.create(req.body);
      res.status(201).json({ success: true, data: recipe });
    } catch (error) {
      next(error);
    }
  },
);

recipeRouter.put(
  '/:id',
  validate(updateRecipeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recipe = await recipeRepository.update(req.params.id!, req.body);
      if (!recipe) throw new AppError('Recipe not found', 404);
      res.json({ success: true, data: recipe });
    } catch (error) {
      next(error);
    }
  },
);

recipeRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if recipe has been used in any active orders
    const orderCount = await prisma.order.count({
      where: { recipeId: req.params.id!, deletedAt: null },
    });
    if (orderCount > 0) {
      throw new AppError(
        `Không thể xóa công thức này vì đã được sử dụng trong ${orderCount} đơn hàng. Chỉ có thể vô hiệu hóa.`,
        400,
      );
    }
    await recipeRepository.softDelete(req.params.id!);
    res.json({ success: true, message: 'Recipe deleted' });
  } catch (error) {
    next(error);
  }
});
