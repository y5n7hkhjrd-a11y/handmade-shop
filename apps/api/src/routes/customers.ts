import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { validate } from '../middleware/validate.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  paginationSchema,
} from '@handmade-shop/shared';
import { AppError } from '../middleware/errorHandler.js';

export const customerRouter: Router = Router();

customerRouter.get(
  '/',
  validate(paginationSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query as any;
      const search = req.query.search as string | undefined;
      const result = await customerRepository.list({ page, limit, search });
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

customerRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await customerRepository.findById(req.params.id!);
    if (!customer) throw new AppError('Customer not found', 404);
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
});

customerRouter.post(
  '/',
  validate(createCustomerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await customerRepository.create(req.body);
      res.status(201).json({ success: true, data: customer });
    } catch (error) {
      next(error);
    }
  },
);

customerRouter.put(
  '/:id',
  validate(updateCustomerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await customerRepository.update(req.params.id!, req.body);
      if (!customer) throw new AppError('Customer not found', 404);
      res.json({ success: true, data: customer });
    } catch (error) {
      next(error);
    }
  },
);

customerRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if customer has any active orders
    const orderCount = await prisma.order.count({
      where: { customerId: req.params.id!, deletedAt: null },
    });
    if (orderCount > 0) {
      throw new AppError(
        `Không thể xóa khách hàng này vì đã có ${orderCount} đơn hàng. Chỉ có thể vô hiệu hóa.`,
        400,
      );
    }
    await customerRepository.softDelete(req.params.id!);
    res.json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    next(error);
  }
});
