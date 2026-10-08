import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../middleware/errorHandler.js';

// Mock the orderRepository before importing orderService
vi.mock('../repositories/orderRepository.js', () => ({
  orderRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock other repositories that orderService imports but markPaid doesn't use
vi.mock('../repositories/productRepository.js', () => ({
  productRepository: {},
}));
vi.mock('../repositories/recipeRepository.js', () => ({
  recipeRepository: {},
}));
vi.mock('./costEngineService.js', () => ({
  costEngineService: {},
}));

const { orderRepository } = await import('../repositories/orderRepository.js');
const { orderService } = await import('./orderService.js');

describe('orderService.markPaid', () => {
  const mockOrder = {
    id: 'order-123',
    status: 'InProgress',
    paidAmount: 0,
    subtotal: 50000,
    discount: 0,
    packagingCost: 5000,
    shippingCost: 3000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update paidAmount successfully when order exists', async () => {
    vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as any);
    vi.mocked(orderRepository.update).mockResolvedValue({
      ...mockOrder,
      paidAmount: 58000,
    } as any);

    const result = await orderService.markPaid('order-123', 58000);

    expect(orderRepository.findById).toHaveBeenCalledWith('order-123');
    expect(orderRepository.update).toHaveBeenCalledWith('order-123', {
      paidAmount: 58000,
    });
    expect(result.paidAmount).toBe(58000);
  });

  it('should throw AppError with status 404 when order is not found', async () => {
    vi.mocked(orderRepository.findById).mockResolvedValue(null);

    const err = await orderService.markPaid('non-existent', 50000).catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe('Order not found');
    expect(err.statusCode).toBe(404);
  });

  it('should throw AppError when paidAmount is negative', async () => {
    vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as any);

    await expect(orderService.markPaid('order-123', -1000)).rejects.toThrow(AppError);
    await expect(orderService.markPaid('order-123', -1000)).rejects.toThrow(
      'Số tiền đã thanh toán không hợp lệ',
    );
    expect(orderRepository.update).not.toHaveBeenCalled();
  });

  it('should accept zero as a valid paidAmount', async () => {
    vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as any);
    vi.mocked(orderRepository.update).mockResolvedValue({
      ...mockOrder,
      paidAmount: 0,
    } as any);

    const result = await orderService.markPaid('order-123', 0);

    expect(orderRepository.update).toHaveBeenCalledWith('order-123', { paidAmount: 0 });
    expect(result.paidAmount).toBe(0);
  });
});
