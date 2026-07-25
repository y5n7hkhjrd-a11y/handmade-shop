import { Router, type Request, type Response, type NextFunction } from 'express';
import { costRuleRepository } from '../repositories/costRuleRepository.js';
import { validate } from '../middleware/validate.js';
import {
  createCostRuleSchema,
  updateCostRuleSchema,
  paginationSchema,
} from '@handmade-shop/shared';
import { AppError } from '../middleware/errorHandler.js';
import { ProductType } from '@handmade-shop/shared';
import { costEngineService } from '../services/costEngineService.js';

export const costRuleRouter: Router = Router();

costRuleRouter.get(
  '/',
  validate(paginationSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query as any;
      const productType = req.query.productType as string | undefined;
      const result = await costRuleRepository.list({ page, limit, productType });
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

costRuleRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rule = await costRuleRepository.findById(req.params.id!);
    if (!rule) throw new AppError('Cost rule not found', 404);
    res.json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
});

costRuleRouter.post(
  '/',
  validate(createCostRuleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rule = await costRuleRepository.create(req.body);
      res.status(201).json({ success: true, data: rule });
    } catch (error) {
      next(error);
    }
  },
);

costRuleRouter.put(
  '/:id',
  validate(updateCostRuleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rule = await costRuleRepository.update(req.params.id!, req.body);
      if (!rule) throw new AppError('Cost rule not found', 404);
      res.json({ success: true, data: rule });
    } catch (error) {
      next(error);
    }
  },
);

costRuleRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await costRuleRepository.softDelete(req.params.id!);
    res.json({ success: true, message: 'Cost rule deleted' });
  } catch (error) {
    next(error);
  }
});

costRuleRouter.post('/calculate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, productType, recipeId, itemPackagingCosts, orderPackagingCosts, extraCost } =
      req.body;
    const result = await costEngineService.calculateFullCost({
      productId,
      productType: productType as ProductType,
      recipeId,
      itemPackagingCosts,
      orderPackagingCosts,
      extraCost,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});
