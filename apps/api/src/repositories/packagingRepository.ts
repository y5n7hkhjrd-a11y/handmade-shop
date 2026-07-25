import { prisma } from '../lib/prisma.js';
import { PackagingType } from '@handmade-shop/shared';

export const packagingRepository = {
  async findById(id: string) {
    return prisma.packagingTemplate.findUnique({ where: { id }, include: { components: true } });
  },

  async list(params: { page: number; limit: number; type?: string; search?: string }) {
    const where: any = { deletedAt: null };
    if (params.type) where.type = params.type;
    if (params.search) where.name = { contains: params.search, mode: 'insensitive' };
    const [data, total] = await Promise.all([
      prisma.packagingTemplate.findMany({
        where,
        include: { components: true },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.packagingTemplate.count({ where }),
    ]);
    return { data, total };
  },

  async create(data: {
    name: string;
    type: string;
    description?: string;
    components?: Array<{ name: string; quantity: number; unit: string; cost: number }>;
  }) {
    const { components, ...templateData } = data;
    const totalCost = (components || []).reduce(
      (sum: number, c: { cost: number }) => sum + c.cost,
      0,
    );
    return prisma.packagingTemplate.create({
      data: {
        ...templateData,
        type: templateData.type as PackagingType,
        totalCost,
        components: components ? { createMany: { data: components } } : undefined,
      },
      include: { components: true },
    });
  },

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      type?: string;
      components?: Array<{
        id?: string;
        name: string;
        quantity: number;
        unit: string;
        cost: number;
      }>;
    },
  ) {
    const { components, type, ...templateData } = data;
    const updateData: any = { ...templateData };
    if (type) updateData.type = type as PackagingType;
    if (components) {
      await prisma.packagingComponent.deleteMany({ where: { packagingTemplateId: id } });
      await prisma.packagingComponent.createMany({
        data: components.map((c) => ({ ...c, packagingTemplateId: id })),
      });
      const totalCost = components.reduce((sum: number, c: { cost: number }) => sum + c.cost, 0);
      await prisma.packagingTemplate.update({ where: { id }, data: { totalCost } });
    }
    return prisma.packagingTemplate.update({
      where: { id },
      data: updateData,
      include: { components: true },
    });
  },

  async softDelete(id: string) {
    return prisma.packagingTemplate.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
