'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@handmade-shop/shared';
import FlaticonIcon from '@/components/FlaticonIcon';
import { copyToClipboard } from '@/lib/clipboard';
import {
  DotProgress,
  getCarrier,
  getStatusLabel,
  statusBgs,
  statusColors,
  statusFlow,
  carrierConfig,
  carrierStatusLabels,
  nextActions,
  type SpxRecord,
  type Shipping,
  type CarrierType,
} from './shippingConstants';
import { CarrierLogo } from './shippingConstants';

export default function ShippingDetail({
  shipment,
  token,
  showToast,
  updatingShipments,
  spxUpdating,
  grabUpdating,
  onUpdateStatus,
  onUpdateSpx,
  onUpdateGrab,
  onClose,
}: {
  shipment: Shipping;
  token: string | null;
  showToast: (message: string, type?: 'success' | 'error') => void;
  updatingShipments: Set<string>;
  spxUpdating: string | null;
  grabUpdating: string | null;
  onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
  onUpdateSpx: (s: Shipping) => Promise<void>;
  onUpdateGrab: (s: Shipping) => Promise<void>;
  onClose: () => void;
}) {
  const [spxRecords, setSpxRecords] = useState<SpxRecord[]>([]);
  const [spxRecordsLoading, setSpxRecordsLoading] = useState(false);
  const [grabTrackingInfo, setGrabTrackingInfo] = useState<any>(null);

  useEffect(() => {
    if (!token || !shipment) {
      setSpxRecords([]);
      setSpxRecordsLoading(false);
      setGrabTrackingInfo(null);
      return;
    }
    const crr = getCarrier(shipment);

    if (crr === 'SPX' && shipment.trackingNumber) {
      setSpxRecordsLoading(true);
      apiClient<any>('/shipping/track-spx', {
        method: 'POST',
        body: { trackingNumber: shipment.trackingNumber },
        token,
      })
        .then((res) => {
          const records = res.data?.records || [];
          setSpxRecords(records);
          if (res.data.status && res.data.status !== shipment.status) {
            const updateBody: any = { status: res.data.status };
            const latest = records.length > 0 ? records[0] : null;
            if (latest?.timestamp && res.data.status === 'Delivered') {
              updateBody.deliveredAt = latest.timestamp;
            }
            apiClient(`/shipping/${shipment.id}`, { method: 'PUT', body: updateBody, token })
              .then(() => {
                showToast(`SPX: ${res.data.spxStatus} — tự động cập nhật`);
              })
              .catch(() => {});
          }
        })
        .catch(() => {
          setSpxRecords([]);
        })
        .finally(() => setSpxRecordsLoading(false));
    } else if (crr === 'Grab' && shipment.trackingUrl) {
      setSpxRecordsLoading(true);
      setGrabTrackingInfo(null);
      apiClient<any>('/shipping/track-grab', {
        method: 'POST',
        body: { trackingUrl: shipment.trackingUrl },
        token,
      })
        .then((res) => {
          const data = res.data;
          setGrabTrackingInfo(data);
          if (data?.status && data.status !== shipment.status) {
            const updateBody: any = { status: data.status };
            apiClient(`/shipping/${shipment.id}`, { method: 'PUT', body: updateBody, token })
              .then(() => {
                showToast(
                  `Grab: ${carrierStatusLabels[crr]?.[data.status] || data.status} — tự động cập nhật`,
                );
              })
              .catch(() => {});
          }
        })
        .catch(() => {
          setGrabTrackingInfo(null);
        })
        .finally(() => setSpxRecordsLoading(false));
    } else {
      setSpxRecords([]);
      setSpxRecordsLoading(false);
      setGrabTrackingInfo(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, shipment]);

  const carrier = getCarrier(shipment);
  const isAnim = updatingShipments.has(shipment.id);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
            <FlaticonIcon name="truck-side" size="sm" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">#{shipment.orderId}</h2>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${statusBgs[shipment.status] || 'bg-gray-100 text-gray-600'}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${statusColors[shipment.status] || 'bg-gray-400'}`}
                />
                {getStatusLabel(carrier, shipment.status)}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {shipment.deliveryType}
              {(() => {
                const dc = carrierConfig[carrier];
                return dc ? ` · ${dc.label}` : '';
              })()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <FlaticonIcon name="circle-xmark" size="sm" />
          </button>
        </div>

        {/* Shipping failed warning banner */}
        {shipment.status === 'Failed' && (
          <div className="mx-5 mt-5 p-3.5 rounded-xl bg-red-50 border-2 border-red-300 shadow-sm animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 border border-red-300 flex items-center justify-center shrink-0">
                <FlaticonIcon name="triangle-warning" size="sm" className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-800">Vận chuyển thất bại!</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Đơn giao hàng không thành công. Xóa đơn cũ và tạo đơn giao mới.{' '}
                  <a href={`/orders`} className="font-semibold underline hover:text-red-700">
                    Quay lại đơn hàng
                  </a>
                  .
                </p>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-red-500">
                  <span className="inline-flex items-center gap-1">
                    <FlaticonIcon name="clock" size="xs" /> Trạng thái:{' '}
                    <strong>{getStatusLabel(carrier, shipment.status)}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-5 space-y-5">
          {/* Progress */}
          <div className="flex justify-center py-3">
            <DotProgress status={shipment.status} isFailed={shipment.status === 'Failed'} />
          </div>

          {/* Timeline */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              {carrier === 'SPX' && shipment.trackingNumber
                ? 'Lịch sử vận đơn SPX'
                : carrier === 'Grab' && shipment.trackingUrl
                  ? 'Thông tin Grab'
                  : 'Dòng thời gian'}
            </h3>
            <div className="space-y-2">
              {carrier === 'SPX' && shipment.trackingNumber ? (
                spxRecordsLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <span className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
                    <span className="text-xs text-gray-400">Đang tải...</span>
                  </div>
                ) : spxRecords.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
                    <div className="space-y-3">
                      {spxRecords.map((rec, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div
                            className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 z-10 relative ${
                              i === 0
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-white border-2 border-gray-200 text-gray-400'
                            }`}
                          >
                            {i === 0 ? (
                              <FlaticonIcon name="badge-check" size="xs" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-gray-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-xs font-medium text-gray-700">{rec.name}</p>
                            {rec.timestamp && (
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {formatDateTime(rec.timestamp)}
                              </p>
                            )}
                            {rec.description && (
                              <p className="text-[10px] text-gray-500 mt-0.5">{rec.description}</p>
                            )}
                            {rec.location && (
                              <p className="text-[10px] text-blue-400 mt-0.5">
                                <FlaticonIcon
                                  name="map-pin"
                                  size="xs"
                                  className="inline-flex mr-0.5"
                                />
                                {rec.location}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-2">
                    <FlaticonIcon name="circle-exclamation" size="sm" className="text-gray-300" />
                    <span className="text-xs text-gray-400">Chưa có dữ liệu vận đơn</span>
                  </div>
                )
              ) : carrier === 'Grab' && shipment.trackingUrl ? (
                spxRecordsLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <span className="w-4 h-4 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="text-xs text-gray-400">Đang tra cứu Grab...</span>
                  </div>
                ) : grabTrackingInfo ? (
                  <div className="space-y-3">
                    {grabTrackingInfo.statusText && (
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 ${
                            grabTrackingInfo.status === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-600'
                              : grabTrackingInfo.status === 'Failed'
                                ? 'bg-red-100 text-red-500'
                                : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          <FlaticonIcon
                            name={
                              grabTrackingInfo.status === 'Delivered'
                                ? 'badge-check'
                                : grabTrackingInfo.status === 'Failed'
                                  ? 'circle-xmark'
                                  : 'truck-moving'
                            }
                            size="xs"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-700">
                            {grabTrackingInfo.statusText}
                          </p>
                          {grabTrackingInfo.timestamp && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              <FlaticonIcon name="clock" size="xs" className="inline-flex mr-0.5" />
                              {grabTrackingInfo.timestamp}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {grabTrackingInfo.pickupAddress && (
                      <div className="flex items-start gap-2.5">
                        <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 bg-amber-100 text-amber-600">
                          <FlaticonIcon name="store" size="xs" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium text-gray-400 uppercase">
                            Lấy hàng từ
                          </p>
                          <p className="text-xs text-gray-700 mt-0.5">
                            {grabTrackingInfo.pickupAddress}
                          </p>
                        </div>
                      </div>
                    )}
                    {grabTrackingInfo.deliveryAddress && (
                      <div className="flex items-start gap-2.5">
                        <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-600">
                          <FlaticonIcon name="marker" size="xs" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium text-gray-400 uppercase">
                            Giao đến
                          </p>
                          <p className="text-xs text-gray-700 mt-0.5">
                            {grabTrackingInfo.deliveryAddress}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 border-t border-gray-200/60 mt-1">
                      {grabTrackingInfo.serviceType && (
                        <div className="flex items-center gap-1.5">
                          <FlaticonIcon
                            name={
                              grabTrackingInfo.serviceType === 'BIKE'
                                ? 'motorcycle'
                                : grabTrackingInfo.serviceType === 'CAR'
                                  ? 'car-side'
                                  : 'truck-side'
                            }
                            size="xs"
                            className="text-gray-400"
                          />
                          <span className="text-[10px] font-medium text-gray-500">
                            {grabTrackingInfo.serviceType === 'BIKE'
                              ? 'Xe máy'
                              : grabTrackingInfo.serviceType === 'CAR'
                                ? 'Ô tô'
                                : grabTrackingInfo.serviceType}
                          </span>
                        </div>
                      )}
                      {grabTrackingInfo.scheduleFrom && (
                        <div className="flex items-center gap-1.5">
                          <FlaticonIcon name="clock" size="xs" className="text-gray-400" />
                          <span className="text-[10px] text-gray-500">
                            {grabTrackingInfo.scheduleFrom}
                            {grabTrackingInfo.scheduleTo ? ` - ${grabTrackingInfo.scheduleTo}` : ''}
                          </span>
                        </div>
                      )}
                      {grabTrackingInfo.orderBookingCode && (
                        <div className="flex items-center gap-1.5">
                          <FlaticonIcon name="tag" size="xs" className="text-gray-400" />
                          <span className="text-[10px] font-mono text-gray-500">
                            {grabTrackingInfo.orderBookingCode}
                          </span>
                        </div>
                      )}
                    </div>
                    {grabTrackingInfo.reachable === false && (
                      <p className="text-[10px] text-gray-400 italic">Không thể kết nối tới Grab</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-2">
                    <FlaticonIcon name="circle-exclamation" size="sm" className="text-gray-300" />
                    <span className="text-xs text-gray-400">Đang tải thông tin Grab...</span>
                  </div>
                )
              ) : (
                (() => {
                  const statusIdx = statusFlow.indexOf(shipment.status);
                  const timelineSteps = [
                    { label: 'Chờ lấy hàng', icon: 'clock', date: shipment.createdAt, stepIdx: 0 },
                    {
                      label: 'Đã lấy hàng',
                      icon: 'box-open',
                      date: shipment.shippedAt,
                      stepIdx: 1,
                    },
                    {
                      label: 'Đang giao',
                      icon: 'truck-moving',
                      date: shipment.shippedAt,
                      stepIdx: 2,
                    },
                    {
                      label: 'Đã giao hàng',
                      icon: 'badge-check',
                      date: shipment.deliveredAt,
                      stepIdx: 3,
                    },
                  ];
                  return timelineSteps.map((item, i) => {
                    const isDone = statusIdx >= item.stepIdx && !shipment.status.includes('Failed');
                    const dateStr = item.date ? formatDateTime(item.date) : null;
                    return (
                      <div key={i} className="flex items-center gap-2.5">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}
                        >
                          <FlaticonIcon name={item.icon} size="xs" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-medium ${isDone ? 'text-gray-700' : 'text-gray-400'}`}
                          >
                            {item.label}
                          </p>
                          <p className="text-[10px] text-gray-400">{dateStr || '—'}</p>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>

          {/* Tracking details */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Thông tin giao hàng
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-gray-400 font-medium">Hãng vận chuyển</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <CarrierLogo carrier={carrier} size="xs" />
                  <span className="text-xs font-medium text-gray-700">
                    {carrierConfig[carrier]?.label || carrier}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium">Phí giao hàng</p>
                <p className="text-xs font-bold text-gray-800 mt-1">
                  {formatCurrency(Number(shipment.cost))}
                </p>
                {shipment.deliveredAt && (
                  <p className="text-[10px] text-emerald-500 font-medium">
                    <FlaticonIcon name="badge-check" size="xs" className="inline-flex mr-0.5" />
                    Đã thanh toán
                  </p>
                )}
              </div>
              {shipment.trackingNumber && (
                <div className="col-span-2">
                  <p className="text-[10px] text-gray-400 font-medium">Mã vận đơn</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="font-mono text-xs text-gray-700">
                      {shipment.trackingNumber}
                    </span>
                    <button
                      onClick={() => copyToClipboard(shipment.trackingNumber!)}
                      className="copy-btn"
                    >
                      <FlaticonIcon name="clipboard" size="xs" />
                    </button>
                  </div>
                </div>
              )}
              {shipment.eta && (
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">ETA</p>
                  <p className="text-xs text-gray-700 mt-1">{formatDateTime(shipment.eta)}</p>
                </div>
              )}
              {carrier === 'SOF' && (shipment.driverName || shipment.driverPhone) && (
                <div className="col-span-2">
                  <p className="text-[10px] text-gray-400 font-medium">Tài xế</p>
                  <div className="flex items-center gap-2 mt-1">
                    {shipment.driverName && (
                      <span className="text-xs text-gray-700">
                        <FlaticonIcon name="user" size="xs" className="inline-flex mr-1" />
                        {shipment.driverName}
                      </span>
                    )}
                    {shipment.driverPhone && (
                      <a
                        href={`tel:${shipment.driverPhone}`}
                        className="text-xs text-blue-600 font-medium hover:underline inline-flex items-center gap-1"
                      >
                        <FlaticonIcon name="phone" size="xs" />
                        {shipment.driverPhone}
                      </a>
                    )}
                  </div>
                </div>
              )}
              {carrier === 'Grab' && shipment.trackingUrl && (
                <div className="col-span-2">
                  <p className="text-[10px] text-gray-400 font-medium">Link tracking</p>
                  <button
                    onClick={() =>
                      window.open(shipment.trackingUrl!, '_blank', 'noopener,noreferrer')
                    }
                    className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium hover:bg-emerald-100 hover:border-emerald-300 transition-colors"
                  >
                    <FlaticonIcon name="external-link" size="xs" />
                    Mở tracking Grab
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {(() => {
              const act = nextActions[shipment.status];
              const crr = carrier;
              return (
                <>
                  {act && (
                    <button
                      onClick={async () => {
                        await onUpdateStatus(shipment.id, act.status);
                        onClose();
                      }}
                      disabled={isAnim}
                      className={`btn-sm ${act.btn} disabled:opacity-50`}
                    >
                      {isAnim ? (
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <FlaticonIcon name="chevron-right" size="xs" /> {act.label}
                        </>
                      )}
                    </button>
                  )}
                  {shipment.status === 'InTransit' && (
                    <button
                      onClick={async () => {
                        await onUpdateStatus(shipment.id, 'Failed');
                        onClose();
                      }}
                      disabled={isAnim}
                      className="btn-sm btn-danger disabled:opacity-50"
                    >
                      <FlaticonIcon name="circle-xmark" size="xs" /> Thất bại
                    </button>
                  )}
                  {crr === 'SPX' && shipment.trackingNumber && (
                    <button
                      onClick={async () => {
                        await onUpdateSpx(shipment);
                        onClose();
                      }}
                      disabled={spxUpdating === shipment.id}
                      className="btn-sm btn-ghost disabled:opacity-50"
                      title="Cập nhật từ SPX"
                    >
                      {spxUpdating === shipment.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                      ) : (
                        <>
                          <FlaticonIcon name="refresh" size="xs" /> Cập nhật SPX
                        </>
                      )}
                    </button>
                  )}
                  {crr === 'Grab' && shipment.trackingUrl && (
                    <button
                      onClick={async () => {
                        await onUpdateGrab(shipment);
                        onClose();
                      }}
                      disabled={grabUpdating === shipment.id}
                      className="btn-sm btn-ghost disabled:opacity-50"
                      title="Cập nhật từ Grab"
                    >
                      {grabUpdating === shipment.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
                      ) : (
                        <>
                          <FlaticonIcon name="refresh" size="xs" /> Cập nhật Grab
                        </>
                      )}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
