import { prisma } from '../lib/prisma.js';
import { ProductType } from '@handmade-shop/shared';

export const costRuleRepository = {
  async findById(id: string) {
    return prisma.costRule.findUnique({ where: { id }, include: { product: true } });
  },

  async list(params: { page: number; limit: number; productType?: string; activeOnly?: boolean }) {
    const where: any = { deletedAt: null };
    if (params.productType) where.productType = params.productType;
    if (params.activeOnly) where.isActive = true;
    const [data, total] = await Promise.all([
      prisma.costRule.findMany({
        where,
        include: { product: true },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.costRule.count({ where }),
    ]);
    return { data, total };
  },

  async create(data: {
    name: string;
    productType: ProductType;
    productId?: string;
    formula: any;
    isActive?: boolean;
  }) {
    return prisma.costRule.create({ data: data as any, include: { product: true } });
  },

  async update(id: string, data: { name?: string; formula?: any; isActive?: boolean }) {
    return prisma.costRule.update({ where: { id }, data, include: { product: true } });
  },

  async softDelete(id: string) {
    return prisma.costRule.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async findByProductType(productType: ProductType) {
    return prisma.costRule.findMany({
      where: { productType, isActive: true, deletedAt: null },
    });
  },
};
