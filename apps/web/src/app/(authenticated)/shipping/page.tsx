'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@handmade-shop/shared';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { SkeletonRow } from '@/components/LoadingSpinner';
import FlaticonIcon from '@/components/FlaticonIcon';
import Pagination from '@/components/Pagination';
import { copyToClipboard } from '@/lib/clipboard';
import { useSort, SortIcon } from '@/hooks/useSort';
import {
  carrierConfig,
  statusLabels,
  statusColors,
  statusBgs,
  statusIcons,
  statusFlow,
  nextActions,
  getCarrier,
  getStatusLabel,
  DotProgress,
  CarrierLogo,
  type Shipping,
  type CarrierType,
} from './shippingConstants';
import ShippingDetail from './ShippingDetail';

/* ─── Shared render helpers (desktop table + mobile card) ─── */
function TrackingBadge({ s, carrier }: { s: Shipping; carrier: CarrierType }) {
  if (carrier === 'SPX' && s.trackingNumber) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(
              `https://spx.vn/track?${s.trackingNumber}`,
              '_blank',
              'noopener,noreferrer',
            );
          }}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-medium hover:bg-orange-100 hover:border-orange-300 hover:shadow-sm transition-all max-w-[120px]"
        >
          <FlaticonIcon name="arrow-up-right-from-square" size="xs" />
          <span className="truncate min-w-0">{s.trackingNumber}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard(s.trackingNumber!);
          }}
          className="w-6 h-6 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 hover:border-gray-300 transition-all"
          title="Sao chép mã vận đơn"
        >
          <FlaticonIcon name="clipboard" size="xs" />
        </button>
      </div>
    );
  }
  if (carrier === 'Grab' && s.trackingUrl) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          window.open(s.trackingUrl!, '_blank', 'noopener,noreferrer');
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-medium hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-sm transition-all"
      >
        <FlaticonIcon name="arrow-up-right-from-square" size="xs" />
        Grab Track
      </button>
    );
  }
  if (carrier === 'SOF') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-mint-50 border border-mint-200 shadow-sm">
        <FlaticonIcon
          name={s.deliveryType === 'Khách đến lấy hàng' ? 'store-alt' : 'truck-side'}
          size="xs"
          className="text-mint-500"
        />
        <span className="text-xs font-medium text-mint-600">
          {s.deliveryType === 'Khách đến lấy hàng' ? 'Lấy tại shop' : 'Shop giao'}
        </span>
      </span>
    );
  }
  return <span className="text-gray-300 italic text-xs">—</span>;
}

