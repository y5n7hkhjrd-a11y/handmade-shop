import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { OrderStatus } from '@handmade-shop/shared';
import { orderRepository } from '../repositories/orderRepository.js';

export const dashboardRouter: Router = Router();

dashboardRouter.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalOrders, completedOrders, activeOrders, recentOrders] = await Promise.all([
      prisma.order.count({ where: { deletedAt: null } }),
      prisma.order.findMany({
        where: { deletedAt: null, status: OrderStatus.Completed },
        select: { salePriceSnapshot: true, costSnapshot: true, totalCost: true },
      }),
      prisma.order.count({
        where: { deletedAt: null, status: { notIn: [OrderStatus.Completed] } },
      }),
      orderRepository.getRecent(10),
    ]);

    const totalRevenue = completedOrders.reduce(
      (sum: number, o: { salePriceSnapshot?: any; costSnapshot?: any }) =>
        sum + Number(o.salePriceSnapshot || 0),
      0,
    );
    const totalCost = completedOrders.reduce(
      (sum: number, o: { costSnapshot?: any }) => sum + Number(o.costSnapshot || 0),
      0,
    );
    const totalProfit = totalRevenue - totalCost;

    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue,
        totalProfit,
        activeOrders,
        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
});
