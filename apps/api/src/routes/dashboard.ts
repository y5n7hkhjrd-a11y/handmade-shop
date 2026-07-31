import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { OrderStatus } from '@handmade-shop/shared';
import { orderRepository } from '../repositories/orderRepository.js';

export const dashboardRouter: Router = Router();

dashboardRouter.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const [
      totalOrders,
      completedOrders,
      activeOrders,
      recentOrders,
      deadlineOrders,
      overdueCount,
      soonCount,
    ] = await Promise.all([
      prisma.order.count({ where: { deletedAt: null } }),
      prisma.order.findMany({
        where: { deletedAt: null, status: OrderStatus.Completed },
        select: { salePriceSnapshot: true, costSnapshot: true, totalCost: true },
      }),
      prisma.order.count({
        where: { deletedAt: null, status: { notIn: [OrderStatus.Completed] } },
      }),
      orderRepository.getRecent(10),
      // Orders with deadlines that are upcoming (including overdue)
      prisma.order.findMany({
        where: {
          deletedAt: null,
          deadline: { not: null },
          status: { notIn: [OrderStatus.Completed, OrderStatus.ReadyToShip] },
        },
        include: { customer: true },
        orderBy: { deadline: 'asc' },
        take: 8,
      }),
      // Overdue orders (deadline has passed, not completed)
      prisma.order.count({
        where: {
          deletedAt: null,
          deadline: { lt: now },
          status: { notIn: [OrderStatus.Completed, OrderStatus.ReadyToShip] },
        },
      }),
      // Soon orders (deadline within 3 days, not completed)
      prisma.order.count({
        where: {
          deletedAt: null,
          deadline: { gte: now, lte: in3Days },
          status: { notIn: [OrderStatus.Completed, OrderStatus.ReadyToShip] },
        },
      }),
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
        deadlineOrders,
        overdueCount,
        soonCount,
      },
    });
  } catch (error) {
    next(error);
  }
});
