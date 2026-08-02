'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@handmade-shop/shared';
import FlaticonIcon from '@/components/FlaticonIcon';
import ConfirmModal from '@/components/ConfirmModal';
import { useEscapeClose } from '@/hooks/useEscapeClose';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { copyToClipboard } from '@/lib/clipboard';
import { NumberInput } from '@/components/NumberInput';
import BrandIcon from '@/components/BrandIcon';
import {
  statusFlow,
  statusPillClasses,
  statusDotColors,
  statusIcons,
  statusLabels,
  PREV_STATUS,
  NEXT_STATUS,
  SOCIAL_PLATFORMS,
} from './orderConstants';
import { DotProgress } from '../shipping/shippingConstants';

const carrierConfig: Record<
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
    color: 'text-mint-600',
    gradient: 'from-mint-400 to-mint-500',
    badge: 'bg-mint-50 text-mint-600 border-mint-200',
    accent: 'border-l-blue-400',
    progress: 'bg-mint-400',
  },
};

const TIMELINE_DOT_COLORS = [
  'bg-gray-400',
  'bg-amber-300',
  'bg-mint-300',
  'bg-pink-300',
  'bg-avocado-300',
  'bg-green-300',
];
const TIMELINE_LINE_COLORS = [
  'bg-gray-400',
  'bg-amber-300',
  'bg-mint-300',
  'bg-pink-300',
  'bg-avocado-300',
  'bg-green-300',
];
const TIMELINE_RING_COLORS = [
  'ring-gray-300',
  'ring-amber-200',
  'ring-mint-200',
  'ring-pink-200',
  'ring-avocado-200',
  'ring-green-200',
];

