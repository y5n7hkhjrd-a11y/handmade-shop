import { Router, type Request, type Response, type NextFunction } from 'express';
import { orderService } from '../services/orderService.js';
import { validate } from '../middleware/validate.js';
import { createOrderSchema, updateOrderSchema, paginationSchema } from '@handmade-shop/shared';
import { OrderStatus } from '@handmade-shop/shared';

export const orderRouter: Router = Router();

orderRouter.get(
  '/',
  validate(paginationSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query as any;
      const status = req.query.status as string | undefined;
      const customerId = req.query.customerId as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const result = await orderService.list({
        page,
        limit,
        status,
        customerId,
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

orderRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await orderService.getById(req.params.id!);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

orderRouter.post(
  '/',
  validate(createOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await orderService.create(req.body);
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },
);

orderRouter.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const order = await orderService.updateStatus(req.params.id!, status as OrderStatus);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

orderRouter.post('/:id/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, quantity, unitPrice, notes } = req.body;
    const order = await orderService.addItem(req.params.id!, {
      productId,
      quantity: quantity || 1,
      unitPrice: unitPrice || 0,
      notes,
    });
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

orderRouter.put('/:id/lines', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderLines, notes } = req.body;
    const order = await orderService.updateLines(req.params.id!, { orderLines, notes });
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

orderRouter.put(
  '/:id',
  validate(updateOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await orderService.update(req.params.id!, req.body);
      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },
);
