import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler, AppError } from '../middleware/errorHandler.js';

// Mock the orderService before importing orderRouter
vi.mock('../services/orderService.js', () => ({
  orderService: {
    markPaid: vi.fn(),
  },
}));

const { orderService } = await import('../services/orderService.js');
const { orderRouter } = await import('./orders.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', orderRouter);
  app.use(errorHandler);
  return app;
}

describe('PATCH /api/orders/:id/payment', () => {
  const mockOrder = {
    id: 'order-123',
    status: 'InProgress',
    paidAmount: 58000,
    subtotal: 50000,
    discount: 0,
    packagingCost: 5000,
    shippingCost: 3000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 and update paidAmount successfully', async () => {
    vi.mocked(orderService.markPaid).mockResolvedValue(mockOrder as any);

    const app = createApp();
    const res = await request(app)
      .patch('/api/orders/order-123/payment')
      .send({ paidAmount: 58000 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(mockOrder);
    expect(orderService.markPaid).toHaveBeenCalledWith('order-123', 58000);
  });

  it('should return 400 when paidAmount is negative', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/orders/order-123/payment')
      .send({ paidAmount: -1000 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Số tiền đã thanh toán không hợp lệ');
    expect(orderService.markPaid).not.toHaveBeenCalled();
  });

  it('should return 400 when paidAmount is not a number', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/orders/order-123/payment')
      .send({ paidAmount: 'not-a-number' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Số tiền đã thanh toán không hợp lệ');
    expect(orderService.markPaid).not.toHaveBeenCalled();
  });

  it('should return 400 when paidAmount is missing', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/orders/order-123/payment')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Số tiền đã thanh toán không hợp lệ');
    expect(orderService.markPaid).not.toHaveBeenCalled();
  });

  it('should return 404 when order is not found', async () => {
    vi.mocked(orderService.markPaid).mockRejectedValue(
      new AppError('Order not found', 404),
    );

    const app = createApp();
    const res = await request(app)
      .patch('/api/orders/non-existent/payment')
      .send({ paidAmount: 50000 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Order not found');
    expect(orderService.markPaid).toHaveBeenCalledWith('non-existent', 50000);
  });
});