function ShipmentActions({
  s,
  carrier,
  isAnimating,
  action,
  spxUpdating,
  grabUpdating,
  onUpdateStatus,
  onUpdateSpx,
  onUpdateGrab,
}: {
  s: Shipping;
  carrier: CarrierType;
  isAnimating: boolean;
  action: { status: string; label: string; btn: string } | undefined;
  spxUpdating: string | null;
  grabUpdating: string | null;
  onUpdateStatus: (id: string, newStatus: string) => void;
  onUpdateSpx: (shipment: Shipping) => void;
  onUpdateGrab: (shipment: Shipping) => void;
}) {
  return (
    <>
      {action && (
        <button
          onClick={() => onUpdateStatus(s.id, action.status)}
          disabled={isAnimating}
          className={`btn-xs ${action.btn} disabled:opacity-50`}
        >
          {isAnimating ? (
            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
          ) : (
            action.label
          )}
        </button>
      )}
      {s.status === 'InTransit' && (
        <button
          onClick={() => onUpdateStatus(s.id, 'Failed')}
          disabled={isAnimating}
          className="btn-xs btn-danger disabled:opacity-50"
        >
          Thất bại
        </button>
      )}
      {carrier === 'SPX' && s.trackingNumber && (
        <button
          onClick={() => onUpdateSpx(s)}
          disabled={spxUpdating === s.id}
          className="btn-xs btn-ghost disabled:opacity-50"
          title="Cập nhật SPX"
        >
          {spxUpdating === s.id ? (
            <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : (
            <FlaticonIcon name="refresh" size="xs" />
          )}
        </button>
      )}
      {carrier === 'Grab' && s.trackingUrl && (
        <button
          onClick={() => onUpdateGrab(s)}
          disabled={grabUpdating === s.id}
          className="btn-xs btn-ghost disabled:opacity-50"
          title="Cập nhật Grab"
        >
          {grabUpdating === s.id ? (
            <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : (
            <FlaticonIcon name="refresh" size="xs" />
          )}
        </button>
      )}
    </>
  );
}

export default function ShippingPage() {
  const { token } = useAuth();
  const [shipments, setShipments] = useState<Shipping[]>([]);
  const [loading, setLoading] = useState(true);
  const [carrierFilter, setCarrierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast, showToast } = useToast();
  const [spxUpdating, setSpxUpdating] = useState<string | null>(null);
  const [grabUpdating, setGrabUpdating] = useState<string | null>(null);
  const [updatingShipments, setUpdatingShipments] = useState<Set<string>>(new Set());
  const [justUpdated, setJustUpdated] = useState<string | null>(null);
  const [justUpdatedStatus, setJustUpdatedStatus] = useState<string | null>(null);
  const [detailShipment, setDetailShipment] = useState<Shipping | null>(null);

  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [carrierCounts, setCarrierCounts] = useState<Record<string, number>>({});

  const loadCounts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiClient<any>('/shipping/counts', { token });
      if (res.data) setStatusCounts(res.data);
      // Also fetch carrier counts: get all shipments with limit=1 to get total, then calculate
      const allRes = await apiClient<any>('/shipping?limit=200', { token });
      if (allRes.data) {
        const cc: Record<string, number> = {};
        for (const c of ['SPX', 'Grab', 'SOF']) {
          cc[c] = allRes.data.filter((s: any) => s.carrier === c).length;
        }
        setCarrierCounts(cc);
      }
    } catch {
      /* ignore */
    }
  }, [token]);

  const loadShipments = useCallback(async () => {
    if (!token) return;
    try {
      const params: Record<string, string> = { page: String(page), limit: '30' };
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient<any>(`/shipping?${new URLSearchParams(params).toString()}`, {
        token,
      });
      setShipments(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (e: any) {
      showToast(e.message || 'Failed', 'error');
    }
    setLoading(false);
  }, [token, page, statusFilter, showToast]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);
  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Auto-fetch tracking for active shipments on page load
  useEffect(() => {
    if (!token || loading || shipments.length === 0) return;
    const activeCarriers = ['SPX', 'Grab'];
    const toAutoTrack = shipments.filter(
      (s) =>
        activeCarriers.includes(s.carrier || '') &&
        ['Pending', 'Shipped', 'InTransit'].includes(s.status) &&
        (s.carrier === 'SPX' ? s.trackingNumber : s.trackingUrl),
    );
    if (toAutoTrack.length === 0) return;

    // Process sequentially to avoid overwhelming the API
    (async () => {
      let updated = 0;
      for (const s of toAutoTrack) {
        try {
          let res;
          if (s.carrier === 'SPX' && s.trackingNumber) {
            res = await apiClient<any>('/shipping/track-spx', {
              method: 'POST',
              body: { trackingNumber: s.trackingNumber },
              token,
            });
          } else if (s.carrier === 'Grab' && s.trackingUrl) {
            res = await apiClient<any>('/shipping/track-grab', {
              method: 'POST',
              body: { trackingUrl: s.trackingUrl },
              token,
            });
          }
          if (res?.data?.status && res.data.status !== s.status) {
            const updateBody: any = { status: res.data.status };
            if (res.data.status === 'Delivered') {
              const latest = res.data.records?.[0];
              if (latest?.timestamp) updateBody.deliveredAt = latest.timestamp;
            }
            await apiClient(`/shipping/${s.id}`, {
              method: 'PUT',
              body: updateBody,
              token,
            });
            updated++;
          }
        } catch {
          // Skip silently — don't block the page for tracking failures
        }
      }
      if (updated > 0) {
        await loadShipments();
      }
    })();
    // Run once when shipments first load, not on re-renders/filter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading === false && shipments.length > 0]);

  const updateStatus = async (id: string, newStatus: string) => {
    if (!token) return;
    setUpdatingShipments((prev) => new Set(prev).add(id));
    try {
      const body: any = { status: newStatus };
      if (newStatus === 'Shipped') body.shippedAt = new Date().toISOString();
      if (newStatus === 'Delivered') body.deliveredAt = new Date().toISOString();
      await apiClient(`/shipping/${id}`, { method: 'PUT', body, token });
      showToast(`Đã cập nhật`);
      await loadShipments();
      setJustUpdated(id);
      setJustUpdatedStatus(newStatus);
      setTimeout(() => {
        setJustUpdated(null);
        setJustUpdatedStatus(null);
      }, 2000);
    } catch (e: any) {
      showToast(e.message || 'Cập nhật thất bại', 'error');
    }
    setUpdatingShipments((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const updateGrabFromTracking = async (shipment: Shipping) => {
    if (!token || !shipment.trackingUrl) return;
    setGrabUpdating(shipment.id);
    setUpdatingShipments((prev) => new Set(prev).add(shipment.id));
    try {
      const res = await apiClient<any>('/shipping/track-grab', {
        method: 'POST',
        body: { trackingUrl: shipment.trackingUrl },
        token,
      });
      const updateBody: any = { status: res.data.status };
      await apiClient(`/shipping/${shipment.id}`, { method: 'PUT', body: updateBody, token });
      showToast(
        `Grab: ${statusLabels[res.data.status as keyof typeof statusLabels] || res.data.status} — đã cập nhật`,
      );
      await loadShipments();
      setJustUpdated(shipment.id);
      setJustUpdatedStatus(res.data.status);
      setTimeout(() => {
        setJustUpdated(null);
        setJustUpdatedStatus(null);
      }, 2000);
    } catch (e: any) {
      showToast(e.message || 'Tra cứu Grab thất bại', 'error');
    }
    setGrabUpdating(null);
    setUpdatingShipments((prev) => {
      const next = new Set(prev);
      next.delete(shipment.id);
      return next;
    });
  };

  const updateSpxFromTracking = async (shipment: Shipping) => {
    if (!token || !shipment.trackingNumber) return;
    setSpxUpdating(shipment.id);
    setUpdatingShipments((prev) => new Set(prev).add(shipment.id));
    try {
      const res = await apiClient<any>('/shipping/track-spx', {
        method: 'POST',
        body: { trackingNumber: shipment.trackingNumber },
        token,
      });
      const updateBody: any = { status: res.data.status };
      const latest = res.data.records?.length > 0 ? res.data.records[0] : null;
      if (latest?.timestamp && res.data.status === 'Delivered') {
        updateBody.deliveredAt = latest.timestamp;
      }
      await apiClient(`/shipping/${shipment.id}`, { method: 'PUT', body: updateBody, token });
      showToast(`SPX: ${res.data.spxStatus} — đã cập nhật`);
      await loadShipments();
      setJustUpdated(shipment.id);
      setJustUpdatedStatus(res.data.status);
      setTimeout(() => {
        setJustUpdated(null);
        setJustUpdatedStatus(null);
      }, 2000);
    } catch (e: any) {
      showToast(e.message || 'Tra cứu SPX thất bại', 'error');
    }
    setSpxUpdating(null);
    setUpdatingShipments((prev) => {
      const next = new Set(prev);
      next.delete(shipment.id);
      return next;
    });
  };

  const filtered = carrierFilter ? shipments.filter((s) => s.carrier === carrierFilter) : shipments;
  // Use server-side counts when no carrier filter; local counts when carrier filter is active
  const effectiveStatusCounts = carrierFilter
    ? statusFlow.reduce(
        (acc, s) => ({ ...acc, [s]: filtered.filter((sh) => sh.status === s).length }),
        {} as Record<string, number>,
      )
    : statusCounts;
  const failedCount = carrierFilter
    ? filtered.filter((s) => s.status === 'Failed').length
    : statusCounts['Failed'] || 0;
  // Carrier counts always come from API (total across all statuses)
  const allCarrierCounts = carrierCounts;

  // Sort
  const { sortedData, sortKey, sortDir, toggleSort } = useSort(filtered, 'createdAt', 'desc');

  return (
    <div className="page-enter space-y-5">
      <Toast toast={toast} />

      <style>{`
        @keyframes successGlow { 0% { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); } 50% { box-shadow: 0 0 0 6px rgba(52,211,153,0.15); } 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); } }
        @keyframes successGlowDelivered { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.6); } 40% { box-shadow: 0 0 0 10px rgba(16,185,129,0.2); } 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } }
        @keyframes statusPopIn { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
        .animate-success-glow { animation: successGlow 1.5s ease-out; }
        .animate-success-glow-delivered { animation: successGlowDelivered 2s ease-out; }
        .animate-status-pop { animation: statusPopIn 0.4s cubic-bezier(0.34,1.56,0.64,1); }
      `}</style>

      {/* ─── Header ─── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-mint-50/80 via-white to-avocado-50/40 border border-avocado-100/40 px-5 py-4 shadow-sm">
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-mint-500 to-emerald-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <FlaticonIcon name="truck-side" size="sm" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Giao hàng</h1>
              <p className="text-xs text-gray-400">SPX · Grab · Giao hàng thường</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => {
              setCarrierFilter('');
              setPage(1);
            }}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${carrierFilter === '' ? 'bg-gray-900 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-gray-800 hover:shadow-sm'}`}
          >
            <FlaticonIcon name="box-open" size="xs" /> Tất cả
            <span
              className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${carrierFilter === '' ? 'bg-white/20 text-white/90' : 'bg-gray-100 text-gray-500'}`}
            >
              {shipments.length}
            </span>
          </button>
          {(['SPX', 'Grab', 'SOF'] as const).map((c) => (
            <button
              key={c}
              onClick={() => {
                setCarrierFilter(c);
                setPage(1);
              }}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${carrierFilter === c ? (c === 'SPX' ? 'bg-orange-500 text-white shadow-sm' : c === 'Grab' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-mint-500 text-white shadow-sm') : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-gray-800 hover:shadow-sm'}`}
            >
              <CarrierLogo carrier={c} size="xs" /> {carrierConfig[c].label}
              <span
                className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${carrierFilter === c ? 'bg-white/20 text-white/90' : 'bg-gray-100 text-gray-500'}`}
              >
                {allCarrierCounts[c] || 0}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-gray-400 font-medium mr-1 uppercase tracking-wider">
            Trạng thái:
          </span>
          <button
            onClick={() => {
              setStatusFilter('');
              setPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 border ${!statusFilter ? 'bg-gray-100 text-gray-700 border-gray-300 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Tất cả{' '}
            <span className="text-gray-400">({filtered.length})</span>
          </button>
          {statusFlow.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(statusFilter === s ? '' : s);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 border ${statusFilter === s ? `${statusBgs[s]} border-current shadow-sm` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusColors[s]}`} /> {statusLabels[s]}{' '}
              <span className="text-gray-400">({Number(effectiveStatusCounts[s] || 0)})</span>
            </button>
          ))}
          <button
            onClick={() => setStatusFilter(statusFilter === 'Failed' ? '' : 'Failed')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 border ${statusFilter === 'Failed' ? 'bg-red-50 text-red-700 border-red-300 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-red-300 hover:text-red-600'}`}
          >
            <FlaticonIcon name="circle-xmark" size="xs" /> Thất bại{' '}
            <span className="text-gray-400">({failedCount})</span>
          </button>
        </div>
      </div>

      {/* ─── Table ─── */}
      {loading ? (
        <>
          {/* Mobile skeleton cards */}
          <div className="space-y-3 md:hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full skeleton flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-1/2" />
                    <div className="skeleton h-3 w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop skeleton table */}
          <div className="card p-0 overflow-hidden hidden md:block">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Hãng</th>
                    <th>Đơn hàng</th>
                    <th>Tiến trình</th>
                    <th>Trạng thái</th>
                    <th>Theo dõi</th>
                    <th>Phí</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonRow key={i} cols={7} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : filtered.length === 0 ? (
        <div className="relative overflow-hidden flex flex-col items-center justify-center py-20 text-center">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-avocado-100/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-avocado-100/30 rounded-full blur-3xl" />
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 flex items-center justify-center mb-4 shadow-inner">
            <FlaticonIcon name="truck-side" size="lg" className="text-gray-300" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1.5">
            Không tìm thấy đơn giao hàng
          </h3>
          <p className="text-xs text-gray-400 max-w-xs mb-2">
            {carrierFilter
              ? `Không có đơn của ${carrierConfig[carrierFilter]?.label || carrierFilter}.`
              : 'Tạo đơn giao hàng từ chi tiết đơn hàng.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile shipping cards */}
          <div className="card p-0 overflow-hidden divide-y divide-gray-100 md:hidden">
            {sortedData.map((s) => {
              const carrier = getCarrier(s);
              const action = nextActions[s.status];
              const isFailed = s.status === 'Failed';
              const isAnimating = updatingShipments.has(s.id);
              return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailShipment(s)}
                  onKeyDown={(e) => e.key === 'Enter' && setDetailShipment(s)}
                  className="px-4 py-3.5 active:bg-mint-50/60 transition-colors cursor-pointer"
                >
                  {/* Carrier + order + cost */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CarrierLogo carrier={carrier} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {s.deliveryType}
                        </p>
                        <p className="text-[10px] font-mono text-gray-500 truncate">
                          #{s.orderId}
                          {s.eta ? ` · ETA ${formatDateTime(s.eta)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {Number(s.cost) === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] font-medium">
                          <FlaticonIcon name="tags" size="xs" /> Miễn phí
                        </span>
                      ) : (
                        <p className="text-sm font-bold text-gray-800">
                          {formatCurrency(Number(s.cost))}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Status + progress */}
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${statusBgs[s.status] || 'bg-gray-100 text-gray-600'}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${statusColors[s.status] || 'bg-gray-400'}`}
                      />
                      {getStatusLabel(carrier, s.status)}
                    </span>
                    <DotProgress status={s.status} isFailed={isFailed} />
                  </div>
                  {/* Tracking + actions */}
                  <div className="flex items-center justify-between gap-2 mt-2.5">
                    <TrackingBadge s={s} carrier={carrier} />
                    <div
                      className="flex items-center gap-1.5 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ShipmentActions
                        s={s}
                        carrier={carrier}
                        isAnimating={isAnimating}
                        action={action}
                        spxUpdating={spxUpdating}
                        grabUpdating={grabUpdating}
                        onUpdateStatus={updateStatus}
                        onUpdateSpx={updateSpxFromTracking}
                        onUpdateGrab={updateGrabFromTracking}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop shipping table */}
          <div className="card p-0 overflow-hidden hidden md:block">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th
                      className="cursor-pointer select-none group"
                      onClick={() => toggleSort('carrier')}
                    >
                      Hãng <SortIcon sortKey="carrier" currentKey={sortKey} dir={sortDir} />
                    </th>
                    <th
                      className="cursor-pointer select-none group"
                      onClick={() => toggleSort('orderId')}
                    >
                      Đơn hàng <SortIcon sortKey="orderId" currentKey={sortKey} dir={sortDir} />
                    </th>
                    <th>Tiến trình</th>
                    <th
                      className="cursor-pointer select-none group"
                      onClick={() => toggleSort('status')}
                    >
                      Trạng thái <SortIcon sortKey="status" currentKey={sortKey} dir={sortDir} />
                    </th>
                    <th>Theo dõi</th>
                    <th
                      className="cursor-pointer select-none group"
                      onClick={() => toggleSort('cost')}
                    >
                      Phí <SortIcon sortKey="cost" currentKey={sortKey} dir={sortDir} />
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((s) => {
                    const carrier = getCarrier(s);
                    const cfg = carrierConfig[carrier];
                    const action = nextActions[s.status];
                    const isFailed = s.status === 'Failed';
                    const isAnimating = updatingShipments.has(s.id);
                    const wasJustUpdated = justUpdated === s.id;

                    return (
                      <tr
                        key={s.id}
                        onClick={() => setDetailShipment(s)}
                        className={`cursor-pointer transition-all duration-300 ${
                          wasJustUpdated && justUpdatedStatus === 'Delivered'
                            ? 'animate-success-glow-delivered'
                            : wasJustUpdated
                              ? 'animate-success-glow'
                              : isAnimating
                                ? 'opacity-70'
                                : ''
                        } ${isAnimating ? 'pointer-events-none' : ''} hover:bg-mint-50/40`}
                      >
                        <td>
                          <div className="flex items-center gap-2">
                            <CarrierLogo carrier={carrier} size="sm" />
                            <div>
                              <p className="text-xs font-semibold text-gray-800">
                                {s.deliveryType}
                              </p>
                              {cfg && (
                                <span
                                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cfg.badge}`}
                                >
                                  {cfg.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-xs font-mono text-gray-500">#{s.orderId}</span>
                          {s.eta && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              ETA: {formatDateTime(s.eta)}
                            </p>
                          )}
                          {carrier === 'SOF' && (s.driverName || s.driverPhone) && (
                            <p className="text-[10px] text-mint-500 mt-0.5 font-medium">
                              {s.driverName && (
                                <>
                                  <FlaticonIcon
                                    name="user"
                                    size="xs"
                                    className="inline-flex mr-0.5"
                                  />
                                  {s.driverName}
                                </>
                              )}
                              {s.driverName && s.driverPhone ? ' · ' : ''}
                              {s.driverPhone && (
                                <>
                                  <FlaticonIcon
                                    name="phone-call"
                                    size="xs"
                                    className="inline-flex mr-0.5"
                                  />
                                  {s.driverPhone}
                                </>
                              )}
                            </p>
                          )}
                        </td>
                        <td className="min-w-[140px]">
                          <DotProgress status={s.status} isFailed={isFailed} />
                          <div className="flex items-center gap-2 mt-1.5 text-[9px] text-gray-400">
                            {s.shippedAt && (
                              <span>
                                <FlaticonIcon
                                  name="box-open"
                                  size="xs"
                                  className="inline-flex mr-0.5 text-gray-400"
                                />
                                {formatDateTime(s.shippedAt)}
                              </span>
                            )}
                            {s.deliveredAt && (
                              <span>
                                <FlaticonIcon
                                  name="badge-check"
                                  size="xs"
                                  className="inline-flex mr-0.5 text-emerald-500"
                                />
                                {formatDateTime(s.deliveredAt)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            key={wasJustUpdated ? 'upd-' + justUpdatedStatus : s.status}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                              wasJustUpdated ? 'animate-status-pop' : ''
                            } ${statusBgs[s.status] || 'bg-gray-100 text-gray-600'}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${statusColors[s.status] || 'bg-gray-400'}`}
                            />
                            {getStatusLabel(carrier, s.status)}
                          </span>
                        </td>
                        <td>
                          <TrackingBadge s={s} carrier={carrier} />
                        </td>
                        <td>
                          {Number(s.cost) === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-medium">
                              <FlaticonIcon name="tags" size="xs" /> Miễn phí
                            </span>
                          ) : (
                            <>
                              <p className="text-sm font-bold text-gray-800">
                                {formatCurrency(Number(s.cost))}
                              </p>
                              {s.deliveredAt && (
                                <p className="text-[10px] text-emerald-500 font-medium">
                                  <FlaticonIcon
                                    name="badge-check"
                                    size="xs"
                                    className="inline-flex mr-0.5"
                                  />
                                  Đã thanh toán
                                </p>
                              )}
                            </>
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 justify-end">
                            <ShipmentActions
                              s={s}
                              carrier={carrier}
                              isAnimating={isAnimating}
                              action={action}
                              spxUpdating={spxUpdating}
                              grabUpdating={grabUpdating}
                              onUpdateStatus={updateStatus}
                              onUpdateSpx={updateSpxFromTracking}
                              onUpdateGrab={updateGrabFromTracking}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-gray-100">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        </>
      )}

      {/* ─── Detail Modal ─── */}
      {detailShipment && (
        <ShippingDetail
          shipment={detailShipment}
          token={token}
          showToast={showToast}
          updatingShipments={updatingShipments}
          spxUpdating={spxUpdating}
          grabUpdating={grabUpdating}
          onUpdateStatus={updateStatus}
          onUpdateSpx={updateSpxFromTracking}
          onUpdateGrab={updateGrabFromTracking}
          onClose={() => setDetailShipment(null)}
        />
      )}
    </div>
  );
}
