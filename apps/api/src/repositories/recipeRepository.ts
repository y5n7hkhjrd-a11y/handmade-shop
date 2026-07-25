import { prisma } from '../lib/prisma.js';

export const recipeRepository = {
  async findById(id: string) {
    return prisma.recipe.findUnique({ where: { id } });
  },

  async findByIdWithProducts(id: string) {
    return prisma.recipe.findUnique({
      where: { id },
      include: {
        recipeProducts: {
          include: {
            product: true,
            matchingRule: true,
          },
        },
      },
    });
  },

  async list(params: { page: number; limit: number; search?: string }) {
    const where: any = { deletedAt: null };
    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }
    const [data, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        include: { recipeProducts: { include: { product: true, matchingRule: true } } },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.recipe.count({ where }),
    ]);
    return { data, total };
  },

  async create(data: {
    name: string;
    description?: string;
    notes?: string;
    recipeProducts?: Array<{ productId: string; quantity: number; matchingRuleId?: string }>;
  }) {
    const { recipeProducts, ...recipeData } = data;
    return prisma.recipe.create({
      data: {
        ...recipeData,
        recipeProducts: recipeProducts?.length
          ? {
              createMany: { data: recipeProducts },
            }
          : undefined,
      },
      include: { recipeProducts: { include: { product: true, matchingRule: true } } },
    });
  },

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      notes?: string;
      recipeProducts?: Array<{ productId: string; quantity: number; matchingRuleId?: string }>;
    },
  ) {
    const { recipeProducts, ...recipeData } = data;
    if (recipeProducts) {
      await prisma.recipeProduct.deleteMany({ where: { recipeId: id } });
      if (recipeProducts.length > 0) {
        await prisma.recipeProduct.createMany({
          data: recipeProducts.map((rp) => ({ ...rp, recipeId: id })),
        });
      }
    }
    return prisma.recipe.update({
      where: { id },
      data: recipeData,
      include: { recipeProducts: { include: { product: true, matchingRule: true } } },
    });
  },

  async softDelete(id: string) {
    return prisma.recipe.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
