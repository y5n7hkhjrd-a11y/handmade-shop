import { prisma } from '../lib/prisma.js';

export const shippingRepository = {
  async findById(id: string) {
    return prisma.shipping.findUnique({ where: { id }, include: { order: true } });
  },

  async findByOrderId(orderId: string) {
    return prisma.shipping.findMany({
      where: { orderId, deletedAt: null },
      include: { order: true },
    });
  },

  async list(params: { page: number; limit: number; status?: string; orderId?: string }) {
    const where: any = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.orderId) where.orderId = params.orderId;
    const [data, total] = await Promise.all([
      prisma.shipping.findMany({
        where,
        include: { order: { include: { customer: true } } },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.shipping.count({ where }),
    ]);
    return { data, total };
  },

  async create(data: {
    orderId: string;
    deliveryType: string;
    shippingMethod: string;
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    driverName?: string;
    driverPhone?: string;
    eta?: Date;
    cost?: number;
  }) {
    return prisma.shipping.create({ data: data as any, include: { order: true } });
  },

  async update(
    id: string,
    data: {
      status?: string;
      trackingNumber?: string;
      trackingUrl?: string;
      carrier?: string;
      driverName?: string;
      driverPhone?: string;
      eta?: Date;
      shippedAt?: Date;
      deliveredAt?: Date;
      cost?: number;
    },
  ) {
    return prisma.shipping.update({ where: { id }, data: data as any, include: { order: true } });
  },

  async softDelete(id: string) {
    return prisma.shipping.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async getCounts() {
    const counts = await prisma.shipping.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    });
    const result: Record<string, number> = {};
    for (const c of counts) {
      result[c.status] = c._count.id;
    }
    return result;
  },
};
