import { OrderStatus } from '@handmade-shop/shared';
import { orderRepository } from '../repositories/orderRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { recipeRepository } from '../repositories/recipeRepository.js';
import { costEngineService } from './costEngineService.js';
import { AppError } from '../middleware/errorHandler.js';

// Valid workflow transitions
const validTransitions: Record<string, string[]> = {
  [OrderStatus.Draft]: [OrderStatus.WaitingConfirm],
  [OrderStatus.WaitingConfirm]: [OrderStatus.InProgress, OrderStatus.Draft],
  [OrderStatus.InProgress]: [OrderStatus.Packaging, OrderStatus.WaitingConfirm],
  [OrderStatus.Packaging]: [OrderStatus.ReadyToShip, OrderStatus.InProgress],
  [OrderStatus.ReadyToShip]: [OrderStatus.Completed, OrderStatus.Packaging],
  [OrderStatus.Completed]: [],
};

export const orderService = {
  async create(data: {
    customerId: string;
    notes?: string;
    recipeId?: string;
    customInput?: string;
    salePrice?: number;
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
    // ─── NEW: Multi-line OrderLine format ───
    if (data.orderLines && data.orderLines.length > 0) {
      let allItems: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        notes?: string;
      }> = [];
      let totalMaterialCost = 0;
      let totalPackagingCost = 0;
      let totalSubtotal = 0;

      for (const line of data.orderLines) {
        if (line.type === 'RECIPE') {
          // Recipe-based line: use cost engine
          const recipe = await recipeRepository.findByIdWithProducts(line.recipeId!);
          if (!recipe) throw new AppError('Recipe not found', 404);

          const salePrice = Number(line.salePrice) || 0;
          if (salePrice <= 0) throw new AppError('Vui lòng nhập giá bán cho dòng công thức', 400);
          const costResult = await costEngineService.calculateByInput({
            recipeId: line.recipeId!,
            customInput: line.customInput!,
            salePrice,
          });

          const qtyMultiplier = line.quantity || 1;
          const lineItems = costResult.items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity * qtyMultiplier,
            unitPrice: item.quantity > 0 ? Number(item.cost) / item.quantity : 0,
          }));

          allItems.push(...lineItems);
          totalMaterialCost += costResult.materialCost * qtyMultiplier;
          totalPackagingCost += costResult.packagingCost * qtyMultiplier;
          totalSubtotal += salePrice * qtyMultiplier;
        } else {
          // Product-based line: direct product selection
          const product = await productRepository.findById(line.productId!);
          if (!product) throw new AppError(`Product ${line.productId} not found`, 404);

          const qty = line.quantity || 1;
          const unitPrice = line.unitPrice || Number(product.cost);
          allItems.push({
            productId: line.productId!,
            quantity: qty,
            unitPrice,
            notes: line.notes,
          });
          totalSubtotal += unitPrice * qty;
        }
      }

      const totalCost = totalSubtotal + totalPackagingCost;

      return orderRepository.create({
        customerId: data.customerId,
        notes: data.notes,
        subtotal: totalSubtotal,
        materialCost: totalMaterialCost,
        packagingCost: totalPackagingCost,
        totalCost,
        items: allItems,
        orderLines: data.orderLines,
      });
    }

    // ─── Legacy: single recipe-based order ───
    if (data.recipeId && data.customInput !== undefined) {
      const recipe = await recipeRepository.findByIdWithProducts(data.recipeId);
      if (!recipe) {
        throw new AppError('Recipe not found', 404);
      }

      const salePrice = Number(data.salePrice) || 0;
      if (salePrice <= 0) throw new AppError('Vui lòng nhập giá bán cho dòng công thức', 400);

      const costResult = await costEngineService.calculateByInput({
        recipeId: data.recipeId,
        customInput: data.customInput,
        salePrice,
      });

      const items = costResult.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.quantity > 0 ? Number(item.cost) / item.quantity : 0,
      }));

      // Also create an OrderLine for the legacy recipe
      const orderLine = {
        type: 'RECIPE' as const,
        recipeId: data.recipeId,
        customInput: data.customInput,
        salePrice,
        quantity: 1,
      };

      return orderRepository.create({
        customerId: data.customerId,
        notes: data.notes,
        recipeId: data.recipeId,
        customInput: data.customInput,
        subtotal: salePrice,
        materialCost: costResult.materialCost,
        packagingCost: costResult.packagingCost,
        items,
        orderLines: [orderLine],
      });
    }

    // ─── Legacy: product-based order ───
    for (const item of data.items) {
      const product = await productRepository.findById(item.productId);
      if (!product) {
        throw new AppError(`Product ${item.productId} not found`, 404);
      }
    }

    // Create OrderLines for product-based items
    const orderLines = data.items.map((item) => ({
      type: 'PRODUCT' as const,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      packagingTemplateId: item.packagingTemplateId,
      notes: item.notes,
    }));

    return orderRepository.create({
      customerId: data.customerId,
      notes: data.notes,
      items: data.items,
      orderLines,
    });
  },

  async updateStatus(id: string, newStatus: OrderStatus) {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const currentStatus = order.status;
    const allowed = validTransitions[currentStatus];

    if (!allowed || !allowed.includes(newStatus)) {
      throw new AppError(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }

    // Snapshot prices on confirmation
    if (newStatus === OrderStatus.InProgress) {
      return orderRepository.confirmOrder(id);
    }

    return orderRepository.updateStatus(id, newStatus);
  },

  async addItem(
    id: string,
    data: { productId: string; quantity: number; unitPrice: number; notes?: string },
  ) {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    if (order.status !== OrderStatus.Draft) {
      throw new AppError('Can only add products to Draft orders', 400);
    }

    const product = await productRepository.findById(data.productId);
    if (!product) {
      throw new AppError(`Product ${data.productId} not found`, 404);
    }

    return orderRepository.addItem(id, {
      productId: data.productId,
      quantity: data.quantity,
      unitPrice: data.unitPrice || Number(product.cost),
      notes: data.notes,
    });
  },

  async updateLines(
    id: string,
    data: {
      notes?: string;
      orderLines: Array<{
        type: 'RECIPE' | 'PRODUCT';
        recipeId?: string;
        customInput?: string;
        salePrice?: number;
        productId?: string;
        quantity?: number;
        unitPrice?: number;
        notes?: string;
      }>;
    },
  ) {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    if (order.status !== OrderStatus.Draft) {
      throw new AppError('Can only edit Draft orders', 400);
    }

    // Calculate subtotal from user-entered sale prices (not cost prices)
    let subtotal = 0;
    let materialCost = 0;

    // Expand RECIPE lines into OrderItems
    const items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      notes?: string;
    }> = [];
    for (const line of data.orderLines) {
      if (line.type === 'PRODUCT' && line.productId) {
        const qty = line.quantity || 1;
        const unitPrice = line.unitPrice || 0;
        items.push({
          productId: line.productId,
          quantity: qty,
          unitPrice,
          totalPrice: unitPrice * qty,
          notes: line.notes,
        });
        subtotal += unitPrice * qty;
      } else if (line.type === 'RECIPE' && line.recipeId) {
        // Use cost engine for accurate material cost including CHARM matching rules
        if (!line.customInput) throw new AppError('Custom input is required for recipe lines', 400);
        if (!line.salePrice || Number(line.salePrice) <= 0)
          throw new AppError('Vui lòng nhập giá bán cho dòng công thức', 400);
        const costResult = await costEngineService.calculateByInput({
          recipeId: line.recipeId,
          customInput: line.customInput,
          salePrice: Number(line.salePrice) || 0,
        });
        const qtyMultiplier = line.quantity || 1;
        for (const ci of costResult.items) {
          items.push({
            productId: ci.productId,
            quantity: ci.quantity * qtyMultiplier,
            unitPrice: ci.quantity > 0 ? Number(ci.cost) / ci.quantity : 0,
            totalPrice: Number(ci.cost) * qtyMultiplier,
          });
        }
        materialCost += costResult.materialCost * qtyMultiplier;
        // Use user-entered salePrice for subtotal
        subtotal += (Number(line.salePrice) || 0) * qtyMultiplier;
      }
    }

    return orderRepository.replaceLines(id, data, items, subtotal, materialCost);
  },

  async update(id: string, data: { discount?: number; notes?: string }) {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    if (order.status !== OrderStatus.Draft && order.status !== OrderStatus.WaitingConfirm) {
      throw new AppError('Cannot modify order after it has been confirmed');
    }
    return orderRepository.update(id, data);
  },

  async list(params: {
    page: number;
    limit: number;
    status?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return orderRepository.list(params);
  },

  async getById(id: string) {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    return order;
  },
};
