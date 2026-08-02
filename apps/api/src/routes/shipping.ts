import { Router, type Request, type Response, type NextFunction } from 'express';
import { shippingService } from '../services/shippingService.js';
import { validate } from '../middleware/validate.js';
import {
  createShippingSchema,
  updateShippingSchema,
  listShippingQuerySchema,
} from '@handmade-shop/shared';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Minimal shape of the fetch() response we rely on. The global `Response` type
 * resolves to an empty interface in some build environments (e.g. Vercel's
 * Express builder), so we don't depend on it here.
 */
type TrackingApiResponse = { ok: boolean; json(): Promise<unknown> };

export const shippingRouter: Router = Router();

shippingRouter.get('/counts', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const counts = await shippingService.getCounts();
    res.json({ success: true, data: counts });
  } catch (error) {
    next(error);
  }
});

shippingRouter.get(
  '/',
  validate(listShippingQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, status, orderId } = req.query as any;
      const result = await shippingService.list({ page, limit, status, orderId });
      res.json({
        success: true,
        data: result.data,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

shippingRouter.get('/order/:orderId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shipments = await shippingService.findByOrderId(req.params.orderId!);
    res.json({ success: true, data: shipments });
  } catch (error) {
    next(error);
  }
});

shippingRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shipping = await shippingService.findById(req.params.id!);
    if (!shipping) throw new AppError('Shipping record not found', 404);
    res.json({ success: true, data: shipping });
  } catch (error) {
    next(error);
  }
});

shippingRouter.post(
  '/',
  validate(createShippingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const shipping = await shippingService.create({
        ...req.body,
        eta: req.body.eta ? new Date(req.body.eta) : undefined,
      });
      res.status(201).json({ success: true, data: shipping });
    } catch (error) {
      next(error);
    }
  },
);

shippingRouter.put(
  '/:id',
  validate(updateShippingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: any = { ...req.body };
      if (data.eta) data.eta = new Date(data.eta);
      if (data.shippedAt) data.shippedAt = new Date(data.shippedAt);
      if (data.deliveredAt) data.deliveredAt = new Date(data.deliveredAt);
      const shipping = await shippingService.update(req.params.id!, data);
      if (!shipping) throw new AppError('Shipping record not found', 404);
      res.json({ success: true, data: shipping });
    } catch (error) {
      next(error);
    }
  },
);

