import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { OrderStatus } from '@handmade-shop/shared';

export const reportRouter: Router = Router();

reportRouter.get('/revenue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = { deletedAt: null, status: OrderStatus.Completed };
    if (startDate || endDate) {
      where.completedAt = {};
      if (startDate) where.completedAt.gte = new Date(startDate as string);
      if (endDate) where.completedAt.lte = new Date(endDate as string);
    }

    const orders = await prisma.order.findMany({
      where,
      select: { totalCost: true, salePriceSnapshot: true, costSnapshot: true, completedAt: true },
    });

    const revenue = orders.reduce(
      (sum: number, o: { salePriceSnapshot?: any }) => sum + Number(o.salePriceSnapshot || 0),
      0,
    );
    const cost = orders.reduce(
      (sum: number, o: { costSnapshot?: any }) => sum + Number(o.costSnapshot || 0),
      0,
    );
    const profit = revenue - cost;

    res.json({
      success: true,
      data: {
        revenue,
        cost,
        profit,
        orderCount: orders.length,
        period: {
          startDate: startDate || 'all',
          endDate: endDate || 'all',
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

reportRouter.get('/top-products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const items = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i: { productId: string }) => i.productId) } },
      select: { id: true, name: true },
    });

    const productMap = new Map(products.map((p: { id: string; name: string }) => [p.id, p.name]));

    const topProducts = items.map(
      (item: { productId: string; _sum: { quantity: number | null; totalPrice: any } }) => ({
        productId: item.productId,
        productName: productMap.get(item.productId) || 'Unknown',
        totalSold: item._sum.quantity || 0,
        totalRevenue: Number(item._sum.totalPrice) || 0,
      }),
    );

    res.json({ success: true, data: topProducts });
  } catch (error) {
    next(error);
  }
});

reportRouter.get('/top-customers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const orders = await prisma.order.groupBy({
      by: ['customerId'],
      _count: { id: true },
      _sum: { totalCost: true },
      where: { deletedAt: null },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const customers = await prisma.customer.findMany({
      where: { id: { in: orders.map((o: { customerId: string }) => o.customerId) } },
      select: { id: true, name: true },
    });

    const customerMap = new Map(customers.map((c: { id: string; name: string }) => [c.id, c.name]));

    const topCustomers = orders.map(
      (order: { customerId: string; _count: { id: number }; _sum: { totalCost: any } }) => ({
        customerId: order.customerId,
        customerName: customerMap.get(order.customerId) || 'Unknown',
        totalOrders: order._count.id,
        totalSpent: Number(order._sum.totalCost) || 0,
      }),
    );

    res.json({ success: true, data: topCustomers });
  } catch (error) {
    next(error);
  }
});

reportRouter.get('/profit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;
    const where: any = { deletedAt: null, status: OrderStatus.Completed };
    if (startDate || endDate) {
      where.completedAt = {};
      if (startDate) where.completedAt.gte = new Date(startDate as string);
      if (endDate) where.completedAt.lte = new Date(endDate as string);
    }

    const orders = await prisma.order.findMany({
      where,
      select: { totalCost: true, salePriceSnapshot: true, costSnapshot: true, completedAt: true },
      orderBy: { completedAt: 'asc' },
    });

    const grouped = orders.reduce(
      (
        acc: Record<string, { revenue: number; cost: number; profit: number; orderCount: number }>,
        order: { completedAt: Date | null; salePriceSnapshot?: any; costSnapshot?: any },
      ) => {
        const date = order.completedAt ? new Date(order.completedAt) : new Date();
        const key =
          groupBy === 'month'
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            : `${date.getFullYear()}`;
        if (!acc[key]) acc[key] = { revenue: 0, cost: 0, profit: 0, orderCount: 0 };
        acc[key]!.revenue += Number(order.salePriceSnapshot || 0);
        acc[key]!.cost += Number(order.costSnapshot || 0);
        acc[key]!.profit += Number(order.salePriceSnapshot || 0) - Number(order.costSnapshot || 0);
        acc[key]!.orderCount++;
        return acc;
      },
      {} as Record<string, { revenue: number; cost: number; profit: number; orderCount: number }>,
    );

    const data = Object.entries(grouped).map(([period, stats]) => ({ period, ...stats }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

reportRouter.get('/inventory', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      where: { deletedAt: null, isActive: true },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });

    const inventoryReport = products.map(
      (product: {
        id: string;
        name: string;
        transactions: Array<{ type: string; quantity: any }>;
      }) => {
        const totalImported = product.transactions
          .filter((t) => t.type === 'IMPORT')
          .reduce((sum: number, t: { quantity: any }) => sum + Number(t.quantity), 0);
        const totalSold = product.transactions
          .filter((t) => t.type === 'SALE')
          .reduce((sum: number, t: { quantity: any }) => sum + Number(t.quantity), 0);
        const totalAdjusted = product.transactions
          .filter((t) => t.type === 'ADJUSTMENT')
          .reduce((sum: number, t: { quantity: any }) => sum + Number(t.quantity), 0);

        return {
          productId: product.id,
          productName: product.name,
          totalImported,
          totalSold,
          totalAdjusted,
          currentStock: totalImported - totalSold + totalAdjusted,
        };
      },
    );

    res.json({ success: true, data: inventoryReport });
  } catch (error) {
    next(error);
  }
});
