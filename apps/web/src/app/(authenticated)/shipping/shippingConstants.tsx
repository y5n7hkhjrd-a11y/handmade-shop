'use client';

import FlaticonIcon from '@/components/FlaticonIcon';
import BrandIcon from '@/components/BrandIcon';

export interface SpxRecord {
  code: string;
  name: string;
  description?: string;
  timestamp?: string | null;
  location?: string | null;
}

export interface Shipping {
  id: string;
  orderId: string;
  deliveryType: string;
  shippingMethod: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  status: string;
  eta?: string | null;
  cost: number;
  createdAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  order?: any;
}

export type CarrierType = 'SPX' | 'Grab' | 'SOF' | '';

export const carrierConfig: Record<
  string,
  {
    label: string;
    icon: string;
    isBrand?: boolean;
    color: string;
    gradient: string;
    badge: string;
    accent: string;
    progress: string;
  }
> = {
  SPX: {
    label: 'SPX',
    icon: 'shopee',
    isBrand: true,
    color: 'text-orange-700',
    gradient: 'from-orange-500 to-orange-600',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    accent: 'border-l-orange-400',
    progress: 'bg-orange-400',
  },
  Grab: {
    label: 'Grab',
    icon: 'grab',
    isBrand: true,
    color: 'text-emerald-700',
    gradient: 'from-emerald-500 to-green-600',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accent: 'border-l-emerald-400',
    progress: 'bg-emerald-400',
  },
  SOF: {
    label: 'SOF',
    icon: 'truck-side',
    color: 'text-blue-600',
    gradient: 'from-blue-400 to-blue-500',
    badge: 'bg-blue-50 text-blue-600 border-blue-200',
    accent: 'border-l-blue-400',
    progress: 'bg-blue-400',
  },
};

export const statusLabels: Record<string, string> = {
  Pending: 'Chờ lấy hàng',
  Shipped: 'Đã nhận hàng',
  InTransit: 'Đang vận chuyển',
  Delivered: 'Đã giao hàng',
  Failed: 'Thất bại',
};

export const statusColors: Record<string, string> = {
  Pending: 'bg-amber-500',
  Shipped: 'bg-blue-500',
  InTransit: 'bg-purple-500',
  Delivered: 'bg-emerald-500',
  Failed: 'bg-red-500',
};

export const statusBgs: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Shipped: 'bg-blue-50 text-blue-700',
  InTransit: 'bg-purple-50 text-purple-700',
  Delivered: 'bg-emerald-50 text-emerald-700',
  Failed: 'bg-red-50 text-red-700',
};

export const statusIcons: Record<string, string> = {
  Pending: 'clock',
  Shipped: 'box-open',
  InTransit: 'truck-moving',
  Delivered: 'badge-check',
  Failed: 'circle-xmark',
};

export const carrierStatusLabels: Record<string, Record<string, string>> = {
  SPX: {
    Pending: 'Chờ lấy hàng',
    Shipped: 'Đã nhận hàng',
    InTransit: 'Đang vận chuyển',
    Delivered: 'Đã giao hàng',
    Failed: 'Thất bại',
  },
  Grab: {
    Pending: 'Đang tìm tài xế',
    Shipped: 'Đã lấy hàng',
    InTransit: 'Đang giao',
    Delivered: 'Đã giao',
    Failed: 'Thất bại',
  },
  SOF: {
    Pending: 'Chờ giao',
    Shipped: 'Đang giao',
    InTransit: 'Đang giao',
    Delivered: 'Đã giao',
    Failed: 'Thất bại',
  },
};

export const statusFlow = ['Pending', 'Shipped', 'InTransit', 'Delivered'];

export const nextActions: Record<string, { status: string; label: string; btn: string }> = {
  Pending: { status: 'Shipped', label: 'Lấy hàng', btn: 'btn-primary' },
  Shipped: { status: 'InTransit', label: 'Giao hàng', btn: 'btn-primary' },
  InTransit: { status: 'Delivered', label: 'Đã giao', btn: 'btn-success' },
};

const stepIcons = ['clock', 'box-open', 'truck-moving', 'badge-check'];
const stepColors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];
const stepShortLabels = ['Lấy', 'Nhận', 'Giao', 'Xong'];

export function getCarrier(s: Shipping): CarrierType {
  if (s.carrier === 'Grab') return 'Grab';
  if (s.carrier === 'SOF') return 'SOF';
  return 'SPX';
}

export function getStatusLabel(carrier: CarrierType, status: string): string {
  return (carrierStatusLabels[carrier] || carrierStatusLabels.SPX)[status] || status;
}

export function DotProgress({ status, isFailed }: { status: string; isFailed: boolean }) {
  const idx = statusFlow.indexOf(status);
  return (
    <div className="flex items-center gap-0">
      {statusFlow.map((step, i) => {
        const isDone = i < idx;
        const isCurrent = i === idx;
        return (
          <div key={step} className="flex items-start">
            <div className="flex flex-col items-center">
              <div
                className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all duration-500 ${
                  isFailed
                    ? 'bg-red-100 border border-red-300'
                    : isDone
                      ? 'text-white shadow-sm'
                      : isCurrent
                        ? 'text-white shadow-sm ring-2 ring-offset-1'
                        : 'bg-white border-2 border-gray-200'
                }`}
                style={{
                  background: !isFailed && (isDone || isCurrent) ? stepColors[i] : undefined,
                  boxShadow: isCurrent && !isFailed ? `0 0 0 2px ${stepColors[i]}33` : undefined,
                }}
              >
                {isFailed ? (
                  <FlaticonIcon name="circle-xmark" size="xs" className="text-red-400" />
                ) : isDone ? (
                  <FlaticonIcon name={stepIcons[i]} size="xs" className="text-white" />
                ) : isCurrent ? (
                  <FlaticonIcon name={stepIcons[i]} size="xs" className="text-white" />
                ) : (
                  <FlaticonIcon name={stepIcons[i]} size="xs" className="text-gray-300" />
                )}
              </div>
              <span
                className={`text-[8px] mt-0.5 font-medium ${
                  isFailed
                    ? 'text-red-400'
                    : isDone || isCurrent
                      ? 'text-gray-600'
                      : 'text-gray-300'
                }`}
              >
                {stepShortLabels[i]}
              </span>
            </div>
            {i < statusFlow.length - 1 && (
              <div
                className={`w-3 h-[2px] mt-[11px] mx-0.5 rounded-full transition-all duration-500 ${
                  isFailed ? 'bg-red-200' : isDone ? 'bg-gray-400' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CarrierLogo({
  carrier,
  size = 'sm',
}: {
  carrier: string;
  size?: 'xs' | 'sm' | 'md';
}) {
  const cfg = carrierConfig[carrier];
  if (!cfg) return <FlaticonIcon name="box-open" size={size} />;
  const brandSize = { xs: 12, sm: 14, md: 32 }[size] || 14;
  if (cfg.isBrand) return <BrandIcon brand={cfg.icon as 'grab' | 'shopee'} size={brandSize} />;
  return <FlaticonIcon name={cfg.icon} size={size} />;
}
