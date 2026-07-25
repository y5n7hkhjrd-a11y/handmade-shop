import { prisma } from '../lib/prisma.js';

export const productRepository = {
  async findById(id: string) {
    return prisma.product.findUnique({ where: { id } });
  },

  async list(params: {
    page: number;
    limit: number;
    type?: string;
    search?: string;
    activeOnly?: boolean;
  }) {
    const where: any = { deletedAt: null };
    if (params.type) where.type = params.type;
    if (params.activeOnly) where.isActive = true;
    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }
    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);
    return { data, total };
  },

  async create(data: any) {
    return prisma.product.create({ data });
  },

  async update(id: string, data: any) {
    return prisma.product.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async getLowStock() {
    return prisma.product.findMany({
      where: { deletedAt: null, isActive: true },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
  },
};
