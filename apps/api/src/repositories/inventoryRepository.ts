import { prisma } from '../lib/prisma.js';

export const inventoryRepository = {
  async findById(id: string) {
    return prisma.inventoryTransaction.findUnique({ where: { id }, include: { product: true } });
  },

  async list(params: {
    page: number;
    limit: number;
    type?: string;
    productId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};
    if (params.type) where.type = params.type;
    if (params.productId) where.productId = params.productId;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }
    const [data, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        include: { product: true },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inventoryTransaction.count({ where }),
    ]);
    return { data, total };
  },

  async create(data: {
    type: string;
    productId?: string;
    componentName?: string;
    quantity: number;
    unit?: string;
    reference?: string;
    notes?: string;
  }) {
    return prisma.inventoryTransaction.create({
      data: data as any,
      include: { product: true },
    });
  },

  async getStockSummary() {
    const transactions = await prisma.inventoryTransaction.groupBy({
      by: ['productId', 'componentName'],
      _sum: { quantity: true },
    });
    return transactions;
  },
};
