import { prisma } from '../lib/prisma.js';

export const matchingRuleRepository = {
  async findById(id: string) {
    return prisma.matchingRule.findUnique({ where: { id } });
  },

  async findByCode(code: string) {
    return prisma.matchingRule.findUnique({ where: { code } });
  },

  async list(params: { page: number; limit: number; activeOnly?: boolean; search?: string }) {
    const where: any = { deletedAt: null };
    if (params.activeOnly) where.isActive = true;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.matchingRule.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.matchingRule.count({ where }),
    ]);
    return { data, total };
  },

  async listAll() {
    return prisma.matchingRule.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  },

  async create(data: {
    code: string;
    name: string;
    pattern: string;
    description?: string;
    isActive?: boolean;
  }) {
    return prisma.matchingRule.create({ data });
  },

  async update(
    id: string,
    data: {
      code?: string;
      name?: string;
      pattern?: string;
      description?: string;
      isActive?: boolean;
    },
  ) {
    return prisma.matchingRule.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.matchingRule.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
