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
    totalCost?: number;
    components?: Array<{ name: string; quantity: number; unit: string; cost: number }>;
  }) {
    const { components, totalCost, ...templateData } = data;
    // Giá cost do người dùng nhập; fallback: tính từ components
    const cost =
      totalCost !== undefined
        ? totalCost
        : (components || []).reduce((sum: number, c: { cost: number }) => sum + c.cost, 0);
    return prisma.packagingTemplate.create({
      data: {
        ...templateData,
        type: templateData.type as PackagingType,
        totalCost: cost,
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
      totalCost?: number;
      components?: Array<{
        id?: string;
        name: string;
        quantity: number;
        unit: string;
        cost: number;
      }>;
    },
  ) {
    const { components, type, totalCost, ...templateData } = data;
    const updateData: any = { ...templateData };
    if (type) updateData.type = type as PackagingType;
    // Giá cost do người dùng nhập có ưu tiên; nếu đổi components mà không nhập giá thì tính lại
    if (totalCost !== undefined) {
      updateData.totalCost = totalCost;
    } else if (components) {
      updateData.totalCost = components.reduce(
        (sum: number, c: { cost: number }) => sum + c.cost,
        0,
      );
    }
    if (components) {
      await prisma.packagingComponent.deleteMany({ where: { packagingTemplateId: id } });
      await prisma.packagingComponent.createMany({
        data: components.map((c) => ({ ...c, packagingTemplateId: id })),
      });
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
