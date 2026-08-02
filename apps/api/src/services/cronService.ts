import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { shippingService } from './shippingService.js';
import { ShippingStatus } from '@prisma/client';

/**
 * Minimal shape of the fetch() response we rely on. The global `Response` type
 * resolves to an empty interface in some build environments (e.g. Vercel's
 * Express builder), so we don't depend on it here.
 */
type TrackingApiResponse = { ok: boolean; json(): Promise<unknown> };

const ACTIVE_STATUSES: ShippingStatus[] = ['Pending', 'Shipped', 'InTransit'];
const CRON_SCHEDULE = '*/5 * * * *'; // Every 5 minutes

/**
 * Auto-fetch tracking for all active shipments (SPX + Grab).
 * Runs as a background cron job every 5 minutes.
 */
async function processActiveShipments(): Promise<void> {
  try {
    // Fetch all active (non-deleted, non-completed) shipments with tracking info
    const shipments = await prisma.shipping.findMany({
      where: {
        deletedAt: null,
        status: { in: ACTIVE_STATUSES },
        OR: [
          { carrier: 'SPX', trackingNumber: { not: null } },
          { carrier: 'Grab', trackingUrl: { not: null } },
        ],
      },
    });

    if (shipments.length === 0) return;
    console.log(`[Cron] Auto-tracking: ${shipments.length} active shipments found`);

    let updatedCount = 0;

    for (const shipment of shipments) {
      try {
        let fetchedStatus: string | null = null;

        if (shipment.carrier === 'SPX' && shipment.trackingNumber) {
          const spxUrl = `https://spx.vn/shipment/order/open/order/get_order_info?spx_tn=${encodeURIComponent(shipment.trackingNumber)}&language_code=vi`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const response = (await fetch(spxUrl, {
            signal: controller.signal,
          })) as unknown as TrackingApiResponse;
          clearTimeout(timeout);

          if (response.ok) {
            const result = (await response.json()) as any;
            if (result.retcode === 0 && result.data) {
              const spxStatus = result.data.order_info?.tracking_code_group_name || 'Pending';
              const statusMap: Record<string, string> = {
                Delivered: 'Delivered',
                'Out For Delivery': 'InTransit',
                'In Transit': 'InTransit',
                'Picking Up': 'Shipped',
                Pending: 'Pending',
                Failed: 'Failed',
                Cancelled: 'Failed',
              };
              fetchedStatus = statusMap[spxStatus] || 'Pending';
            }
          }
        } else if (shipment.carrier === 'Grab' && shipment.trackingUrl) {
          const urlPath = new URL(shipment.trackingUrl).pathname.replace(/\/$/, '');
          const orderGUID = urlPath.split('/').pop() || '';
          if (orderGUID) {
            const apiUrl = `https://p.grabtaxi.com/express/web/v1/tracking?withStaticTracking=true&orderGUIDs=${encodeURIComponent(orderGUID)}`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const response = (await fetch(apiUrl, {
              signal: controller.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                Accept: 'application/json',
              },
            })) as unknown as TrackingApiResponse;
            clearTimeout(timeout);

            if (response.ok) {
              const result = (await response.json()) as any;
              const details = result?.webTrackingDetails?.[0];
              if (details?.dynamicTracking?.orderStatus) {
                const orderStatus = details.dynamicTracking.orderStatus;
                const statusMap: Record<string, string> = {
                  BOOKED: 'Pending',
                  ALLOCATING: 'Pending',
                  LOOKING_FOR_DRIVER: 'Pending',
                  ORDER_PLACED: 'Pending',
                  PENDING: 'Pending',
                  DRIVER_ASSIGNED: 'Pending',
                  DRIVER_EN_ROUTE_TO_PICKUP: 'Pending',
                  DRIVER_ARRIVED_AT_PICKUP: 'Pending',
                  PICKED_UP: 'Shipped',
                  DRIVER_ALLOCATED: 'Shipped',
                  DRIVER_ARRIVED: 'Shipped',
                  DELIVERING: 'InTransit',
                  DRIVER_ARRIVED_AT_DROPOFF: 'InTransit',
                  IN_TRANSIT: 'InTransit',
                  DELIVERED: 'Delivered',
                  COMPLETED: 'Delivered',
                  FAILED: 'Failed',
                  CANCELLED: 'Failed',
                  SENDER_CANCELLED: 'Failed',
                  EXPIRED: 'Failed',
                  RETURNING: 'Failed',
                  RETURNED: 'Failed',
                };
                fetchedStatus = statusMap[orderStatus] || 'Pending';
              }
            }
          }
        }

        // If status changed, update it (shippingService.update auto-advances order)
        if (fetchedStatus && fetchedStatus !== shipment.status) {
          const updateBody: any = { status: fetchedStatus };
          if (fetchedStatus === 'Delivered') {
            updateBody.deliveredAt = new Date();
          } else if (fetchedStatus === 'Shipped') {
            updateBody.shippedAt = new Date();
          }
          await shippingService.update(shipment.id, updateBody);
          updatedCount++;
          console.log(
            `[Cron] Updated shipment ${shipment.id} (${shipment.orderId}): ${shipment.status} → ${fetchedStatus}`,
          );
        }
      } catch {
        // Silently skip individual failures — don't let one bad shipment block the rest
      }
    }

    if (updatedCount > 0) {
      console.log(`[Cron] Auto-tracking: ${updatedCount}/${shipments.length} shipments updated`);
    }
  } catch (err) {
    console.error('[Cron] Auto-tracking error:', err);
  }
}

/**
 * Start the background cron job for auto-tracking shipments.
 * Call this once during server startup.
 */
export function startTrackingCron(): void {
  cron.schedule(CRON_SCHEDULE, () => {
    processActiveShipments();
  });
  console.log(`[Cron] Auto-tracking started (schedule: ${CRON_SCHEDULE})`);
}
