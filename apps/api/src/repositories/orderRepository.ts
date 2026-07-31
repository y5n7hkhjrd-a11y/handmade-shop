import { prisma } from '../lib/prisma.js';

function pad(num: number, size: number): string {
  return String(num).padStart(size, '0');
}

async function generateOrderId(): Promise<string> {
  const now = new Date();
  const yymmdd =
    now.getFullYear().toString().slice(2) +
    pad(now.getMonth() + 1, 2) +
    pad(now.getDate(), 2);

  // Atomically increment the daily counter using upsert
  const seq = await prisma.orderSequence.upsert({
    where: { date: yymmdd },
    update: { counter: { increment: 1 } },
    create: { date: yymmdd, counter: 1 },
  });

  return `${yymmdd}-${pad(seq.counter, 3)}`;
}

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
    deadlineFilter?: string;
  }) {
    const where: any = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.customerId) where.customerId = params.customerId;
    if (params.startDate || params.endDate) {
      where.orderDate = {};
      if (params.startDate) where.orderDate.gte = new Date(params.startDate);
      if (params.endDate) where.orderDate.lte = new Date(params.endDate);
    }
    if (params.deadlineFilter === 'overdue') {
      where.deadline = { not: null, lt: new Date() };
      where.status = { notIn: ['Completed', 'ReadyToShip'] };
    } else if (params.deadlineFilter === 'soon') {
      const now = new Date();
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      where.deadline = { not: null, gte: now, lte: in3Days };
      where.status = { notIn: ['Completed', 'ReadyToShip'] };
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
    deadline?: string;
    notes?: string;
    paidAmount?: number;
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
    const id = await generateOrderId();
    const { items, orderLines, ...orderData } = data;
    const subtotal = data.subtotal ?? items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const packagingCost = data.packagingCost ?? 0;
    const materialCost = data.materialCost ?? 0;
    const itemTotal = items.reduce((sum, i) => sum + (i as any).unitPrice * (i as any).quantity, 0);
    const totalCost = data.totalCost ?? itemTotal + packagingCost;
    return (prisma.order as any).create({
      data: {
        id,
        ...orderData,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
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
    if (status === 'Packaging') updateData.packagedAt = new Date();
    if (status === 'ReadyToShip') updateData.sentAt = new Date();
    if (status === 'Completed') updateData.completedAt = new Date();
    // Fetch current order to determine transition direction
    const existing = await prisma.order.findUnique({
      where: { id },
      select: { confirmedAt: true, status: true },
    });
    if (existing) {
      if (status === 'Draft') {
        // Backward WaitingConfirm → Draft: clear confirmedAt
        updateData.confirmedAt = null;
      } else if (status === 'WaitingConfirm') {
        if (existing.status === 'InProgress') {
          // Backward InProgress → WaitingConfirm: clear confirmedAt
          updateData.confirmedAt = null;
        } else if (!existing.confirmedAt) {
          // Forward Draft → WaitingConfirm: set confirmedAt
          updateData.confirmedAt = new Date();
        }
      }
    }
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
      salePriceSnapshot: order.subtotal,
      costSnapshot: order.totalCost,
      materialCost: order.materialCost,
      packagingCost: order.packagingCost,
    };
    // Only set confirmedAt on first confirmation — don't overwrite if order goes back and forth
    if (!order.confirmedAt) {
      updateData.confirmedAt = new Date();
    }
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
    data: { productId: string; quantity: number; unitPrice: number; unitCost?: number; notes?: string },
  ) {
    const salePrice = data.unitPrice || 0;  // User-entered sale price
    const itemCost = data.unitCost ?? salePrice;  // Actual cost per unit (passed from service or fallback)
    const totalPrice = itemCost * data.quantity;  // Cost * qty for OrderItem
    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) return null;

    const existingItemTotal = order.items.reduce((sum, i) => sum + Number(i.totalPrice), 0);
    const newSubtotal = Number(order.subtotal) + salePrice * data.quantity;  // Use sale price for subtotal
    const newTotal =
      existingItemTotal +
      totalPrice +
      Number(order.packagingCost) +
      Number(order.shippingCost) -
      Number(order.discount);

    await prisma.orderItem.create({
      data: {
        orderId: id,
        productId: data.productId,
        quantity: data.quantity,
        unitPrice: itemCost,  // Store cost price for cost tracking
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
        unitPrice: salePrice,  // Store sale price for display
        notes: data.notes,
      },
    });

    return prisma.order.update({
      where: { id },
      data: { subtotal: newSubtotal, totalCost: newTotal, materialCost: { increment: totalPrice } },
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
    data: { notes?: string; paidAmount?: number; deadline?: string; orderLines: any[] },
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
    if (data.paidAmount != null) {
      updateData.paidAmount = data.paidAmount;
    }
    if (data.deadline !== undefined) {
      updateData.deadline = data.deadline ? new Date(data.deadline) : null;
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
  },    async update(id: string, data: { discount?: number; paidAmount?: number; deadline?: string; shippingCost?: number; shippingPaidBy?: string; notes?: string }) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) return null;
    const discount = data.discount ?? Number(order.discount);
    const itemTotal = order.items.reduce((sum, i) => sum + Number(i.totalPrice), 0);
    const totalCost =
      itemTotal - discount + Number(order.packagingCost) + Number(order.shippingCost);
    const updateData: any = { ...data, totalCost };
    if (data.deadline !== undefined) {
      updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    }
    return (prisma.order as any).update({
      where: { id },
      data: updateData,
      include: { customer: true, items: { include: { product: true } }, shipping: true },
    });
  },

  async softDelete(id: string) {
    return prisma.order.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async getStatusCounts() {
    const counts = await prisma.order.groupBy({
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

  async getRecent(limit = 10) {
    return prisma.order.findMany({
      where: { deletedAt: null },
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
