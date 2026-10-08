import { Router, type Request, type Response, type NextFunction } from 'express';
import { inventoryRepository } from '../repositories/inventoryRepository.js';
import { validate } from '../middleware/validate.js';
import { createInventoryTransactionSchema, listInventoryQuerySchema } from '@handmade-shop/shared';
import { AppError } from '../middleware/errorHandler.js';

export const inventoryRouter: Router = Router();

inventoryRouter.get(
  '/',
  validate(listInventoryQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, type, productId, startDate, endDate } = req.query as any;
      const result = await inventoryRepository.list({
        page,
        limit,
        type,
        productId,
        startDate,
        endDate,
      });
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

inventoryRouter.post(
  '/',
  validate(createInventoryTransactionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await inventoryRepository.create(req.body);
      res.status(201).json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  },
);

inventoryRouter.get('/stock/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await inventoryRepository.getStockSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transaction = await inventoryRepository.findById(req.params.id!);
    if (!transaction) throw new AppError('Transaction not found', 404);
    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
});