function OrderTimeline({ currentStatus }: { currentStatus: string }) {
  const idx = statusFlow.indexOf(currentStatus);
  const prevRef = useRef(currentStatus);
  const [animDot, setAnimDot] = useState<number | null>(null);
  const [animLine, setAnimLine] = useState<number | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = currentStatus;
    if (prev === currentStatus) return;
    const prevIdx = statusFlow.indexOf(prev);
    if (prevIdx < 0) return;
    // Animate the step that just became current
    const newIdx = statusFlow.indexOf(currentStatus);
    if (newIdx >= 0) {
      setAnimDot(newIdx);
      setAnimLine(newIdx);
      const t = setTimeout(() => {
        setAnimDot(null);
        setAnimLine(null);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [currentStatus]);

  return (
    <div className="flex items-center gap-0 py-4 px-2">
      {statusFlow.map((s, i) => (
        <div
          key={s}
          className="flex items-center flex-1 last:flex-none"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex flex-col items-center animate-[slideUp_0.3s_ease-out_both]">
            <div
              className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 ring-1 ${
                i <= idx
                  ? `${TIMELINE_DOT_COLORS[i]} text-white shadow-sm ${TIMELINE_RING_COLORS[i]}`
                  : 'bg-white border-2 border-gray-200 text-gray-300'
              } ${i === idx ? 'animate-[pulseGlow_2s_ease-in-out_infinite]' : ''} ${animDot === i ? 'animate-[popIn_0.5s_ease-out]' : ''}`}
            >
              {i < idx ? (
                <svg
                  className="w-4 h-4 animate-[checkPop_0.3s_ease-out]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <FlaticonIcon
                  name={statusIcons[s]}
                  size="xs"
                  className={i <= idx ? 'text-white' : 'text-gray-300'}
                />
              )}
            </div>
            <span
              className={`text-[10px] mt-1.5 whitespace-nowrap font-medium transition-all duration-300 ${
                i <= idx ? 'text-gray-700' : 'text-gray-400'
              }`}
            >
              {statusLabels[s] || s.replace(/([A-Z])/g, ' $1').trim()}
            </span>
          </div>
          {i < statusFlow.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-1 mb-5 transition-all duration-700 ${
                i < idx
                  ? TIMELINE_LINE_COLORS[i]
                  : i === idx
                    ? `bg-gradient-to-r ${TIMELINE_LINE_COLORS[i]} to-gray-200 bg-no-repeat ${animLine === i ? 'animate-[lineFill_0.8s_ease-out]' : ''}`
                    : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function OrderDetail({
  order,
  onClose,
  onStatusChange,
  token,
  showToast,
}: {
  order: any;
  onClose: () => void;
  onStatusChange: (openEditAfterDraft?: boolean) => void;
  token: string | null;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}) {
  const [showConfirmAdvance, setShowConfirmAdvance] = useState(false);
  const [advanceLabel, setAdvanceLabel] = useState('');
  const [showConfirmReturn, setShowConfirmReturn] = useState(false);
  const [returnLabel, setReturnLabel] = useState('');
  const [showConfirmPaid, setShowConfirmPaid] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [localShippingCost, setLocalShippingCost] = useState(Number(order.shippingCost || 0));
  const [localShippingPaidBy, setLocalShippingPaidBy] = useState(order.shippingPaidBy || 'prepaid');
  const [savingShipping, setSavingShipping] = useState(false);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);
  // Shipping delivery creation
  const [showShipForm, setShowShipForm] = useState(false);
  const [shipCarrier, setShipCarrier] = useState<'SPX' | 'Grab' | 'SOF'>('SPX');
  const [shipForm, setShipForm] = useState({
    trackingNumber: '',
    trackingUrl: '',
    eta: '',
    sofType: 'pickup' as 'pickup' | 'delivery',
    cost: 0,
  });
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [spxValid, setSpxValid] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [orderShipments, setOrderShipments] = useState<any[]>([]);
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);
  const originalShipForm = useRef<typeof shipForm | null>(null);
  const [showCancelEditConfirm, setShowCancelEditConfirm] = useState(false);
  const [showRetryConfirm, setShowRetryConfirm] = useState(false);
  const [retryShipmentId, setRetryShipmentId] = useState<string | null>(null);

  // Escape closes only the top-most modal (nested confirms/customer first, then the detail)
  const hasNestedModal =
    showConfirmAdvance ||
    showConfirmReturn ||
    showConfirmPaid ||
    showCancelEditConfirm ||
    showRetryConfirm ||
    showCustomerDetail;
  useEscapeClose(onClose, !hasNestedModal);
  useEscapeClose(() => setShowCustomerDetail(false), showCustomerDetail);
  useBodyScrollLock(true);
  const [retryingShipment, setRetryingShipment] = useState(false);

  const handleRetryShipment = async () => {
    if (!token || !retryShipmentId) return;
    setRetryingShipment(true);
    try {
      await apiClient(`/shipping/${retryShipmentId}/retry`, { method: 'POST', token });
      if (showToast) showToast('Đã xóa đơn giao cũ, sẵn sàng tạo đơn mới', 'success');
      order.status = 'Packaging'; // Optimistic local update
      setOrderShipments([]); // Clear immediately so form condition passes
      setShowShipForm(true);
      setEditingShipmentId(null);
      setShipForm({ trackingNumber: '', trackingUrl: '', eta: '', sofType: 'pickup', cost: 0 });
      loadOrderShipments();
      onStatusChange();
    } catch (e: any) {
      if (showToast) showToast(e.message || 'Xóa đơn giao thất bại', 'error');
    } finally {
      setRetryingShipment(false);
      setShowRetryConfirm(false);
      setRetryShipmentId(null);
    }
  };

  // SPX tracking number validation
  useEffect(() => {
    if (!token || !shipForm.trackingNumber || shipForm.trackingNumber.length < 10) {
      setSpxValid('idle');
      return;
    }
    if (shipCarrier !== 'SPX') {
      setSpxValid('idle');
      return;
    }
    setSpxValid('loading');
    const timer = setTimeout(async () => {
      try {
        await apiClient<any>('/shipping/track-spx', {
          method: 'POST',
          body: { trackingNumber: shipForm.trackingNumber },
          token,
        });
        setSpxValid('valid');
      } catch {
        setSpxValid('invalid');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [shipForm.trackingNumber, token, shipCarrier]);

  // Fetch shipments for this order
  const loadOrderShipments = useCallback(async () => {
    if (!token || !order.id) return;
    try {
      const res = await apiClient<any>(`/shipping/order/${order.id}`, { token });
      setOrderShipments(res.data || []);
    } catch {
      setOrderShipments([]);
    }
  }, [token, order.id]);

  useEffect(() => {
    loadOrderShipments();
  }, [loadOrderShipments]);

  // Auto-fetch SPX/Grab tracking when shipments are loaded
  useEffect(() => {
    if (!token || orderShipments.length === 0) return;
    const s = orderShipments[0];
    // Skip auto-track for already completed or failed shipments
    if (s.status === 'Delivered' || s.status === 'Failed') return;
    const carrier = s.carrier || 'SPX';

    const doTrack = async () => {
      try {
        if (carrier === 'SPX' && s.trackingNumber) {
          const res = await apiClient<any>('/shipping/track-spx', {
            method: 'POST',
            body: { trackingNumber: s.trackingNumber },
            token,
          });
          if (res.data.status && res.data.status !== s.status) {
            await apiClient(`/shipping/${s.id}`, {
              method: 'PUT',
              body: { status: res.data.status },
              token,
            });
            loadOrderShipments();
            onStatusChange();
          }
        } else if (carrier === 'Grab' && s.trackingUrl) {
          const res = await apiClient<any>('/shipping/track-grab', {
            method: 'POST',
            body: { trackingUrl: s.trackingUrl },
            token,
          });
          if (res.data.status && res.data.status !== s.status) {
            await apiClient(`/shipping/${s.id}`, {
              method: 'PUT',
              body: { status: res.data.status },
              token,
            });
            loadOrderShipments();
            onStatusChange();
          }
        }
      } catch {
        // Silently fail — tracking unavailable is not critical
      }
    };

    doTrack();
    // Only run when shipments first load, not on re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderShipments.length > 0 && orderShipments[0]?.id]);

  const doMarkPaid = async () => {
    if (!token) return;
    setMarkingPaid(true);
    try {
      const total = salePriceTotal;
      await apiClient(`/orders/${order.id}/payment`, {
        method: 'PATCH',
        body: { paidAmount: total },
        token,
      });
      order.paidAmount = total;
      onStatusChange();
      if (showToast) showToast(`Đã xác nhận thanh toán ${formatCurrency(total)}`, 'success');
    } catch (e: any) {
      if (showToast) showToast(e.message || 'Cập nhật thất bại', 'error');
    } finally {
      setMarkingPaid(false);
    }
  };
  const handleAdvance = async () => {
    if (!token || !NEXT_STATUS[order.status]) return;

    // At InProgress step, check payment before advancing to Packaging
    if (order.status === 'InProgress') {
      const paid = Number(order.paidAmount) || 0;
      const remaining = salePriceTotal - paid;
      if (remaining > 0) {
        if (showToast)
          showToast(
            'Vui lòng xác nhận khách hàng đã thanh toán trước khi chuyển sang Đơn đã gói',
            'error',
          );
        return;
      }
    }

    const nextLabel =
      statusLabels[NEXT_STATUS[order.status]] ||
      NEXT_STATUS[order.status].replace(/([A-Z])/g, ' $1').trim();
    setAdvanceLabel(nextLabel);
    setShowConfirmAdvance(true);
  };
  const doAdvance = async () => {
    if (!token || !NEXT_STATUS[order.status]) return;
    setSavingShipping(true);
    try {
      // If at Packaging step, save shipping info before advancing
      if (order.status === 'Packaging') {
        await apiClient(`/orders/${order.id}/status`, {
          method: 'PATCH',
          body: { status: NEXT_STATUS[order.status], shippingCost, shippingPaidBy },
          token,
        });
      } else {
        await apiClient(`/orders/${order.id}/status`, {
          method: 'PATCH',
          body: { status: NEXT_STATUS[order.status] },
          token,
        });
      }
      onStatusChange();
    } catch (e: any) {
      if (showToast) showToast(e.message || 'Chuyển trạng thái thất bại', 'error');
    } finally {
      setSavingShipping(false);
    }
  };
  const handleReturn = async () => {
    if (!token || !PREV_STATUS[order.status]) return;
    const prevLabel =
      statusLabels[PREV_STATUS[order.status]] ||
      PREV_STATUS[order.status].replace(/([A-Z])/g, ' $1').trim();
    setReturnLabel(prevLabel);
    setShowConfirmReturn(true);
  };
  const doReturn = async () => {
    if (!token || !PREV_STATUS[order.status]) return;
    try {
      await apiClient(`/orders/${order.id}/status`, {
        method: 'PATCH',
        body: { status: PREV_STATUS[order.status] },
        token,
      });
      const targetIsDraft = PREV_STATUS[order.status] === 'Draft';
      onStatusChange(targetIsDraft);
      if (showToast) showToast('Đã quay lại', 'success');
    } catch (e: any) {
      if (showToast) showToast(e.message || 'Quay lại thất bại', 'error');
    }
  };
  const itemTotal =
    order.items?.reduce((sum: number, i: any) => sum + Number(i.totalPrice), 0) || 0;
  const packagingTotal =
    order.items?.reduce((sum: number, i: any) => sum + Number(i.packagingCost || 0), 0) || 0;
  const shippingCost = localShippingCost || Number(order.shippingCost || 0);
  const shippingPaidBy = localShippingPaidBy;
  const shopPaysShipping = shippingPaidBy === 'shop';
  // Shipping cost is for management tracking only, not included in sale price
  const computedTotalCost =
    itemTotal + Number(order.packagingCost || 0) + (shopPaysShipping ? shippingCost : 0);
  const salePriceTotal =
    Number(order.subtotal || 0) - Number(order.discount || 0) + Number(order.packagingCost || 0);
  const profit = Number(order.subtotal || 0) - Number(order.discount || 0) - computedTotalCost;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Accent bar for Đơn chờ làm */}
        {order.status === 'WaitingConfirm' && (
          <div className="h-1 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 rounded-t-xl" />
        )}
        <div className="p-6 border-b flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              {statusIcons[order.status] ? (
                <FlaticonIcon name={statusIcons[order.status]} size="sm" className="inline-flex" />
              ) : null}{' '}
              Chi tiết đơn hàng
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500 font-mono">
                {order.id.length > 14 ? order.id.slice(0, 8) + '...' : order.id}
              </span>
              <button
                onClick={() => {
                  copyToClipboard(order.id);
                }}
                className="copy-btn"
                title="Sao chép mã đơn hàng"
              >
                <FlaticonIcon name="clipboard" size="sm" />{' '}
                <span className="copy-icon">Sao chép</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {PREV_STATUS[order.status] && (
              <button
                onClick={handleReturn}
                className="btn-xs btn-ghost border border-gray-200 group"
                title={`Quay lại ${statusLabels[PREV_STATUS[order.status]] || PREV_STATUS[order.status].replace(/([A-Z])/g, ' $1').trim()}`}
              >
                <span className="group-hover:-translate-x-0.5 transition-transform inline-block">
                  ←
                </span>
                <span className="hidden sm:inline ml-1 text-xs">
                  {statusLabels[PREV_STATUS[order.status]] ||
                    PREV_STATUS[order.status].replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </button>
            )}
            {/* Only show manual advance for Draft→WaitingConfirm→InProgress→Packaging (auto handles →ReadyToShip→Completed) */}
            {NEXT_STATUS[order.status] && !['Packaging', 'ReadyToShip'].includes(order.status) && (
              <button onClick={handleAdvance} className="btn-primary group text-sm">
                <span className="hidden sm:inline">
                  {statusLabels[NEXT_STATUS[order.status]] ||
                    NEXT_STATUS[order.status].replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="ml-1 group-hover:translate-x-0.5 transition-transform">→</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="btn-ghost btn-icon hover:bg-gray-100 rounded-full"
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          <OrderTimeline currentStatus={order.status} />

          {/* Customer & Status row */}
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 animate-[slideUp_0.3s_ease-out]"
            style={{ animationDelay: '100ms' }}
          >
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500">Khách hàng</span>
              <div className="mt-0.5">
                <button
                  onClick={() => setShowCustomerDetail(true)}
                  className="font-medium text-gray-900 hover:text-avocado-600 transition-colors text-left cursor-pointer"
                >
                  {order.customer?.name || 'N/A'}
                </button>
                {order.customer &&
                  (order.customer.facebook ||
                    order.customer.instagram ||
                    order.customer.tiktok ||
                    order.customer.threads ||
                    order.customer.phone) && (
                    <div className="flex items-center gap-1 mt-1">
                      {(() => {
                        return SOCIAL_PLATFORMS.map((sl) => {
                          let val = order.customer?.[sl.key];
                          if (sl.phoneBased) {
                            val = order.customer?.phone || null;
                            if (!val) return null;
                          } else if (!val) {
                            return null;
                          }
                          const href = val.startsWith('http')
                            ? val
                            : `${sl.domain}${val.replace(/^@/, '')}`;
                          const finalHref = sl.phoneBased
                            ? `https://zalo.me/${val.replace(/[^0-9]/g, '')}`
                            : href;
                          return (
                            <a
                              key={sl.key}
                              href={finalHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 flex items-center justify-center rounded bg-white border border-gray-200 shadow-sm hover:shadow-md hover:scale-110 transition-all duration-200 hover:border-gray-400"
                              title={`Mở ${sl.label}`}
                            >
                              {sl.icon}
                            </a>
                          );
                        });
                      })()}
                    </div>
                  )}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500">Trạng thái</span>
              <p className="mt-0.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusPillClasses[order.status] || 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${statusDotColors[order.status] || 'bg-gray-400'}`}
                  />
                  {statusLabels[order.status] || order.status}
                </span>
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500">
                <FlaticonIcon name="time-watch-calendar" size="xs" className="inline-flex mr-1" />{' '}
                Ngày đặt
              </span>
              <p className="font-medium text-gray-900 mt-0.5 text-sm">
                {formatDateTime(order.orderDate)}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500">
                <FlaticonIcon name="usd-circle" size="xs" className="inline-flex mr-1" /> Tổng cộng
              </span>
              <p className="font-bold text-lg text-avocado-600 mt-0.5">
                {formatCurrency(salePriceTotal)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                (đã gồm {formatCurrency(Number(order.packagingCost || 0))} phí đóng gói)
              </p>
            </div>
          </div>

          {/* Deadline alert */}
          {order.deadline &&
            (() => {
              const deadlineDate = new Date(order.deadline);
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              deadlineDate.setHours(23, 59, 59, 999);
              const diffDays = Math.ceil(
                (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
              );
              const isOverdue = diffDays <= 0;
              const isSoon = diffDays > 0 && diffDays <= 3;
              const isCompleted = order.status === 'Completed' || order.status === 'ReadyToShip';
              return (
                <div
                  className={`mt-4 p-3 rounded-xl border flex items-center justify-between ${
                    isCompleted
                      ? 'bg-gray-50 border-gray-200 text-gray-500'
                      : isOverdue
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : isSoon
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {isCompleted ? (
                        <FlaticonIcon name="badge-check" size="sm" />
                      ) : isOverdue ? (
                        <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                      ) : isSoon ? (
                        <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                      ) : (
                        <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        {isCompleted ? 'Đã hoàn thành' : isOverdue ? 'Quá hạn!' : 'Hạn chót'}
                      </p>
                      <p className={`text-xs ${isCompleted ? 'text-gray-400' : ''}`}>
                        <span className="font-medium">{formatDate(order.deadline)}</span>
                        {!isCompleted && (
                          <span className="ml-1">
                            {isOverdue
                              ? `(quá ${Math.abs(diffDays)} ngày)`
                              : `(còn ${diffDays} ngày)`}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* Timeline dates row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div
              className={`p-3 rounded-xl border ${
                order.confirmedAt ? 'bg-mint-50 border-mint-200' : 'bg-gray-50 border-gray-100'
              }`}
            >
              <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1">
                {' '}
                <FlaticonIcon name="tools" size="xs" className="inline-flex" /> Ngày xác nhận
              </span>
              <p
                className={`text-xs font-semibold mt-1 ${order.confirmedAt ? 'text-mint-700' : 'text-gray-400'}`}
              >
                {order.confirmedAt ? formatDateTime(order.confirmedAt) : '—'}
              </p>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                order.packagedAt ? 'bg-pink-50 border-pink-200' : 'bg-gray-50 border-gray-100'
              }`}
            >
              <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1">
                <FlaticonIcon name="gift" size="xs" className="inline-flex" />{' '}
                {statusLabels.Packaging}
              </span>
              <p
                className={`text-xs font-semibold mt-1 ${order.packagedAt ? 'text-pink-700' : 'text-gray-400'}`}
              >
                {order.packagedAt ? formatDateTime(order.packagedAt) : '—'}
              </p>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                order.sentAt ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'
              }`}
            >
              <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1">
                <FlaticonIcon name="box-open" size="xs" className="inline-flex" />{' '}
                {statusLabels.ReadyToShip}
              </span>
              <p
                className={`text-xs font-semibold mt-1 ${order.sentAt ? 'text-emerald-700' : 'text-gray-400'}`}
              >
                {order.sentAt ? formatDateTime(order.sentAt) : '—'}
              </p>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                order.completedAt ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'
              }`}
            >
              <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1">
                <FlaticonIcon name="badge-check" size="xs" className="inline-flex" />{' '}
                {statusLabels.Completed}
              </span>
              <p
                className={`text-xs font-semibold mt-1 ${order.completedAt ? 'text-green-700' : 'text-gray-400'}`}
              >
                {order.completedAt ? formatDateTime(order.completedAt) : '—'}
              </p>
            </div>
          </div>

          {/* Payment status */}
          {(() => {
            const paid = Number(order.paidAmount) || 0;
            const remaining = Math.max(0, salePriceTotal - paid);
            const isFullyPaid = paid >= salePriceTotal && salePriceTotal > 0;
            const isPartiallyPaid = paid > 0 && !isFullyPaid;
            return (
              <div
                className={`mt-4 p-3 rounded-xl border ${
                  isFullyPaid
                    ? 'bg-emerald-50 border-emerald-200'
                    : isPartiallyPaid
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isFullyPaid
                        ? 'bg-emerald-100 text-emerald-700'
                        : isPartiallyPaid
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {isFullyPaid ? (
                      <span className="inline-flex items-center gap-1">
                        <FlaticonIcon name="badge-check" size="xs" /> Đã thanh toán
                      </span>
                    ) : isPartiallyPaid ? (
                      <span className="inline-flex items-center gap-1">
                        <FlaticonIcon name="alarm-clock" size="xs" /> Thanh toán một phần
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <FlaticonIcon name="circle-xmark" size="xs" /> Chưa thanh toán
                      </span>
                    )}
                  </span>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block">Còn lại</span>
                    <span
                      className={`text-lg font-bold ${remaining > 0 ? 'text-red-500' : 'text-gray-400'}`}
                    >
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 pt-2 border-t border-dashed border-gray-200 text-xs text-gray-500">
                  <span>
                    <FlaticonIcon name="usd-circle" size="xs" className="inline-flex" /> Đã thanh
                    toán:{' '}
                    <strong className={isFullyPaid ? 'text-emerald-600' : ''}>
                      {formatCurrency(paid)}
                    </strong>
                  </span>
                  <span>
                    Tổng cộng: <strong>{formatCurrency(salePriceTotal)}</strong>
                  </span>
                </div>

                {/* Mark as paid checkbox — at InProgress, Packaging, ReadyToShip steps */}
                {['InProgress', 'Packaging', 'ReadyToShip'].includes(order.status) &&
                  remaining > 0 && (
                    <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={false}
                            onChange={() => {
                              setShowConfirmPaid(true);
                            }}
                            disabled={markingPaid}
                          />
                          <div
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                              markingPaid
                                ? 'border-gray-300 bg-gray-100'
                                : 'border-mint-400 bg-white group-hover:border-mint-500 group-hover:bg-mint-50'
                            }`}
                          >
                            {markingPaid && (
                              <svg
                                className="w-3 h-3 text-gray-400 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-800 group-hover:text-mint-700 transition-colors">
                            Khách hàng đã thanh toán phần còn lại
                          </span>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Số tiền còn lại:{' '}
                            <strong className="text-red-500">{formatCurrency(remaining)}</strong>
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
              </div>
            );
          })()}

          {/* Notes — prominently shown at WaitingConfirm step */}
          {order.notes && (
            <div
              className={`mt-6 p-4 rounded-xl border ${
                order.status === 'WaitingConfirm'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                {' '}
                <FlaticonIcon name="clipboard" size="sm" /> <span>Ghi chú</span>
                {order.status === 'WaitingConfirm' && (
                  <span className="text-[10px] font-normal text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                    Đơn chờ làm
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}

          {/* Order Lines — final products */}
          {order.orderLines && order.orderLines.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FlaticonIcon name="receipt" size="sm" /> <span>Sản phẩm & Giá bán</span>
                <span className="badge-gray text-xs">{order.orderLines.length} sản phẩm</span>
              </h3>
              {order.orderLines.map((ol: any, i: number) => (
                <div
                  key={ol.id || i}
                  className="flex flex-col p-3 bg-avocado-50 rounded-xl border border-avocado-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FlaticonIcon
                        name={ol.type === 'RECIPE' ? 'receipt' : 'box-open'}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {ol.type === 'RECIPE'
                            ? ol.recipe?.name || 'Công thức'
                            : ol.product?.name || 'Sản phẩm'}
                        </p>
                        {ol.customInput && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-gray-400">Input:</span>
                            <div className="flex gap-0.5">
                              {ol.customInput.split('').map((char: string, j: number) => (
                                <span
                                  key={j}
                                  className="inline-flex items-center justify-center w-4 h-4 text-[8px] font-mono bg-white rounded text-gray-500 border border-gray-200"
                                >
                                  {char}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="font-bold text-avocado-600">
                        {formatCurrency(
                          ol.type === 'RECIPE'
                            ? Number(ol.salePrice || 0)
                            : Number(ol.unitPrice || 0) * (ol.quantity || 1),
                        )}
                      </p>
                      {ol.quantity > 1 && (
                        <p className="text-[10px] text-gray-400">× {ol.quantity}</p>
                      )}
                    </div>
                  </div>
                  {/* Per-line notes - shown at Đơn chờ làm */}
                  {ol.notes && (
                    <div
                      className={`mt-2 p-2.5 rounded-lg text-xs whitespace-pre-wrap border-l-4 ${
                        order.status === 'WaitingConfirm'
                          ? 'bg-amber-50/70 border-amber-400 text-amber-800'
                          : 'bg-gray-50 border-gray-300 text-gray-600'
                      }`}
                    >
                      {ol.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Legacy Recipe info — single recipe orders */}
          {!order.orderLines?.length && order.recipe && (
            <div className="mt-6 p-4 bg-avocado-50 rounded-xl border border-avocado-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaticonIcon name="receipt" size="lg" />
                  <div>
                    <h3 className="text-sm font-semibold text-avocado-700">{order.recipe.name}</h3>
                    {order.customInput && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-gray-400">Input:</span>
                        <div className="flex gap-0.5">
                          {order.customInput.split('').map((char: string, i: number) => (
                            <span
                              key={i}
                              className="inline-flex items-center justify-center w-4 h-4 text-[8px] font-mono bg-white rounded text-gray-500 border border-gray-200"
                            >
                              {char}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <p className="font-bold text-avocado-600 text-lg flex-shrink-0 ml-3">
                  {order.salePriceSnapshot != null
                    ? formatCurrency(Number(order.salePriceSnapshot))
                    : '—'}
                </p>
              </div>
            </div>
          )}

          {/* Vận chuyển — show for Đã gói, Đã gửi, Hoàn thành */}
          {['Packaging', 'ReadyToShip', 'Completed'].includes(order.status) && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <FlaticonIcon name="truck-side" size="sm" /> Vận chuyển
                </h3>
                {order.status === 'Packaging' && orderShipments.length === 0 && (
                  <button
                    onClick={() => setShowShipForm(!showShipForm)}
                    className={`btn-xs ${showShipForm ? 'btn-ghost border border-gray-200' : 'btn-primary'}`}
                  >
                    {showShipForm ? (
                      <>
                        <FlaticonIcon name="circle-xmark" size="xs" className="mr-0.5" /> Đóng
                      </>
                    ) : (
                      <>
                        <FlaticonIcon name="plus" size="xs" className="mr-0.5" /> Tạo đơn giao
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Shipping failed warning banner */}
              {orderShipments.length > 0 && orderShipments[0]?.status === 'Failed' && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-50 border-2 border-red-300 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 border border-red-300 flex items-center justify-center shrink-0">
                      <FlaticonIcon name="triangle-warning" size="sm" className="text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-red-800">Vận chuyển thất bại!</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        Đơn giao hàng hiện tại không thành công. Nhấn nút{' '}
                        <strong>&ldquo;Thử lại&rdquo;</strong> bên dưới để xóa đơn cũ và tạo đơn
                        giao mới.
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-red-500">
                        <span className="inline-flex items-center gap-1">
                          <FlaticonIcon name="clock" size="xs" /> Trạng thái đơn hàng hiện tại:{' '}
                          <strong>{statusLabels[order.status] || order.status}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Existing shipment (1 per order) */}
              {orderShipments.length > 0 &&
                (() => {
                  const s = orderShipments[0];
                  const cfg = carrierConfig[s.carrier] || carrierConfig.SPX;
                  const carrier = s.carrier || 'SPX';
                  return (
                    <div className="mb-4">
                      <div className="relative flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-lg border border-gray-200">
                        {order.status === 'Packaging' && !editingShipmentId && (
                          <button
                            onClick={() => {
                              const newForm: typeof shipForm = {
                                trackingNumber: s.trackingNumber || '',
                                trackingUrl: s.trackingUrl || '',
                                eta: s.eta ? s.eta.split('T')[0] : '',
                                sofType:
                                  s.deliveryType === 'Khách đến lấy hàng'
                                    ? ('pickup' as const)
                                    : ('delivery' as const),
                                cost: Number(s.cost),
                              };
                              originalShipForm.current = newForm;
                              setEditingShipmentId(s.id);
                              setShipCarrier(s.carrier || 'SPX');
                              setShipForm(newForm);
                              setShowShipForm(true);
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-mint-600 hover:border-mint-300 hover:shadow-sm transition-all shadow-sm"
                            title="Sửa đơn giao"
                          >
                            <FlaticonIcon name="pencil" size="xs" />
                          </button>
                        )}
                        <div className="w-6 h-6 rounded flex items-center justify-center shrink-0">
                          {cfg.isBrand ? (
                            <BrandIcon brand={cfg.icon as 'grab' | 'shopee'} size={18} />
                          ) : (
                            <div
                              className={`w-6 h-6 rounded bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white`}
                            >
                              <FlaticonIcon name={cfg.icon} size="xs" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs text-gray-800">{cfg.label}</span>
                            {carrier === 'SPX' && s.trackingNumber && (
                              <button
                                onClick={() =>
                                  window.open(`https://spx.vn/track?${s.trackingNumber}`, '_blank')
                                }
                                className="text-[10px] text-orange-600 hover:text-orange-800 underline truncate max-w-[140px]"
                              >
                                {s.trackingNumber}
                              </button>
                            )}
                            {carrier === 'Grab' && s.trackingUrl && (
                              <button
                                onClick={() => window.open(s.trackingUrl, '_blank')}
                                className="text-[10px] text-emerald-600 hover:text-emerald-800 underline truncate max-w-[140px]"
                              >
                                Mở tracking
                              </button>
                            )}
                            {carrier === 'SOF' && (
                              <span className="text-[10px] text-mint-600">
                                {s.deliveryType === 'Khách đến lấy hàng'
                                  ? 'Khách lấy'
                                  : 'Shop giao'}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400">
                            {Number(s.cost) === 0 ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 font-medium">
                                <FlaticonIcon name="tags" size="xs" /> Miễn phí ship
                              </span>
                            ) : (
                              formatCurrency(Number(s.cost))
                            )}
                          </p>
                        </div>
                        <DotProgress status={s.status} isFailed={s.status === 'Failed'} />
                      </div>
                      {s.status === 'Failed' && (
                        <button
                          onClick={() => {
                            setRetryShipmentId(s.id);
                            setShowRetryConfirm(true);
                          }}
                          className="mt-2 w-full py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium hover:bg-red-100 hover:border-red-300 transition-all flex items-center justify-center gap-1.5"
                        >
                          <FlaticonIcon name="refresh" size="xs" /> Thử lại với đơn giao mới
                        </button>
                      )}
                    </div>
                  );
                })()}

              {/* Create / Edit form — only at Đã gói step */}
              {order.status === 'Packaging' &&
                (orderShipments.length === 0 || editingShipmentId) && (
                  <>
                    <div className="mb-4">
                      <p className="text-[11px] font-medium text-gray-500 mb-2">Ai trả ship?</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          {
                            key: 'prepaid',
                            label: 'Khách trả trước',
                            cls: 'border-emerald-300 bg-emerald-50 text-emerald-700',
                          },
                          {
                            key: 'cod',
                            label: 'Khách trả sau (COD)',
                            cls: 'border-amber-300 bg-amber-50 text-amber-700',
                          },
                          {
                            key: 'shop',
                            label: 'Shop trả (tính vào chi phí)',
                            cls: 'border-mint-300 bg-mint-50 text-mint-700',
                          },
                        ].map((opt) => {
                          const isSel = shippingPaidBy === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => setLocalShippingPaidBy(opt.key)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${isSel ? opt.cls : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Carrier selector */}
                    <div className="mb-4">
                      <p className="text-[11px] font-medium text-gray-500 mb-2">Hãng vận chuyển</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['SPX', 'Grab', 'SOF'] as const).map((carrier) => {
                          const isSel = shipCarrier === carrier;
                          const cfg = carrierConfig[carrier];
                          const aCls =
                            carrier === 'SPX'
                              ? 'border-orange-400 bg-orange-50'
                              : carrier === 'Grab'
                                ? 'border-emerald-400 bg-emerald-50'
                                : 'border-mint-400 bg-mint-50';
                          return (
                            <button
                              type="button"
                              key={carrier}
                              onClick={() => setShipCarrier(carrier)}
                              className={`relative p-2.5 rounded-lg border-2 transition-all text-left ${isSel ? aCls : 'border-gray-200 bg-white hover:border-gray-300'}`}
                            >
                              <div className="flex items-center gap-2">
                                {cfg.isBrand ? (
                                  <BrandIcon brand={cfg.icon as 'grab' | 'shopee'} size={22} />
                                ) : (
                                  <div
                                    className={`w-6 h-6 rounded bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white`}
                                  >
                                    <FlaticonIcon name={cfg.icon} size="xs" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p
                                    className={`text-[11px] font-semibold ${isSel ? cfg.color : 'text-gray-700'}`}
                                  >
                                    {cfg.label}
                                  </p>
                                  <p className="text-[9px] text-gray-400 truncate">
                                    {carrier === 'SPX'
                                      ? 'Shopee Express'
                                      : carrier === 'Grab'
                                        ? 'GrabExpress'
                                        : 'Tự giao'}
                                  </p>
                                </div>
                              </div>
                              {isSel && (
                                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center text-white text-[8px]">
                                  ✓
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Expandable delivery form */}
                    {showShipForm && (
                      <div className="pt-3 border-t border-gray-200 space-y-3">
                        {/* SPX fields */}
                        {shipCarrier === 'SPX' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-medium text-gray-500 mb-1 block">
                                Mã vận đơn SPX
                              </label>
                              <div className="relative">
                                <input
                                  className={`input text-sm pr-8 ${spxValid === 'invalid' ? 'border-red-300 bg-red-50' : spxValid === 'valid' ? 'border-emerald-300 bg-emerald-50' : ''}`}
                                  value={shipForm.trackingNumber}
                                  onChange={(e) => {
                                    setShipForm({ ...shipForm, trackingNumber: e.target.value });
                                    setSpxValid('idle');
                                  }}
                                  placeholder="SPXVN..."
                                />
                                {spxValid !== 'idle' && shipForm.trackingNumber.length >= 10 && (
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                    {spxValid === 'loading' ? (
                                      <span className="w-3.5 h-3.5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin inline-block" />
                                    ) : spxValid === 'valid' ? (
                                      <FlaticonIcon
                                        name="badge-check"
                                        size="xs"
                                        className="text-emerald-500"
                                      />
                                    ) : (
                                      <FlaticonIcon
                                        name="circle-xmark"
                                        size="xs"
                                        className="text-red-400"
                                      />
                                    )}
                                  </span>
                                )}
                              </div>
                              {spxValid === 'invalid' && (
                                <p className="mt-1 text-[10px] text-red-500">
                                  Mã vận đơn không hợp lệ
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-gray-500 mb-1 block">
                                Dự kiến giao
                              </label>
                              <input
                                type="date"
                                className="input text-sm"
                                value={shipForm.eta}
                                onChange={(e) => setShipForm({ ...shipForm, eta: e.target.value })}
                              />
                            </div>
                          </div>
                        )}

                        {/* Grab fields */}
                        {shipCarrier === 'Grab' && (
                          <div>
                            <label className="text-[10px] font-medium text-gray-500 mb-1 block">
                              Link tracking Grab
                            </label>
                            <input
                              className="input text-sm"
                              value={shipForm.trackingUrl}
                              onChange={(e) =>
                                setShipForm({ ...shipForm, trackingUrl: e.target.value })
                              }
                              placeholder="https://grab.com/track/..."
                            />
                          </div>
                        )}

                        {/* SOF fields */}
                        {shipCarrier === 'SOF' && (
                          <div>
                            <label className="text-[10px] font-medium text-gray-500 mb-2 block">
                              Hình thức giao hàng
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                {
                                  value: 'pickup',
                                  label: 'Khách đến lấy',
                                  desc: 'Tự đến cửa hàng nhận',
                                  icon: 'store-alt',
                                },
                                {
                                  value: 'delivery',
                                  label: 'Shop giao hàng',
                                  desc: 'Chủ shop tự vận chuyển',
                                  icon: 'truck-side',
                                },
                              ].map((opt) => (
                                <button
                                  type="button"
                                  key={opt.value}
                                  onClick={() =>
                                    setShipForm({
                                      ...shipForm,
                                      sofType: opt.value as 'pickup' | 'delivery',
                                    })
                                  }
                                  className={`p-2.5 rounded-lg border-2 text-left transition-all ${shipForm.sofType === opt.value ? 'border-mint-400 bg-mint-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded bg-mint-500 flex items-center justify-center text-white">
                                      <FlaticonIcon name={opt.icon} size="xs" />
                                    </div>
                                    <div>
                                      <p
                                        className={`text-xs font-medium ${shipForm.sofType === opt.value ? 'text-mint-700' : 'text-gray-700'}`}
                                      >
                                        {opt.label}
                                      </p>
                                      <p className="text-[9px] text-gray-400">{opt.desc}</p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cost & Submit */}
                        <div className="flex items-end gap-3 pt-2 border-t border-gray-200">
                          <div className="flex-1">
                            <label className="text-[10px] font-medium text-gray-500 mb-1 block">
                              Phí giao hàng (VNĐ)
                            </label>
                            <NumberInput
                              className="input text-sm"
                              value={shipForm.cost}
                              onChange={(val) => setShipForm({ ...shipForm, cost: val })}
                              step={1000}
                              placeholder="0"
                            />
                          </div>
                          {editingShipmentId && (
                            <button
                              type="button"
                              onClick={() => {
                                const orig = originalShipForm.current;
                                if (
                                  orig &&
                                  (orig.trackingNumber !== shipForm.trackingNumber ||
                                    orig.trackingUrl !== shipForm.trackingUrl ||
                                    orig.eta !== shipForm.eta ||
                                    orig.sofType !== shipForm.sofType ||
                                    orig.cost !== shipForm.cost)
                                ) {
                                  setShowCancelEditConfirm(true);
                                } else {
                                  setShowShipForm(false);
                                  setEditingShipmentId(null);
                                  setSpxValid('idle');
                                  setShipForm({
                                    trackingNumber: '',
                                    trackingUrl: '',
                                    eta: '',
                                    sofType: 'pickup',
                                    cost: 0,
                                  });
                                }
                              }}
                              className="btn-secondary btn-sm"
                            >
                              Hủy
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (!token) return;
                              if (
                                shipForm.cost === undefined ||
                                shipForm.cost === null ||
                                Number(shipForm.cost) < 0
                              ) {
                                if (showToast)
                                  showToast('Vui lòng nhập phí giao hàng hợp lệ', 'error');
                                return;
                              }
                              setCreatingShipment(true);
                              try {
                                setLocalShippingCost(shipForm.cost);
                                const body: any = {
                                  orderId: order.id,
                                  carrier: shipCarrier,
                                  deliveryType:
                                    shipCarrier === 'SPX' ? 'SPX Express' : 'GrabExpress',
                                  shippingMethod:
                                    shipCarrier === 'SPX' ? 'SPX Express' : 'GrabExpress',
                                  cost: Number(shipForm.cost),
                                };
                                if (shipCarrier === 'SPX') {
                                  body.trackingNumber = shipForm.trackingNumber || undefined;
                                  body.eta = shipForm.eta
                                    ? new Date(shipForm.eta).toISOString()
                                    : undefined;
                                } else {
                                  if (shipCarrier === 'SOF') {
                                    body.deliveryType =
                                      shipForm.sofType === 'pickup'
                                        ? 'Khách đến lấy hàng'
                                        : 'Người bán giao hàng';
                                    body.shippingMethod = body.deliveryType;
                                  } else if (shipCarrier === 'Grab') {
                                    body.trackingUrl = shipForm.trackingUrl || undefined;
                                  }
                                }
                                const isEdit = editingShipmentId !== null;
                                if (isEdit) {
                                  await apiClient(`/shipping/${editingShipmentId}`, {
                                    method: 'PUT',
                                    body,
                                    token,
                                  });
                                  if (showToast) showToast('Đã cập nhật đơn giao hàng', 'success');
                                } else {
                                  await apiClient('/shipping', { method: 'POST', body, token });
                                  if (showToast) showToast('Đã tạo đơn giao hàng', 'success');
                                }
                                setShowShipForm(false);
                                setEditingShipmentId(null);
                                setSpxValid('idle');
                                setShipForm({
                                  trackingNumber: '',
                                  trackingUrl: '',
                                  eta: '',
                                  sofType: 'pickup',
                                  cost: 0,
                                });
                                loadOrderShipments();
                              } catch (e: any) {
                                if (showToast)
                                  showToast(
                                    e.message ||
                                      (editingShipmentId
                                        ? 'Cập nhật thất bại'
                                        : 'Tạo không thành công'),
                                    'error',
                                  );
                              }
                              setCreatingShipment(false);
                            }}
                            disabled={creatingShipment}
                            className="btn-primary disabled:opacity-50"
                          >
                            {creatingShipment ? (
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <FlaticonIcon name="check" size="sm" />{' '}
                                {editingShipmentId ? 'Lưu' : 'Tạo đơn'}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
            </div>
          )}

          {/* Cost breakdown */}
          <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Chi tiết chi phí</h3>
            <div className="space-y-2">
              <div className="detail-row py-1.5">
                <span className="detail-label">
                  {' '}
                  <FlaticonIcon name="diamond" size="xs" className="inline-flex" /> Giá vốn nguyên
                  liệu ({order.items?.length || 0} sản phẩm)
                </span>
                <span className="detail-value">{formatCurrency(itemTotal)}</span>
              </div>
              <div className="detail-row py-1.5">
                <span className="detail-label">Phí đóng gói</span>
                <span className="detail-value">
                  {formatCurrency(Number(order.packagingCost) || packagingTotal)}
                </span>
              </div>
              <div className="detail-row py-1.5">
                <span className="detail-label">Phí vận chuyển</span>
                <span className="detail-value">{formatCurrency(shippingCost)}</span>
              </div>
              <div className="detail-row py-1.5 border-b border-dashed border-gray-100 pb-2 mb-2">
                <span className="detail-label text-[10px] flex items-center gap-1">
                  <FlaticonIcon
                    name={
                      shippingPaidBy === 'shop'
                        ? 'store-alt'
                        : shippingPaidBy === 'prepaid'
                          ? 'user'
                          : 'truck-side'
                    }
                    size="xs"
                  />
                  {shippingPaidBy === 'prepaid'
                    ? 'Khách trả trước'
                    : shippingPaidBy === 'cod'
                      ? 'Khách trả sau (COD)'
                      : 'Shop trả ship'}
                </span>
                <span
                  className={`text-[10px] font-medium ${shippingPaidBy === 'shop' ? 'text-red-500' : 'text-emerald-600'}`}
                >
                  {shippingPaidBy === 'shop' ? '− tính vào chi phí' : 'không tính vào chi phí'}
                </span>
              </div>
              <div className="detail-row py-2 border-t-2 border-gray-200">
                <span className="text-sm font-semibold text-gray-800">Tổng chi phí</span>
                <span className="text-base font-bold text-avocado-600">
                  {formatCurrency(computedTotalCost)}
                </span>
              </div>
            </div>

            {/* Snapshot - captured when order was confirmed */}
            {order.confirmedAt && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    <FlaticonIcon name="camera" size="xs" /> Snapshot
                  </span>
                  <span className="text-xs text-gray-400">Giá trị tại thời điểm xác nhận</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {order.salePriceSnapshot != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Giá bán (snapshot)</span>
                      <span className="font-medium text-gray-700">
                        {formatCurrency(Number(order.salePriceSnapshot))}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tổng chi phí (snapshot)</span>
                    <span className="font-medium text-gray-700">
                      {formatCurrency(computedTotalCost)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-amber-100 pt-1">
                    <span className="text-gray-500 font-medium">
                      <FlaticonIcon name="usd-circle" size="xs" className="inline-flex mr-1" /> Lợi
                      nhuận (snapshot)
                    </span>
                    <span
                      className={`font-bold ${profit > 0 ? 'text-emerald-600' : profit < 0 ? 'text-red-600' : 'text-gray-500'}`}
                    >
                      {profit > 0 ? '+' : ''}
                      {formatCurrency(profit)}
                    </span>
                  </div>
                  {order.recipeSnapshot && (
                    <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                      <p className="text-xs font-medium text-amber-800 mb-1">
                        <FlaticonIcon name="receipt" size="xs" className="inline-flex mr-1" /> Công
                        thức: {order.recipeSnapshot.name}
                      </p>
                      {order.recipeSnapshot.products?.map((p: any, i: number) => (
                        <div key={i} className="flex justify-between text-[10px] text-amber-700">
                          <span>
                            {p.productName} ×{p.quantity}
                          </span>
                          <span>{formatCurrency(p.productCost * p.quantity)}</span>
                        </div>
                      ))}
                      {order.customInput && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-amber-600">Input:</span>
                          <div className="flex gap-0.5">
                            {order.customInput.split('').map((char: string, i: number) => (
                              <span
                                key={i}
                                className="inline-flex items-center justify-center w-4 h-4 text-[8px] font-mono bg-white rounded text-amber-700 border border-amber-200"
                              >
                                {char}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t flex justify-end items-center">
          <button onClick={onClose} className="btn-secondary">
            Đóng
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmAdvance}
        onClose={() => setShowConfirmAdvance(false)}
        onConfirm={doAdvance}
        title="Xác nhận chuyển trạng thái"
        message={`Bạn có chắc muốn chuyển sang trạng thái "${advanceLabel}"?`}
        confirmLabel="Xác nhận"
        variant="primary"
      />

      <ConfirmModal
        isOpen={showConfirmReturn}
        onClose={() => setShowConfirmReturn(false)}
        onConfirm={doReturn}
        title="Xác nhận quay lại"
        message={`Bạn có chắc muốn quay lại trạng thái "${returnLabel}"? Thời gian xác nhận cũ sẽ bị xóa.`}
        confirmLabel="Quay lại"
        variant="danger"
      />

      <ConfirmModal
        isOpen={showConfirmPaid}
        onClose={() => setShowConfirmPaid(false)}
        onConfirm={doMarkPaid}
        title="Xác nhận thanh toán"
        message={`Xác nhận khách hàng đã thanh toán đủ ${formatCurrency(salePriceTotal)}?`}
        confirmLabel="Đã thanh toán"
        variant="primary"
      />

      <ConfirmModal
        isOpen={showCancelEditConfirm}
        onClose={() => setShowCancelEditConfirm(false)}
        onConfirm={() => {
          setShowCancelEditConfirm(false);
          setShowShipForm(false);
          setEditingShipmentId(null);
          setSpxValid('idle');
          setShipForm({ trackingNumber: '', trackingUrl: '', eta: '', sofType: 'pickup', cost: 0 });
        }}
        title="Bỏ thay đổi?"
        message="Bạn đã thay đổi thông tin. Các thay đổi sẽ không được lưu nếu bạn hủy."
        confirmLabel="Bỏ thay đổi"
        variant="danger"
      />

      <ConfirmModal
        isOpen={showRetryConfirm}
        onClose={() => {
          setShowRetryConfirm(false);
          setRetryShipmentId(null);
        }}
        onConfirm={handleRetryShipment}
        title="Thử lại đơn giao hàng?"
        message="Đơn giao hàng hiện tại đã thất bại. Xác nhận sẽ xóa đơn giao cũ và quay lại bước Đơn đã gói để bạn tạo đơn giao mới. Thao tác này không thể hoàn tác."
        confirmLabel="Xóa & tạo lại"
        variant="danger"
      />

      {/* Read-only customer detail modal */}
      {showCustomerDetail && order.customer && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-avocado-50/50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-pink-500 flex items-center justify-center text-white text-sm shadow-sm">
                  <FlaticonIcon name="user" size="sm" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{order.customer.name}</h2>
                  <p className="text-[11px] text-gray-400">Thông tin khách hàng</p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomerDetail(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Avatar & Name */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <div className="w-14 h-14 rounded-full bg-pink-500 flex items-center justify-center text-white text-xl font-bold shadow-sm ring-2 ring-white">
                  {order.customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{order.customer.name}</p>
                  {order.customer.notes && (
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <FlaticonIcon name="clipboard" size="xs" className="text-gray-400" />
                      {order.customer.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-3">
                {order.customer.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-mint-50 flex items-center justify-center flex-shrink-0">
                      <FlaticonIcon name="envelope" size="xs" className="text-mint-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Email</p>
                      <a
                        href={`mailto:${order.customer.email}`}
                        className="text-gray-700 hover:text-avocado-600 transition-colors font-medium"
                      >
                        {order.customer.email}
                      </a>
                    </div>
                  </div>
                )}
                {order.customer.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                      <FlaticonIcon name="phone-call" size="xs" className="text-green-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Số điện thoại</p>
                      <a
                        href={`tel:${order.customer.phone}`}
                        className="text-gray-700 hover:text-avocado-600 transition-colors font-medium"
                      >
                        {order.customer.phone}
                      </a>
                    </div>
                  </div>
                )}
                {order.customer.address && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <FlaticonIcon name="map-pin" size="xs" className="text-amber-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Địa chỉ</p>
                      <p className="text-gray-700">{order.customer.address}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Social Links */}
              {(order.customer.facebook ||
                order.customer.instagram ||
                order.customer.tiktok ||
                order.customer.threads) && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <span className="w-1 h-3.5 rounded-full bg-avocado-400 inline-block" />
                    Mạng xã hội
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SOCIAL_PLATFORMS.filter((p) => !p.phoneBased).map((platform) => {
                      const val = order.customer?.[platform.key];
                      if (!val) return null;
                      const href = val.startsWith('http')
                        ? val
                        : `${platform.domain}${val.replace(/^@/, '')}`;
                      return (
                        <a
                          key={platform.key}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-700 hover:border-gray-400 hover:shadow-sm hover:-translate-y-0.5 transition-all"
                        >
                          <span className="w-4 h-4">{platform.icon}</span>
                          <span>{platform.label}</span>
                        </a>
                      );
                    })}
                    {order.customer.phone && (
                      <a
                        href={`https://zalo.me/${order.customer.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-700 hover:border-gray-400 hover:shadow-sm hover:-translate-y-0.5 transition-all"
                      >
                        <span className="w-4 h-4">
                          <svg viewBox="0 0 24 24" fill="#0068FF" className="w-full h-full">
                            <path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z" />
                          </svg>
                        </span>
                        <span>Zalo</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end">
              <button onClick={() => setShowCustomerDetail(false)} className="btn-secondary">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
