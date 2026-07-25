import { prisma } from '../lib/prisma.js';

export const orderRepository = {
  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true, packagingTemplate: { include: { components: true } } } },
        shipping: true,
        recipe: { include: { recipeProducts: { include: { product: true, matchingRule: true } } } },
        orderLines: {
          include: {
            recipe: true,
            product: true,
            packagingTemplate: true,
          },
        },
      },
    });
  },

  async list(params: {
    page: number;
    limit: number;
    status?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.customerId) where.customerId = params.customerId;
    if (params.startDate || params.endDate) {
      where.orderDate = {};
      if (params.startDate) where.orderDate.gte = new Date(params.startDate);
      if (params.endDate) where.orderDate.lte = new Date(params.endDate);
    }
    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: true,
          items: { include: { product: true } },
          shipping: true,
          recipe: true,
          orderLines: { include: { recipe: true, product: true } },
        },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { orderDate: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);
    return { data, total };
  },

  async create(data: {
    customerId: string;
    notes?: string;
    recipeId?: string;
    customInput?: string;
    subtotal?: number;
    materialCost?: number;
    packagingCost?: number;
    totalCost?: number;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      packagingTemplateId?: string;
      notes?: string;
    }>;
    orderLines?: Array<{
      type: 'RECIPE' | 'PRODUCT';
      recipeId?: string;
      customInput?: string;
      salePrice?: number;
      productId?: string;
      quantity?: number;
      unitPrice?: number;
      packagingTemplateId?: string;
      notes?: string;
    }>;
  }) {
    const { items, orderLines, ...orderData } = data;
    const subtotal = data.subtotal ?? items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const packagingCost = data.packagingCost ?? 0;
    const materialCost = data.materialCost ?? 0;
    const itemTotal = items.reduce((sum, i) => sum + (i as any).unitPrice * (i as any).quantity, 0);
    const totalCost = data.totalCost ?? itemTotal + packagingCost;
    return prisma.order.create({
      data: {
        ...orderData,
        subtotal,
        materialCost,
        packagingCost,
        totalCost,
        items:
          items.length > 0
            ? {
                create: items.map((item) => ({
                  ...item,
                  totalPrice: item.unitPrice * item.quantity,
                })),
              }
            : undefined,
        orderLines:
          orderLines && orderLines.length > 0
            ? {
                create: orderLines,
              }
            : undefined,
      },
      include: {
        customer: true,
        items: { include: { product: true } },
        shipping: true,
        recipe: true,
        orderLines: true,
      },
    });
  },

  async updateStatus(id: string, status: string) {
    const updateData: any = { status };
    if (status === 'Completed') updateData.completedAt = new Date();
    return prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        items: { include: { product: true } },
        shipping: true,
        recipe: true,
      },
    });
  },

  async confirmOrder(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        recipe: {
          include: {
            recipeProducts: {
              include: {
                product: true,
                matchingRule: true,
              },
            },
          },
        },
      },
    });
    if (!order) return null;

    // Build recipe snapshot (only for recipe-based orders)
    let recipeSnapshot = null;
    if (order.recipe) {
      recipeSnapshot = {
        id: order.recipe.id,
        name: order.recipe.name,
        description: order.recipe.description,
        products: order.recipe.recipeProducts.map((rp) => ({
          productId: rp.productId,
          productName: rp.product.name,
          productType: rp.product.type,
          productCost: Number(rp.product.cost),
          matchingRule: rp.matchingRule
            ? {
                code: rp.matchingRule.code,
                name: rp.matchingRule.name,
                pattern: rp.matchingRule.pattern,
              }
            : null,
          quantity: rp.quantity,
        })),
      };
    }

    const updateData: any = {
      status: 'InProgress',
      confirmedAt: new Date(),
      salePriceSnapshot: order.subtotal,
      costSnapshot: order.totalCost,
      materialCost: order.materialCost,
      packagingCost: order.packagingCost,
    };
    if (recipeSnapshot) updateData.recipeSnapshot = recipeSnapshot;

    return prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        items: { include: { product: true } },
        shipping: true,
        recipe: true,
      },
    });
  },

  async addItem(
    id: string,
    data: { productId: string; quantity: number; unitPrice: number; notes?: string },
  ) {
    const totalPrice = data.unitPrice * data.quantity;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return null;

    const newSubtotal = Number(order.subtotal) + totalPrice;
    const newTotal =
      newSubtotal +
      Number(order.packagingCost) +
      Number(order.shippingCost) -
      Number(order.discount);

    await prisma.orderItem.create({
      data: {
        orderId: id,
        productId: data.productId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalPrice,
        notes: data.notes,
      },
    });

    await prisma.orderLine.create({
      data: {
        orderId: id,
        type: 'PRODUCT',
        productId: data.productId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        notes: data.notes,
      },
    });

    return prisma.order.update({
      where: { id },
      data: { subtotal: newSubtotal, totalCost: newTotal },
      include: {
        customer: true,
        items: { include: { product: true } },
        shipping: true,
        recipe: true,
        orderLines: true,
      },
    });
  },

  async replaceLines(
    id: string,
    data: { notes?: string; orderLines: any[] },
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      notes?: string;
    }>,
    subtotalOverride?: number,
    materialCostOverride?: number,
  ) {
    // Delete existing items and lines
    await prisma.orderItem.deleteMany({ where: { orderId: id } });
    await prisma.orderLine.deleteMany({ where: { orderId: id } });

    // Use passed subtotal (user-entered sale prices) or calculate from items (cost prices)
    // subtotalOverride should be used when lines include RECIPE lines with salePrice
    const subtotal = subtotalOverride ?? items.reduce((sum, item) => sum + item.totalPrice, 0);

    // Create new items and lines
    if (items.length > 0) {
      await prisma.orderItem.createMany({
        data: items.map((item) => ({ ...item, orderId: id })),
      });
    }

    await prisma.orderLine.createMany({
      data: data.orderLines.map((line: any) => ({ ...line, orderId: id })),
    });

    // Recalculate totals
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return null;

    const discount = Number(order.discount);
    const packagingCost = Number(order.packagingCost);
    const shippingCost = Number(order.shippingCost);
    // Use actual item costs (materialCostOverride) as base for totalCost, not sale-price subtotal
    const itemTotalFromItems = items.reduce((sum, i) => sum + i.totalPrice, 0);
    const totalCost = itemTotalFromItems - discount + packagingCost + shippingCost;

    const updateData: any = { subtotal, totalCost, notes: data.notes };
    if (materialCostOverride != null) {
      updateData.materialCost = materialCostOverride;
    }

    return prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        items: { include: { product: true } },
        shipping: true,
        recipe: true,
        orderLines: { include: { recipe: true, product: true } },
      },
    });
  },

  async update(id: string, data: { discount?: number; notes?: string }) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return null;
    const discount = data.discount ?? Number(order.discount);
    const totalCost =
      Number(order.subtotal) - discount + Number(order.packagingCost) + Number(order.shippingCost);
    return prisma.order.update({
      where: { id },
      data: { ...data, totalCost },
      include: { customer: true, items: { include: { product: true } }, shipping: true },
    });
  },

  async softDelete(id: string) {
    return prisma.order.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async getRecent(limit = 10) {
    return prisma.order.findMany({
      where: { deletedAt: null },
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
