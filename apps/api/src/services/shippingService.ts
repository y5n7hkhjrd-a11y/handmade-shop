import { prisma } from '../lib/prisma.js';
import { shippingRepository } from '../repositories/shippingRepository.js';
import { orderRepository } from '../repositories/orderRepository.js';

/**
 * Auto-advance order status based on shipping status:
 * - Shipping Shipped/InTransit → Order ReadyToShip (nếu order đang ở Packaging)
 * - Shipping Delivered → Order Completed (nếu order đang ở ReadyToShip)
 */
async function autoAdvanceOrder(shipping: { orderId: string; status: string }): Promise<void> {
  if (!shipping.orderId) return;

  const order = await orderRepository.findById(shipping.orderId);
  if (!order || order.deletedAt) return;

  if (
    (shipping.status === 'Shipped' || shipping.status === 'InTransit') &&
    order.status === 'Packaging'
  ) {
    await orderRepository.updateStatus(shipping.orderId, 'ReadyToShip');
  } else if (shipping.status === 'Delivered' && order.status === 'ReadyToShip') {
    await orderRepository.updateStatus(shipping.orderId, 'Completed');
  }
}

export const shippingService = {
  async update(
    id: string,
    data: {
      status?: string;
      trackingNumber?: string;
      trackingUrl?: string;
      carrier?: string;
      driverName?: string;
      driverPhone?: string;
      eta?: Date;
      shippedAt?: Date;
      deliveredAt?: Date;
      cost?: number;
    },
  ) {
    const shipping = await shippingRepository.update(id, data);
    if (!shipping) return null;

    // Auto-advance order if shipping status changed
    if (data.status && shipping.orderId) {
      // Use the new status from data (which may differ from the returned shipping status if the update didn't change it)
      await autoAdvanceOrder({ orderId: shipping.orderId, status: data.status });
    }

    return shipping;
  },

  async findById(id: string) {
    return shippingRepository.findById(id);
  },

  async findByOrderId(orderId: string) {
    return shippingRepository.findByOrderId(orderId);
  },

  async list(params: { page: number; limit: number; status?: string; orderId?: string }) {
    return shippingRepository.list(params);
  },

  async create(data: {
    orderId: string;
    deliveryType: string;
    shippingMethod: string;
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    driverName?: string;
    driverPhone?: string;
    eta?: Date;
    cost?: number;
  }) {
    return shippingRepository.create(data);
  },

  async softDelete(id: string) {
    return shippingRepository.softDelete(id);
  },

  async getCounts() {
    return shippingRepository.getCounts();
  },

  /**
   * Handle failed shipping: soft-delete the failed record, rollback order to Packaging.
   */
  async handleFailed(shippingId: string) {
    const shipping = await shippingRepository.findById(shippingId);
    if (!shipping) return null;
    if (!shipping.orderId) return null;

    // Soft-delete the failed shipping record
    await shippingRepository.softDelete(shippingId);

    // Rollback order to Packaging (if it's past that)
    const order = await orderRepository.findById(shipping.orderId);
    if (order && !order.deletedAt) {
      const currentStatus = order.status;
      // If order is at ReadyToShip/Completed, rollback to Packaging
      if (currentStatus === 'ReadyToShip' || currentStatus === 'Completed') {
        // Update status AND clear forward date fields
        await prisma.order.update({
          where: { id: shipping.orderId },
          data: {
            status: 'Packaging',
            sentAt: null,
            completedAt: null,
          },
        });
      }
    }

    return { success: true };
  },
};
