import { prisma } from '../lib/prisma.js';

export const customerRepository = {
  async findById(id: string) {
    return prisma.customer.findUnique({ where: { id } });
  },

  async findByEmail(email: string) {
    return prisma.customer.findUnique({ where: { email } });
  },

  async list(params: { page: number; limit: number; search?: string }) {
    const where: any = { deletedAt: null };
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);
    return { data, total };
  },

  async create(data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }) {
    return prisma.customer.create({ data: data as any });
  },

  async update(
    id: string,
    data: { name?: string; email?: string; phone?: string; address?: string; notes?: string },
  ) {
    return prisma.customer.update({ where: { id }, data: data as any });
  },

  async softDelete(id: string) {
    return prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