shippingRouter.post('/track-grab', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { trackingUrl } = req.body;
    if (!trackingUrl) {
      throw new AppError('Tracking URL is required', 400);
    }

    // Extract order GUID from URL: https://express.grab.com/track/{guid}
    const urlPath = new URL(trackingUrl).pathname.replace(/\/$/, '');
    const orderGUID = urlPath.split('/').pop() || '';
    if (!orderGUID) {
      throw new AppError('Invalid Grab tracking URL', 400);
    }

    // Call Grab's internal tracking API (found via browser network inspection)
    const apiUrl = `https://p.grabtaxi.com/express/web/v1/tracking?withStaticTracking=true&orderGUIDs=${encodeURIComponent(orderGUID)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = (await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    })) as unknown as TrackingApiResponse;
    clearTimeout(timeout);

    if (!response.ok) {
      throw new AppError('Không thể tra cứu đơn Grab', 502);
    }

    const result = (await response.json()) as any;
    const details = result?.webTrackingDetails?.[0];
    if (!details) {
      throw new AppError('Không tìm thấy thông tin đơn Grab', 404);
    }

    const { staticTracking, dynamicTracking } = details;

    // ── Map Grab orderStatus to our status ──
    const orderStatus: string = dynamicTracking?.orderStatus || 'PENDING';
    const statusMap: Record<string, string> = {
      // Pending
      BOOKED: 'Pending',
      ALLOCATING: 'Pending',
      LOOKING_FOR_DRIVER: 'Pending',
      ORDER_PLACED: 'Pending',
      PENDING: 'Pending',
      // Shipped (picked up)
      // Pre-pickup stages (driver assigned, en route, arrived) map to Pending
      DRIVER_ASSIGNED: 'Pending',
      DRIVER_EN_ROUTE_TO_PICKUP: 'Pending',
      DRIVER_ARRIVED_AT_PICKUP: 'Pending',
      PICKED_UP: 'Shipped',
      DRIVER_ALLOCATED: 'Shipped',
      DRIVER_ARRIVED: 'Shipped',
      // In Transit
      DELIVERING: 'InTransit',
      DRIVER_ARRIVED_AT_DROPOFF: 'InTransit',
      IN_TRANSIT: 'InTransit',
      // Delivered
      DELIVERED: 'Delivered',
      COMPLETED: 'Delivered',
      // Failed
      FAILED: 'Failed',
      CANCELLED: 'Failed',
      SENDER_CANCELLED: 'Failed',
      EXPIRED: 'Failed',
      RETURNING: 'Failed',
      RETURNED: 'Failed',
    };
    const status = statusMap[orderStatus] || 'Pending';

    // ── Status text (human-readable) ──
    const statusTextMap: Record<string, string> = {
      BOOKED: 'Đơn đã được tạo',
      ALLOCATING: 'Đang tìm tài xế',
      LOOKING_FOR_DRIVER: 'Đang tìm tài xế',
      ORDER_PLACED: 'Đã đặt đơn',
      PENDING: 'Chờ xử lý',
      DRIVER_ASSIGNED: 'Đã có tài xế nhận đơn',
      DRIVER_EN_ROUTE_TO_PICKUP: 'Tài xế đang đến điểm lấy hàng',
      DRIVER_ARRIVED_AT_PICKUP: 'Tài xế đã đến điểm lấy',
      PICKED_UP: 'Đã lấy hàng',
      DRIVER_ALLOCATED: 'Đã có tài xế',
      DRIVER_ARRIVED: 'Tài xế đã đến',
      DELIVERING: 'Đang giao hàng',
      DRIVER_ARRIVED_AT_DROPOFF: 'Tài xế đã đến điểm giao',
      IN_TRANSIT: 'Đang giao hàng',
      DELIVERED: 'Giao thành công',
      COMPLETED: 'Giao hàng thành công',
      FAILED: 'Giao thất bại',
      CANCELLED: 'Đơn bị hủy',
      SENDER_CANCELLED: 'Đã huỷ đơn giao hàng',
      EXPIRED: 'Đơn hết hạn',
      RETURNING: 'Đang hoàn hàng',
      RETURNED: 'Đã hoàn hàng',
    };
    const statusText = statusTextMap[orderStatus] || orderStatus;

    // ── Timestamp ──
    const unixTs = dynamicTracking?.timeStamp;
    let timestamp: string | null = null;
    if (unixTs) {
      const date = new Date(unixTs * 1000);
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const day = date.getDate();
      const month = months[date.getMonth()]!;
      const year = date.getFullYear();

      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
      const h12 = (date.getHours() % 12 || 12).toString().padStart(2, '0');
      timestamp = `${day} ${month} ${year}, ${h12}:${minutes} ${ampm}`;
    }

    // ── Schedule window ──
    let scheduleFrom: string | null = null;
    let scheduleTo: string | null = null;
    if (staticTracking?.schedule?.from) {
      const d = new Date(staticTracking.schedule.from * 1000);
      scheduleFrom = d.toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    if (staticTracking?.schedule?.to) {
      const d = new Date(staticTracking.schedule.to * 1000);
      scheduleTo = d.toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }

    // ── Addresses ──
    const origin = staticTracking?.delivery?.origin;
    const destination = staticTracking?.delivery?.destination;
    const pickupName = origin?.name || '';
    const pickupAddr = origin?.address || '';
    const deliveryName = destination?.name || '';
    const deliveryAddr = destination?.address || '';

    // Combine name + address for display
    const pickupAddress =
      pickupName && pickupAddr !== pickupName
        ? `${pickupName}, ${pickupAddr}`
        : pickupAddr || pickupName || null;
    const deliveryAddress =
      deliveryName && deliveryAddr !== deliveryName
        ? `${deliveryName}, ${deliveryAddr}`
        : deliveryAddr || deliveryName || null;

    res.json({
      success: true,
      data: {
        status,
        statusText,
        orderStatus,
        timestamp,
        scheduleFrom,
        scheduleTo,
        pickupAddress,
        deliveryAddress,
        serviceType: staticTracking?.serviceType || null,
        orderID: staticTracking?.orderID || null,
        orderBookingCode: staticTracking?.orderBookingCode || null,
        reachable: true,
      },
    });
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new AppError('Không thể tra cứu link tracking Grab', 502));
  }
});

shippingRouter.post('/track-spx', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { trackingNumber } = req.body;
    if (!trackingNumber) {
      throw new AppError('Tracking number is required', 400);
    }

    const spxUrl = `https://spx.vn/shipment/order/open/order/get_order_info?spx_tn=${encodeURIComponent(trackingNumber)}&language_code=vi`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = (await fetch(spxUrl, {
      signal: controller.signal,
    })) as unknown as TrackingApiResponse;
    clearTimeout(timeout);
    if (!response.ok) {
      throw new AppError('Không thể tra cứu mã vận đơn SPX', 502);
    }

    const result = (await response.json()) as any;
    if (result.retcode !== 0 || !result.data) {
      throw new AppError('Mã vận đơn không hợp lệ hoặc không tìm thấy', 404);
    }

    const { order_info, sls_tracking_info } = result.data;

    // Map SPX status to our shipping status
    const statusMap: Record<string, string> = {
      Delivered: 'Delivered',
      'Out For Delivery': 'InTransit',
      'In Transit': 'InTransit',
      'Picking Up': 'Shipped',
      Pending: 'Pending',
      Failed: 'Failed',
      Cancelled: 'Failed',
    };
    const spxStatus = order_info?.tracking_code_group_name || 'Pending';
    const status = statusMap[spxStatus] || 'Pending';

    // Extract tracking records
    const records = (sls_tracking_info?.records || []) as any[];

    res.json({
      success: true,
      data: {
        status,
        spxStatus,
        trackingNumber: order_info?.spx_tn || trackingNumber,
        slsTn: order_info?.sls_tn,
        orderId: order_info?.order_id,
        receiverName: sls_tracking_info?.receiver_name,
        records: records.map((r) => ({
          code: r.tracking_code,
          name: r.tracking_name,
          description: r.description,
          buyerDescription: r.buyer_description,
          sellerDescription: r.seller_description,
          timestamp: r.actual_time ? new Date(r.actual_time * 1000).toISOString() : null,
          location: r.current_location?.full_address || null,
          milestone: r.milestone_name,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

shippingRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await shippingService.softDelete(req.params.id!);
    res.json({ success: true, message: 'Shipping record deleted' });
  } catch (error) {
    next(error);
  }
});

shippingRouter.post('/:id/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await shippingService.handleFailed(req.params.id!);
    if (!result) throw new AppError('Shipping record not found', 404);
    res.json({ success: true, message: 'Đã xóa đơn giao cũ, sẵn sàng tạo lại', data: result });
  } catch (error) {
    next(error);
  }
});
