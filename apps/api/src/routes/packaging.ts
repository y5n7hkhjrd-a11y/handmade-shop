import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { packagingRepository } from '../repositories/packagingRepository.js';
import { validate } from '../middleware/validate.js';
import {
  createPackagingTemplateSchema,
  updatePackagingTemplateSchema,
  listPackagingQuerySchema,
} from '@handmade-shop/shared';
import { AppError } from '../middleware/errorHandler.js';

export const packagingRouter: Router = Router();

packagingRouter.get(
  '/',
  validate(listPackagingQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, type, search } = req.query as any;
      const result = await packagingRepository.list({ page, limit, type, search });
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

packagingRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = await packagingRepository.findById(req.params.id!);
    if (!template) throw new AppError('Packaging template not found', 404);
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
});

packagingRouter.post(
  '/',
  validate(createPackagingTemplateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await packagingRepository.create(req.body);
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  },
);

packagingRouter.put(
  '/:id',
  validate(updatePackagingTemplateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await packagingRepository.update(req.params.id!, req.body);
      if (!template) throw new AppError('Packaging template not found', 404);
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  },
);

packagingRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if packaging template has been used in any active order items
    const orderItemCount = await prisma.orderItem.count({
      where: { packagingTemplateId: req.params.id!, order: { deletedAt: null } },
    });
    if (orderItemCount > 0) {
      throw new AppError(
        `Không thể xóa mẫu đóng gói này vì đã được sử dụng trong ${orderItemCount} đơn hàng. Chỉ có thể vô hiệu hóa.`,
        400,
      );
    }
    await packagingRepository.softDelete(req.params.id!);
    res.json({ success: true, message: 'Packaging template deleted' });
  } catch (error) {
    next(error);
  }
});
