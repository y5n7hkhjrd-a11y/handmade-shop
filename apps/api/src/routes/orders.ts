import { Router, type Request, type Response, type NextFunction } from 'express';
import { orderService } from '../services/orderService.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { createOrderSchema, updateOrderSchema, listOrdersQuerySchema } from '@handmade-shop/shared';
import { OrderStatus } from '@handmade-shop/shared';

export const orderRouter: Router = Router();

orderRouter.get(
  '/',
  validate(listOrdersQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, status, customerId, startDate, endDate, deadlineFilter } = req.query as any;
      const result = await orderService.list({
        page,
        limit,
        status,
        customerId,
        startDate,
        endDate,
        deadlineFilter,
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

orderRouter.get('/counts', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const counts = await orderService.getStatusCounts();
    res.json({ success: true, data: counts });
  } catch (error) {
    next(error);
  }
});

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
    const { status, shippingCost, shippingPaidBy } = req.body;
    // Save shipping info if provided
    if (shippingCost !== undefined || shippingPaidBy !== undefined) {
      const updateData: any = {};
      if (shippingCost !== undefined) updateData.shippingCost = shippingCost;
      if (shippingPaidBy !== undefined) updateData.shippingPaidBy = shippingPaidBy;
      await orderService.update(req.params.id!, updateData);
    }
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
    const { orderLines, notes, paidAmount, deadline } = req.body;
    if (paidAmount !== undefined && (typeof paidAmount !== 'number' || paidAmount < 0)) {
      throw new Error('Số tiền đã thanh toán không hợp lệ');
    }
    const order = await orderService.updateLines(req.params.id!, { orderLines, notes, paidAmount, deadline });
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

orderRouter.patch('/:id/payment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paidAmount } = req.body;
    if (typeof paidAmount !== 'number' || paidAmount < 0) {
      throw new AppError('Số tiền đã thanh toán không hợp lệ');
    }
    const order = await orderService.markPaid(req.params.id!, paidAmount);
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
