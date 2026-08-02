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
    deadline?: string;
    notes?: string;
    paidAmount?: number;
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
          const salePrice = line.unitPrice || 0; // User-entered sale price (giá bán)
          const productCost = Number(product.cost); // Actual cost (giá vốn)

          allItems.push({
            productId: line.productId!,
            quantity: qty,
            unitPrice: productCost, // Store cost price for OrderItem cost tracking
            notes: line.notes,
          });
          totalSubtotal += salePrice * qty; // Subtotal uses sale price
          totalMaterialCost += productCost * qty; // Track actual material cost
        }
      }

      // totalCost = actual item costs + packaging, not sale prices
      const totalCost = totalMaterialCost + totalPackagingCost;

      return orderRepository.create({
        customerId: data.customerId,
        notes: data.notes,
        paidAmount: data.paidAmount,
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

      const itemsTotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const totalCost = itemsTotal + costResult.packagingCost;

      return orderRepository.create({
        customerId: data.customerId,
        notes: data.notes,
        paidAmount: data.paidAmount,
        recipeId: data.recipeId,
        customInput: data.customInput,
        subtotal: salePrice,
        materialCost: costResult.materialCost,
        packagingCost: costResult.packagingCost,
        totalCost,
        items,
        orderLines: [orderLine],
      });
    }

    // ─── Legacy: product-based order ───
    // Fetch products and build fixed items with proper cost/sale price separation
    let legacyMaterialCost = 0;
    let legacySubtotal = 0;
    const fixedItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      packagingTemplateId?: string;
      notes?: string;
    }> = [];
    const orderLines: Array<{
      type: 'PRODUCT';
      productId: string;
      quantity: number;
      unitPrice: number;
      packagingTemplateId?: string;
      notes?: string;
    }> = [];
    for (const item of data.items) {
      const product = await productRepository.findById(item.productId);
      if (!product) {
        throw new AppError(`Product ${item.productId} not found`, 404);
      }
      const cost = Number(product.cost);
      const salePrice = item.unitPrice || 0;
      legacyMaterialCost += cost * item.quantity;
      legacySubtotal += salePrice * item.quantity;
      fixedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: cost, // Cost price for OrderItem cost tracking
        packagingTemplateId: item.packagingTemplateId,
        notes: item.notes,
      });
      orderLines.push({
        type: 'PRODUCT' as const,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: salePrice, // Sale price for display
        packagingTemplateId: item.packagingTemplateId,
        notes: item.notes,
      });
    }

    return orderRepository.create({
      customerId: data.customerId,
      notes: data.notes,
      paidAmount: data.paidAmount,
      subtotal: legacySubtotal,
      materialCost: legacyMaterialCost,
      packagingCost: 0,
      totalCost: legacyMaterialCost,
      items: fixedItems,
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

    // Ensure payment before moving to Packaging (InProgress → Packaging)
    if (currentStatus === OrderStatus.InProgress && newStatus === OrderStatus.Packaging) {
      const paid = Number(order.paidAmount) || 0;
      const salePriceTotal =
        Number(order.subtotal || 0) -
        Number(order.discount || 0) +
        Number(order.packagingCost || 0) +
        Number(order.shippingCost || 0);
      const remaining = salePriceTotal - paid;
      if (remaining > 0) {
        throw new AppError(
          'Vui lòng xác nhận khách hàng đã thanh toán trước khi chuyển sang Đơn đã gói',
        );
      }
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
      unitPrice: data.unitPrice || 0, // Sale price (0 if not entered)
      unitCost: Number(product.cost), // Actual cost for OrderItem tracking
      notes: data.notes,
    });
  },

  async updateLines(
    id: string,
    data: {
      notes?: string;
      paidAmount?: number;
      deadline?: string;
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
        const product = await productRepository.findById(line.productId);
        if (!product) throw new AppError(`Product ${line.productId} not found`, 404);

        const qty = line.quantity || 1;
        const salePrice = line.unitPrice || 0; // User-entered sale price
        const productCost = Number(product.cost); // Actual cost

        items.push({
          productId: line.productId,
          quantity: qty,
          unitPrice: productCost, // Store cost price for OrderItem cost tracking
          totalPrice: productCost * qty, // Cost * qty for cost tracking
          notes: line.notes,
        });
        subtotal += salePrice * qty; // Subtotal uses sale price
        materialCost += productCost * qty; // Track material cost
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

  async update(
    id: string,
    data: {
      discount?: number;
      paidAmount?: number;
      deadline?: string;
      shippingCost?: number;
      shippingPaidBy?: string;
      notes?: string;
    },
  ) {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    // Allow shipping-related fields to be updated at any status; block other field changes post-confirmation
    const shippingOnly = Object.keys(data).every((k) =>
      ['shippingCost', 'shippingPaidBy'].includes(k),
    );
    if (
      !shippingOnly &&
      order.status !== OrderStatus.Draft &&
      order.status !== OrderStatus.WaitingConfirm
    ) {
      throw new AppError('Cannot modify order after it has been confirmed');
    }
    return orderRepository.update(id, data);
  },

  async list(params: {
    page: number;
    limit: number;
    status?: string;
    customerId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    deadlineFilter?: string;
  }) {
    return orderRepository.list(params);
  },

  async getStatusCounts() {
    return orderRepository.getStatusCounts();
  },

  async getById(id: string) {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    return order;
  },

  async markPaid(id: string, paidAmount: number) {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    if (paidAmount < 0) {
      throw new AppError('Số tiền đã thanh toán không hợp lệ');
    }
    return orderRepository.update(id, { paidAmount });
  },
};
