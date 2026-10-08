import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/orderRepository.js', () => ({
  orderRepository: {
    findById: vi.fn(),
    replaceLines: vi.fn(),
  },
}));
vi.mock('../repositories/productRepository.js', () => ({
  productRepository: { findById: vi.fn() },
}));
vi.mock('../repositories/recipeRepository.js', () => ({
  recipeRepository: {},
}));
vi.mock('../repositories/packagingRepository.js', () => ({
  packagingRepository: { findById: vi.fn() },
}));
vi.mock('./costEngineService.js', () => ({
  costEngineService: { calculateByInput: vi.fn() },
}));

const { orderRepository } = await import('../repositories/orderRepository.js');
const { productRepository } = await import('../repositories/productRepository.js');
const { packagingRepository } = await import('../repositories/packagingRepository.js');
const { orderService } = await import('./orderService.js');

describe('orderService.updateLines — packaging (ITEM per line + ORDER for whole order)', () => {
  const draftOrder = { id: 'ORD-1', status: 'Draft' };
  const itemTpl = { id: 'tpl-item', type: 'ITEM', totalCost: 5000, deletedAt: null };
  const orderTpl = { id: 'tpl-order', type: 'ORDER', totalCost: 20000, deletedAt: null };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(orderRepository.findById).mockResolvedValue(draftOrder as any);
    vi.mocked(packagingRepository.findById).mockImplementation(async (id: string) => {
      if (id === 'tpl-item') return itemTpl as any;
      if (id === 'tpl-order') return orderTpl as any;
      return null;
    });
    vi.mocked(productRepository.findById).mockResolvedValue({ id: 'p1', cost: 10000 } as any);
    vi.mocked(orderRepository.replaceLines).mockResolvedValue({} as any);
  });

  it('includes ORDER-template cost exactly once (not multiplied by quantity)', async () => {
    await orderService.updateLines('ORD-1', {
      orderPackagingTemplateId: 'tpl-order',
      orderLines: [
        {
          type: 'PRODUCT',
          productId: 'p1',
          quantity: 3,
          unitPrice: 30000,
          packagingTemplateId: 'tpl-item',
        },
        {
          type: 'PRODUCT',
          productId: 'p1',
          quantity: 2,
          unitPrice: 30000,
          packagingTemplateId: 'tpl-item',
        },
      ],
    });

    // replaceLines(id, data, items, subtotal, materialCost, packagingCost)
    const packagingCost = vi.mocked(orderRepository.replaceLines).mock.calls[0]![5];
    // ITEM: 5000*3 + 5000*2 = 25000; ORDER: 20000 once → 45000
    expect(packagingCost).toBe(45000);
  });

  it('passes subtotal/materialCost overrides alongside packaging', async () => {
    await orderService.updateLines('ORD-1', {
      orderPackagingTemplateId: 'tpl-order',
      orderLines: [
        {
          type: 'PRODUCT',
          productId: 'p1',
          quantity: 1,
          unitPrice: 30000,
          packagingTemplateId: '',
        },
      ],
    });

    const [, , items, subtotal, materialCost, packagingCost] = vi.mocked(
      orderRepository.replaceLines,
    ).mock.calls[0]!;
    expect(items).toHaveLength(1);
    expect(subtotal).toBe(30000); // 1 × 30000 sale price
    expect(materialCost).toBe(10000); // 1 × 10000 cost
    expect(packagingCost).toBe(20000); // ORDER template once
  });

  it('keeps ITEM template on line 0 and passes ORDER template via its own field', async () => {
    await orderService.updateLines('ORD-1', {
      orderPackagingTemplateId: 'tpl-order',
      orderLines: [
        {
          type: 'PRODUCT',
          productId: 'p1',
          quantity: 1,
          unitPrice: 30000,
          packagingTemplateId: 'tpl-item',
        },
      ],
    });

    const [, data] = vi.mocked(orderRepository.replaceLines).mock.calls[0]!;
    // ORDER template lives in its own field, never on an order line
    expect(data.orderPackagingTemplateId).toBe('tpl-order');
    // Line 0 must keep its own ITEM template — the two must not collide
    expect(data.orderLines[0]!.packagingTemplateId).toBe('tpl-item');
  });

  it('clears the ORDER template when the selection is removed', async () => {
    await orderService.updateLines('ORD-1', {
      orderLines: [
        {
          type: 'PRODUCT',
          productId: 'p1',
          quantity: 1,
          unitPrice: 30000,
          packagingTemplateId: '',
        },
      ],
    });

    const [, data] = vi.mocked(orderRepository.replaceLines).mock.calls[0]!;
    expect(data.orderPackagingTemplateId).toBeUndefined();
    expect(data.orderLines[0]!.packagingTemplateId).toBeUndefined();
  });

  it('rejects two different ORDER templates', async () => {
    vi.mocked(packagingRepository.findById).mockImplementation(async (id: string) => {
      if (id === 'tpl-item') return itemTpl as any;
      if (id === 'tpl-order') return orderTpl as any;
      if (id === 'tpl-order-2')
        return { id: 'tpl-order-2', type: 'ORDER', totalCost: 9000, deletedAt: null } as any;
      return null;
    });

    const err = await orderService
      .updateLines('ORD-1', {
        orderLines: [
          {
            type: 'PRODUCT',
            productId: 'p1',
            quantity: 1,
            unitPrice: 30000,
            packagingTemplateId: 'tpl-order',
          },
          {
            type: 'PRODUCT',
            productId: 'p1',
            quantity: 1,
            unitPrice: 30000,
            packagingTemplateId: 'tpl-order-2',
          },
        ],
      })
      .catch((e) => e);

    expect(err.message).toBe('Chỉ được chọn một mẫu đóng gói cho cả đơn hàng');
    expect(orderRepository.replaceLines).not.toHaveBeenCalled();
  });
});
