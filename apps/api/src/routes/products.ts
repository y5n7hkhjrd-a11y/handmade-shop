import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { productRepository } from '../repositories/productRepository.js';
import { validate } from '../middleware/validate.js';
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
} from '@handmade-shop/shared';
import { AppError } from '../middleware/errorHandler.js';

export const productRouter: Router = Router();

productRouter.get(
  '/',
  validate(listProductsQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, type, search } = req.query as any;
      const result = await productRepository.list({ page, limit, type, search });
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

productRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productRepository.findById(req.params.id!);
    if (!product) throw new AppError('Product not found', 404);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

productRouter.post(
  '/',
  validate(createProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await productRepository.create(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  },
);

productRouter.put(
  '/:id',
  validate(updateProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await productRepository.update(req.params.id!, req.body);
      if (!product) throw new AppError('Product not found', 404);
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  },
);

productRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if product has been used in any active order items
    const orderItemCount = await prisma.orderItem.count({
      where: { productId: req.params.id!, order: { deletedAt: null } },
    });
    if (orderItemCount > 0) {
      throw new AppError(
        `Không thể xóa nguyên vật liệu này vì đã được sử dụng trong ${orderItemCount} đơn hàng. Chỉ có thể vô hiệu hóa.`,
        400,
      );
    }
    await productRepository.softDelete(req.params.id!);
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
});
