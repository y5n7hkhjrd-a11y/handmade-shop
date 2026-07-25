import { Router, type Request, type Response, type NextFunction } from 'express';
import { shippingRepository } from '../repositories/shippingRepository.js';
import { validate } from '../middleware/validate.js';
import {
  createShippingSchema,
  updateShippingSchema,
  paginationSchema,
} from '@handmade-shop/shared';
import { AppError } from '../middleware/errorHandler.js';

export const shippingRouter: Router = Router();

shippingRouter.get(
  '/',
  validate(paginationSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query as any;
      const status = req.query.status as string | undefined;
      const orderId = req.query.orderId as string | undefined;
      const result = await shippingRepository.list({ page, limit, status, orderId });
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

shippingRouter.get('/order/:orderId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shipments = await shippingRepository.findByOrderId(req.params.orderId!);
    res.json({ success: true, data: shipments });
  } catch (error) {
    next(error);
  }
});

shippingRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shipping = await shippingRepository.findById(req.params.id!);
    if (!shipping) throw new AppError('Shipping record not found', 404);
    res.json({ success: true, data: shipping });
  } catch (error) {
    next(error);
  }
});

shippingRouter.post(
  '/',
  validate(createShippingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const shipping = await shippingRepository.create({
        ...req.body,
        eta: req.body.eta ? new Date(req.body.eta) : undefined,
      });
      res.status(201).json({ success: true, data: shipping });
    } catch (error) {
      next(error);
    }
  },
);

shippingRouter.put(
  '/:id',
  validate(updateShippingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: any = { ...req.body };
      if (data.eta) data.eta = new Date(data.eta);
      if (data.shippedAt) data.shippedAt = new Date(data.shippedAt);
      if (data.deliveredAt) data.deliveredAt = new Date(data.deliveredAt);
      const shipping = await shippingRepository.update(req.params.id!, data);
      if (!shipping) throw new AppError('Shipping record not found', 404);
      res.json({ success: true, data: shipping });
    } catch (error) {
      next(error);
    }
  },
);

shippingRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await shippingRepository.softDelete(req.params.id!);
    res.json({ success: true, message: 'Shipping record deleted' });
  } catch (error) {
    next(error);
  }
});
