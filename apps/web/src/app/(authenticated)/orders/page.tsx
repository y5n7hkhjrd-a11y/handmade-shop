'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@handmade-shop/shared';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { SkeletonRow } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import Pagination from '@/components/Pagination';
import ConfirmModal from '@/components/ConfirmModal';
import { copyToClipboard } from '@/lib/clipboard';

const statusFlow = [
  'Draft',
  'WaitingConfirm',
  'InProgress',
  'Packaging',
  'ReadyToShip',
  'Completed',
];
const statusColors: Record<string, string> = {
  Draft: 'badge-gray',
  WaitingConfirm: 'badge-yellow',
  InProgress: 'badge-blue',
  Packaging: 'badge-pink',
  ReadyToShip: 'badge-green',
  Completed: 'badge-green',
};
const statusIcons: Record<string, string> = {
  Draft: '📝',
  WaitingConfirm: '⏳',
  InProgress: '🔧',
  Packaging: '🎁',
  ReadyToShip: '📬',
  Completed: '✅',
};
const statusLabels: Record<string, string> = {
  Draft: 'Nhập đơn',
  WaitingConfirm: 'Đơn chờ làm',
  InProgress: 'Đơn đã xong',
  Packaging: 'Đơn đã gói',
  ReadyToShip: 'Đã gửi',
  Completed: 'Hoàn thành',
};
const filterChipActiveColors: Record<string, string> = {
  Draft: '!bg-gray-100 !border-gray-300 !text-gray-700 !shadow-sm',
  WaitingConfirm: '!bg-amber-50 !border-amber-300 !text-amber-700 !shadow-sm',
  InProgress: '!bg-blue-50 !border-blue-300 !text-blue-700 !shadow-sm',
  Packaging: '!bg-pink-50 !border-pink-300 !text-pink-700 !shadow-sm',
  ReadyToShip: '!bg-emerald-50 !border-emerald-300 !text-emerald-700 !shadow-sm',
  Completed: '!bg-green-50 !border-green-300 !text-green-700 !shadow-sm',
};
const filterChipHoverColors: Record<string, string> = {
  Draft: 'hover:!border-gray-200 hover:!text-gray-600 hover:!bg-gray-100/50',
  WaitingConfirm: 'hover:!border-amber-200 hover:!text-amber-600 hover:!bg-amber-50/50',
  InProgress: 'hover:!border-blue-200 hover:!text-blue-600 hover:!bg-blue-50/50',
  Packaging: 'hover:!border-pink-200 hover:!text-pink-600 hover:!bg-pink-50/50',
  ReadyToShip: 'hover:!border-emerald-200 hover:!text-emerald-600 hover:!bg-emerald-50/50',
  Completed: 'hover:!border-green-200 hover:!text-green-600 hover:!bg-green-50/50',
};
const NEXT_STATUS: Record<string, string> = {
  Draft: 'WaitingConfirm',
  WaitingConfirm: 'InProgress',
  InProgress: 'Packaging',
  Packaging: 'ReadyToShip',
  ReadyToShip: 'Completed',
};
const PREV_STATUS: Record<string, string> = {
  WaitingConfirm: 'Draft',
  InProgress: 'WaitingConfirm',
  Packaging: 'InProgress',
  ReadyToShip: 'Packaging',
  Completed: 'ReadyToShip',
};

function OrderTimeline({ currentStatus }: { currentStatus: string }) {
  const idx = statusFlow.indexOf(currentStatus);
  return (
    <div className="flex items-center gap-0 py-4 px-2">
      {statusFlow.map((s, i) => (
        <div key={s} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`relative w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-500 ${
                i <= idx ? 'bg-[#E88DAB] text-white shadow-sm' : 'bg-[#F0ECEE] text-[#C8C0C4]'
              }`}
            >
              {i < idx ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-[10px] mt-1.5 whitespace-nowrap font-medium transition-all duration-300 ${
                i <= idx ? 'text-[#D97D9E]' : 'text-[#C8C0C4]'
              }`}
            >
              {statusLabels[s] || s.replace(/([A-Z])/g, ' $1').trim()}
            </span>
          </div>
          {i < statusFlow.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-1 mb-5 transition-all duration-500 ${
                i < idx ? 'bg-[#E88DAB]' : 'bg-[#F0ECEE]'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function OrderDetail({
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
  const [showConfirmReturn, setShowConfirmReturn] = useState(false);
  const [returnLabel, setReturnLabel] = useState('');
  const mousedownOnContent = useRef(false);
  const handleAdvance = async () => {
    if (!token || !NEXT_STATUS[order.status]) return;
    try {
      await apiClient(`/orders/${order.id}/status`, {
        method: 'PATCH',
        body: { status: NEXT_STATUS[order.status] },
        token,
      });
      onStatusChange();
    } catch (e: any) {
      console.error(e);
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
    if (!token) return;
    try {
      await apiClient(`/orders/${order.id}/status`, {
        method: 'PATCH',
        body: { status: PREV_STATUS[order.status] },
        token,
      });
      const targetIsDraft = PREV_STATUS[order.status] === 'Draft';
      onStatusChange(targetIsDraft);
      onClose();
    } catch (e: any) {
      console.error(e);
    }
  };
  const itemTotal =
    order.items?.reduce((sum: number, i: any) => sum + Number(i.totalPrice), 0) || 0;
  const packagingTotal =
    order.items?.reduce((sum: number, i: any) => sum + Number(i.packagingCost || 0), 0) || 0;
  const computedTotalCost =
    itemTotal + Number(order.packagingCost || 0) + Number(order.shippingCost || 0);
  const salePriceTotal =
    Number(order.subtotal || 0) -
    Number(order.discount || 0) +
    Number(order.packagingCost || 0) +
    Number(order.shippingCost || 0);
  const profit = Number(order.subtotal || 0) - Number(order.discount || 0) - computedTotalCost;

  return (
    <div
      className="modal-overlay"
      onClick={() => {
        if (!mousedownOnContent.current) onClose();
        mousedownOnContent.current = false;
      }}
      onMouseDown={() => {
        mousedownOnContent.current = false;
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-content max-w-2xl"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={() => {
          mousedownOnContent.current = true;
        }}
      >
        {/* Accent bar for Đơn chờ làm */}
        {order.status === 'WaitingConfirm' && (
          <div className="h-1 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 rounded-t-xl" />
        )}
        <div className="p-6 border-b flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              {statusIcons[order.status] || '📋'} Chi tiết đơn hàng
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500 font-mono">{order.id.slice(0, 8)}...</span>
              <button
                onClick={() => {
                  copyToClipboard(order.id);
                }}
                className="copy-btn"
                title="Sao chép mã đơn hàng"
              >
                📋 <span className="copy-icon">Sao chép</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {PREV_STATUS[order.status] && (
              <button
                onClick={handleReturn}
                className="btn-ghost border border-gray-200 group text-sm"
              >
                <span className="mr-1 group-hover:-translate-x-0.5 transition-transform">←</span>
                <span className="hidden sm:inline">
                  {statusLabels[PREV_STATUS[order.status]] ||
                    PREV_STATUS[order.status].replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </button>
            )}
            {NEXT_STATUS[order.status] && (
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

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500">Khách hàng</span>
              <p className="font-medium text-gray-900 mt-0.5">{order.customer?.name || 'N/A'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500">Trạng thái</span>
              <p className="mt-0.5">
                <span className={statusColors[order.status]}>
                  {statusIcons[order.status]} {order.status}
                </span>
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500">Ngày đặt</span>
              <p className="font-medium text-gray-900 mt-0.5 text-sm">
                {formatDateTime(order.orderDate)}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500">Tổng cộng</span>
              <p className="font-bold text-lg text-purple-600 mt-0.5">
                {formatCurrency(salePriceTotal)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                (đã gồm{' '}
                {formatCurrency(Number(order.packagingCost || 0) + Number(order.shippingCost || 0))}{' '}
                phí)
              </p>
            </div>
          </div>

          {/* Payment status */}
          {(() => {
            const paid = Number(order.paidAmount) || 0;
            const remaining = salePriceTotal - paid;
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
                    {isFullyPaid
                      ? '✅ Đã thanh toán'
                      : isPartiallyPaid
                        ? '⏳ Thanh toán một phần'
                        : '❌ Chưa thanh toán'}
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
                    💵 Đã thanh toán:{' '}
                    <strong className={isFullyPaid ? 'text-emerald-600' : ''}>
                      {formatCurrency(paid)}
                    </strong>
                  </span>
                  <span>
                    Tổng cộng: <strong>{formatCurrency(salePriceTotal)}</strong>
                  </span>
                </div>
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
                <span>📝 Ghi chú</span>
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
                <span>📋 Sản phẩm & Giá bán</span>
                <span className="badge-gray text-xs">{order.orderLines.length} sản phẩm</span>
              </h3>
              {order.orderLines.map((ol: any, i: number) => (
                <div
                  key={ol.id || i}
                  className="flex flex-col p-3 bg-purple-50 rounded-xl border border-purple-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{ol.type === 'RECIPE' ? '📋' : '📦'}</span>
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
                      <p className="font-bold text-purple-600">
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
            <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <div>
                    <h3 className="text-sm font-semibold text-purple-700">{order.recipe.name}</h3>
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
                <p className="font-bold text-purple-600 text-lg flex-shrink-0 ml-3">
                  {formatCurrency(Number(order.salePriceSnapshot || order.totalCost))}
                </p>
              </div>
            </div>
          )}

          {/* Cost breakdown */}
          <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Chi tiết chi phí</h3>
            <div className="space-y-2">
              <div className="detail-row py-1.5">
                <span className="detail-label">
                  💎 Giá vốn nguyên liệu ({order.items?.length || 0} sản phẩm)
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
                <span className="detail-value">{formatCurrency(Number(order.shippingCost))}</span>
              </div>
              <div className="detail-row py-2 border-t-2 border-gray-200">
                <span className="text-sm font-semibold text-gray-800">Tổng chi phí</span>
                <span className="text-base font-bold text-purple-600">
                  {formatCurrency(computedTotalCost)}
                </span>
              </div>
            </div>

            {/* Snapshot - captured when order was confirmed */}
            {order.confirmedAt && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    📸 Snapshot
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
                    <span className="text-gray-500 font-medium">💵 Lợi nhuận (snapshot)</span>
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
                        📋 Công thức: {order.recipeSnapshot.name}
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

        <div className="p-6 border-t flex justify-between items-center">
          <div className="text-xs text-gray-400">
            {order.confirmedAt && <span>Confirmed: {formatDateTime(order.confirmedAt)}</span>}
            {order.completedAt && (
              <span className="ml-4">Completed: {formatDateTime(order.completedAt)}</span>
            )}
          </div>
          <button onClick={onClose} className="btn-secondary">
            Đóng
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmReturn}
        onClose={() => setShowConfirmReturn(false)}
        onConfirm={doReturn}
        title="Quay lại trạng thái"
        message={`Bạn có chắc muốn quay lại trạng thái "${returnLabel}"?`}
        confirmLabel="Xác nhận"
        variant="primary"
      />
    </div>
  );
}

export default function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    notes: '',
    paidAmount: 0,
    orderLines: [] as Array<{
      type: 'RECIPE' | 'PRODUCT';
      recipeId: string;
      customInput: string;
      salePrice: number;
      productId: string;
      quantity: number;
      unitPrice: number;
      notes: string;
    }>,
  });
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [matchingRules, setMatchingRules] = useState<any[]>([]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const { toast, showToast } = useToast();

  const loadCounts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiClient<any>('/orders/counts', { token });
      if (res.data) setStatusCounts(res.data);
    } catch {
      /* ignore */
    }
  }, [token]);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient<any>(`/orders?${new URLSearchParams(params).toString()}`, {
        token,
      });
      setOrders(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (e: any) {
      showToast(e.message || 'Failed', 'error');
    }
    setLoading(false);
  }, [token, page, statusFilter, showToast]);

  useEffect(() => {
    loadOrders();
    loadCounts();
    if (token) {
      apiClient('/customers?limit=100', { token })
        .then((r: any) => setCustomers(r.data || []))
        .catch(() => {});
      apiClient('/products?limit=100', { token })
        .then((r: any) => setProducts(r.data || []))
        .catch(() => {});
      apiClient('/recipes?limit=100', { token })
        .then((r: any) => setRecipes(r.data || []))
        .catch(() => {});
      apiClient('/matching-rules/all', { token })
        .then((r: any) => setMatchingRules(r.data || []))
        .catch(() => {});
    }
  }, [loadOrders, token]);

  // Helper: count matching chars using a regex pattern (mirrors backend costEngineService)
  function countMatchingChars(input: string, pattern: string): number {
    try {
      const regex = new RegExp(pattern, 'g');
      const matches = input.match(regex);
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }

  // Compute cost preview for a single RECIPE line
  const getRecipeLineCost = (line: { recipeId: string; customInput: string }) => {
    const recipe = recipes.find((r: any) => r.id === line.recipeId);
    if (!recipe) return null;
    const recipeProducts = (recipe as any).recipeProducts || [];
    let materialCost = 0;
    const items = recipeProducts.map((rp: any) => {
      const product = rp.product;
      if (!product) return { ...rp, estimatedCost: 0, matchCount: 0 };
      let cost: number;
      let matchCount = 0;
      if (product.type === 'BASE') {
        cost = Number(product.cost) * rp.quantity;
      } else {
        if (rp.matchingRuleId) {
          const rule = matchingRules.find((mr: any) => mr.id === rp.matchingRuleId);
          if (rule && rule.pattern) {
            matchCount = countMatchingChars(line.customInput, rule.pattern);
          }
        }
        cost = matchCount * Number(product.cost) * rp.quantity;
      }
      materialCost += cost;
      return { ...rp, estimatedCost: cost, matchCount };
    });
    return { materialCost, items };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!form.customerId) {
      setFormErrors({ customerId: 'Vui lòng chọn khách hàng' });
      return;
    }
    if (form.orderLines.length === 0) {
      setFormErrors({ orderLines: 'Vui lòng thêm ít nhất một dòng sản phẩm hoặc công thức' });
      return;
    }
    // Validate each line has required fields
    for (let i = 0; i < form.orderLines.length; i++) {
      const line = form.orderLines[i]!;
      if (line.type === 'RECIPE') {
        if (!line.recipeId) {
          setFormErrors({ [`line_${i}`]: 'Vui lòng chọn công thức' });
          return;
        }
        if (!line.customInput) {
          setFormErrors({ [`line_${i}`]: 'Vui lòng nhập custom input cho công thức' });
          return;
        }
        if (!line.salePrice || Number(line.salePrice) <= 0) {
          setFormErrors({ [`line_${i}`]: 'Vui lòng nhập giá bán cho công thức' });
          return;
        }
      }
      if (line.type === 'PRODUCT' && !line.productId) {
        setFormErrors({ [`line_${i}`]: 'Vui lòng chọn sản phẩm' });
        return;
      }
    }
    try {
      const body = {
        notes: form.notes || undefined,
        paidAmount: form.paidAmount || 0,
        orderLines: form.orderLines.map((line) => {
          if (line.type === 'RECIPE') {
            return {
              type: 'RECIPE',
              recipeId: line.recipeId,
              customInput: line.customInput,
              salePrice: Number(line.salePrice) || 0,
              quantity: line.quantity || 1,
              notes: line.notes || undefined,
            };
          }
          return {
            type: 'PRODUCT',
            productId: line.productId,
            quantity: line.quantity || 1,
            unitPrice: Number(line.unitPrice) || 0,
            notes: line.notes || undefined,
          };
        }),
      };

      if (editingOrderId) {
        await apiClient(`/orders/${editingOrderId}/lines`, { method: 'PUT', body, token });
        showToast('Đã lưu thay đổi');
        // Advance after save if requested
        if (advanceAfterSave.current) {
          advanceAfterSave.current = false;
          const orderId = editingOrderId;
          try {
            await apiClient(`/orders/${orderId}/status`, {
              method: 'PATCH',
              body: { status: NEXT_STATUS['Draft'] },
              token,
            });
            showToast('Đã xác nhận đơn hàng');
          } catch (e: any) {
            showToast(e.message || 'Xác nhận thất bại', 'error');
          }
        }
      } else {
        await apiClient('/orders', {
          method: 'POST',
          body: { ...body, customerId: form.customerId },
          token,
        });
        showToast('Đã tạo đơn hàng');
      }

      setShowForm(false);
      setEditingOrderId(null);
      setForm({ customerId: '', notes: '', paidAmount: 0, orderLines: [] });
      setFormErrors({});
      loadOrders();
      loadCounts();
    } catch (e: any) {
      showToast(e.message || 'Thao tác thất bại', 'error');
    }
  };

  const [confirmReturn, setConfirmReturn] = useState<{
    id: string;
    status: string;
    label: string;
  } | null>(null);
  const formMousedownOnContent = useRef(false);
  const advanceAfterSave = useRef(false);

  const advanceOrder = async (id: string, status: string, isReturn = false) => {
    if (!token) return;
    const label = statusLabels[status] || status.replace(/([A-Z])/g, ' $1').trim();
    if (isReturn) {
      setConfirmReturn({ id, status, label });
      return;
    }
    try {
      await apiClient(`/orders/${id}/status`, { method: 'PATCH', body: { status }, token });
      showToast(`Đã chuyển sang ${label}`);
      loadOrders();
      loadCounts();
    } catch (e: any) {
      showToast(e.message || 'Cập nhật thất bại', 'error');
    }
  };

  // Stats (use fetched counts, fall back to local page counts)
  const localCounts = statusFlow.reduce(
    (acc, s) => ({ ...acc, [s]: orders.filter((o: any) => o.status === s).length }),
    {} as Record<string, number>,
  );
  const effectiveCounts = Object.keys(statusCounts).length > 0 ? statusCounts : localCounts;

  return (
    <div className="page-enter">
      <Toast toast={toast} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Đơn hàng</h1>
          <p className="text-gray-500 mt-1 text-sm">Theo dõi đơn hàng trong quy trình sản xuất</p>
        </div>
        <button
          onClick={() => {
            setForm({ customerId: '', notes: '', paidAmount: 0, orderLines: [] });
            setShowForm(true);
            setEditingOrderId(null);
            setFormErrors({});
          }}
          className="btn-primary"
        >
          + Đơn hàng mới
        </button>
      </div>

      {/* Status summary chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => {
            setStatusFilter('');
            setPage(1);
          }}
          className={`filter-chip ${!statusFilter ? 'filter-chip-active' : ''}`}
        >
          Tất cả <span className="text-gray-400 ml-1">({orders.length})</span>
        </button>
        {statusFlow.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`filter-chip ${statusFilter === s ? 'filter-chip-active' : ''} ${
              statusFilter === s && filterChipActiveColors[s]
                ? filterChipActiveColors[s]
                : filterChipHoverColors[s] || ''
            }`}
          >
            <span>{statusIcons[s]}</span>
            <span>{statusLabels[s] || s.replace(/([A-Z])/g, ' $1').trim()}</span>
            <span className="text-gray-400 ml-1">({effectiveCounts[s] || 0})</span>
          </button>
        ))}
      </div>

      {/* Create Order Modal */}
      {showForm && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!formMousedownOnContent.current) {
              setShowForm(false);
              setEditingOrderId(null);
            }
            formMousedownOnContent.current = false;
          }}
          onMouseDown={() => {
            formMousedownOnContent.current = false;
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-content max-w-2xl"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={() => {
              formMousedownOnContent.current = true;
            }}
          >
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {editingOrderId ? 'Chỉnh sửa đơn hàng' : 'Đơn hàng mới'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editingOrderId
                    ? 'Điều chỉnh sản phẩm và thông tin đơn hàng'
                    : 'Tạo đơn hàng mới cho khách — mỗi dòng có thể là sản phẩm hoặc công thức'}
                </p>
              </div>
              {editingOrderId && (
                <button
                  type="button"
                  onClick={() => {
                    advanceAfterSave.current = true;
                    const form = document.querySelector('form');
                    if (form) form.requestSubmit();
                  }}
                  className="btn-success"
                >
                  Xác nhận →
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label label-required">Khách hàng</label>
                  <select
                    className={`input ${formErrors.customerId ? 'input-error' : ''}`}
                    value={form.customerId}
                    onChange={(e) => {
                      setForm({ ...form, customerId: e.target.value });
                      setFormErrors({});
                    }}
                    disabled={!!editingOrderId}
                    autoFocus
                  >
                    <option value="">Chọn khách hàng...</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.email ? `— ${c.email}` : ''}
                      </option>
                    ))}
                  </select>
                  {formErrors.customerId && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.customerId}</p>
                  )}
                </div>
                <div>
                  <label className="label">
                    Số tiền đã thanh toán <span className="text-gray-400 font-normal">(VNĐ)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
                      đ
                    </span>
                    <input
                      className="input text-sm pl-5"
                      type="number"
                      min={0}
                      step={1000}
                      value={form.paidAmount}
                      onChange={(e) => setForm({ ...form, paidAmount: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Order Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label label-required mb-0">Sản phẩm / Công thức</label>
                  <span className="text-[10px] text-gray-400">{form.orderLines.length} dòng</span>
                </div>

                {form.orderLines.length === 0 && (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <p className="text-xs text-gray-400 mb-3">Chưa có dòng nào</p>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          orderLines: [
                            ...form.orderLines,
                            {
                              type: 'PRODUCT',
                              productId: '',
                              quantity: 1,
                              unitPrice: 0,
                              recipeId: '',
                              customInput: '',
                              salePrice: 0,
                              notes: '',
                            },
                          ],
                        })
                      }
                      className="btn-primary btn-sm"
                    >
                      + Thêm sản phẩm
                    </button>
                  </div>
                )}

                {form.orderLines.map((line, idx) => {
                  const isRecipe = line.type === 'RECIPE';
                  const recipeCost = isRecipe ? getRecipeLineCost(line as any) : null;
                  return (
                    <div
                      key={idx}
                      className="border rounded-xl p-4 mb-3 bg-white shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                            Dòng {idx + 1}
                          </span>
                          <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
                            <button
                              type="button"
                              onClick={() => {
                                const lines = [...form.orderLines];
                                lines[idx] = {
                                  type: 'RECIPE',
                                  recipeId: '',
                                  customInput: '',
                                  salePrice: 0,
                                  quantity: 1,
                                  productId: '',
                                  unitPrice: 0,
                                  notes: '',
                                };
                                setForm({ ...form, orderLines: lines });
                              }}
                              className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${isRecipe ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}
                            >
                              📋 Công thức
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const lines = [...form.orderLines];
                                lines[idx] = {
                                  type: 'PRODUCT',
                                  productId: '',
                                  quantity: 1,
                                  unitPrice: 0,
                                  recipeId: '',
                                  customInput: '',
                                  salePrice: 0,
                                  notes: '',
                                };
                                setForm({ ...form, orderLines: lines });
                              }}
                              className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${!isRecipe ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}
                            >
                              📦 Sản phẩm
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              orderLines: form.orderLines.filter((_, i) => i !== idx),
                            })
                          }
                          className="w-6 h-6 bg-red-50 text-red-400 rounded-lg flex items-center justify-center text-[10px] hover:bg-red-100 hover:text-red-600 transition-all"
                          aria-label="Xóa dòng"
                        >
                          ✕
                        </button>
                      </div>

                      {isRecipe ? (
                        <div className="space-y-3">
                          <div>
                            <select
                              className={`input text-sm ${formErrors[`line_${idx}`] ? 'input-error' : ''}`}
                              value={line.recipeId}
                              onChange={(e) => {
                                const lines = [...form.orderLines];
                                const selectedRecipe = recipes.find(
                                  (r: any) => r.id === e.target.value,
                                );
                                lines[idx] = {
                                  ...lines[idx]!,
                                  recipeId: e.target.value,
                                  salePrice: 0,
                                };
                                setForm({ ...form, orderLines: lines });
                                setFormErrors({});
                              }}
                            >
                              <option value="">Chọn công thức...</option>
                              {recipes.map((r: any) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {line.recipeId && (
                            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                              <div className="space-y-1.5 text-xs">
                                {(
                                  (recipes.find((r: any) => r.id === line.recipeId) as any)
                                    ?.recipeProducts || []
                                ).map((rp: any) => {
                                  const costItem = recipeCost?.items?.find(
                                    (ci: any) => ci.productId === rp.productId,
                                  );
                                  const estimatedCost =
                                    costItem?.estimatedCost ??
                                    Number(rp.product?.cost || 0) * rp.quantity;
                                  return (
                                    <div key={rp.id} className="flex justify-between items-center">
                                      <div className="flex items-center gap-1.5">
                                        <span>{rp.product?.type === 'BASE' ? '🔷' : '✨'}</span>
                                        <span className="font-medium">{rp.product?.name}</span>
                                        <span className="text-gray-400">×{rp.quantity}</span>
                                        {costItem?.matchCount != null &&
                                          costItem.matchCount > 0 && (
                                            <span className="text-[10px] text-purple-500 bg-purple-50 px-1 py-0.5 rounded">
                                              {costItem.matchCount}ký tự
                                            </span>
                                          )}
                                      </div>
                                      <span className="font-semibold tabular-nums">
                                        {formatCurrency(estimatedCost)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              Custom Input <span className="text-gray-400">(VD: TANDAT__)</span>
                            </label>
                            <input
                              className="input text-sm font-mono"
                              value={line.customInput}
                              onChange={(e) => {
                                const lines = [...form.orderLines];
                                lines[idx] = {
                                  ...lines[idx]!,
                                  customInput: e.target.value.toUpperCase(),
                                };
                                setForm({ ...form, orderLines: lines });
                              }}
                              placeholder="Nhập chuỗi ký tự..."
                            />
                            {line.customInput && (
                              <div className="mt-1 flex flex-wrap gap-0.5">
                                {line.customInput.split('').map((char: string, i: number) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-mono bg-gray-100 rounded text-gray-600"
                                  >
                                    {char}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Số lượng</label>
                              <input
                                className="input text-sm"
                                type="number"
                                min={1}
                                value={line.quantity}
                                onChange={(e) => {
                                  const lines = [...form.orderLines];
                                  lines[idx] = {
                                    ...lines[idx]!,
                                    quantity: Math.max(1, Number(e.target.value)),
                                  };
                                  setForm({ ...form, orderLines: lines });
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">
                                Giá bán (VNĐ)
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
                                  đ
                                </span>
                                <input
                                  className="input text-sm pl-5"
                                  type="number"
                                  min={0}
                                  step={1000}
                                  value={line.salePrice}
                                  onChange={(e) => {
                                    const lines = [...form.orderLines];
                                    lines[idx] = {
                                      ...lines[idx]!,
                                      salePrice: Number(e.target.value),
                                    };
                                    setForm({ ...form, orderLines: lines });
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Recipe cost preview */}
                          {recipeCost && line.salePrice > 0 && (
                            <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">Giá vốn</span>
                                <span className="font-semibold">
                                  {formatCurrency(recipeCost.materialCost)}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Lợi nhuận</span>
                                <span
                                  className={`font-bold ${line.salePrice > recipeCost.materialCost ? 'text-emerald-600' : 'text-red-500'}`}
                                >
                                  {formatCurrency(line.salePrice - recipeCost.materialCost)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Per-line notes */}
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              Ghi chú{' '}
                              <span className="text-gray-400 font-normal">(không bắt buộc)</span>
                            </label>
                            <textarea
                              className="input text-sm"
                              rows={2}
                              value={line.notes}
                              onChange={(e) => {
                                const lines = [...form.orderLines];
                                lines[idx] = { ...lines[idx]!, notes: e.target.value };
                                setForm({ ...form, orderLines: lines });
                              }}
                              placeholder="Ghi chú cho sản phẩm này..."
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex gap-2 items-start">
                            <div className="flex-1">
                              <select
                                className={`input text-sm ${formErrors[`line_${idx}`] ? 'input-error' : ''}`}
                                value={line.productId}
                                onChange={(e) => {
                                  const lines = [...form.orderLines];
                                  const product = products.find(
                                    (p: any) => p.id === e.target.value,
                                  );
                                  const autoPrice = Number(product?.cost || 0);
                                  lines[idx] = {
                                    ...lines[idx]!,
                                    productId: e.target.value,
                                    unitPrice: lines[idx]!.unitPrice || autoPrice,
                                  };
                                  setForm({ ...form, orderLines: lines });
                                }}
                              >
                                <option value="">Chọn sản phẩm...</option>
                                {products.map((p: any) => (
                                  <option key={p.id} value={p.id}>
                                    {p.type === 'BASE' ? '🔷' : '✨'} {p.name} —{' '}
                                    {formatCurrency(Number(p.cost))}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="w-20">
                              <input
                                className="input text-sm"
                                type="number"
                                placeholder="SL"
                                min={1}
                                value={line.quantity}
                                onChange={(e) => {
                                  const lines = [...form.orderLines];
                                  lines[idx] = {
                                    ...lines[idx]!,
                                    quantity: Math.max(1, Number(e.target.value)),
                                  };
                                  setForm({ ...form, orderLines: lines });
                                }}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] text-gray-500 mb-1 block">
                                Đơn giá (VNĐ)
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
                                  đ
                                </span>
                                <input
                                  className="input text-sm pl-5"
                                  type="number"
                                  min={0}
                                  step={100}
                                  value={line.unitPrice}
                                  onChange={(e) => {
                                    const lines = [...form.orderLines];
                                    lines[idx] = {
                                      ...lines[idx]!,
                                      unitPrice: Number(e.target.value),
                                    };
                                    setForm({ ...form, orderLines: lines });
                                  }}
                                  placeholder="0"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[11px] text-gray-500 mb-1 block">
                                Thành tiền
                              </label>
                              <div className="h-[38px] flex items-center px-3 bg-gray-50 rounded-lg text-sm font-semibold text-gray-700 border border-gray-100">
                                {formatCurrency(
                                  (Number(line.unitPrice) || 0) * (line.quantity || 1),
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Per-line notes */}
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              Ghi chú{' '}
                              <span className="text-gray-400 font-normal">(không bắt buộc)</span>
                            </label>
                            <textarea
                              className="input text-sm"
                              rows={2}
                              value={line.notes}
                              onChange={(e) => {
                                const lines = [...form.orderLines];
                                lines[idx] = { ...lines[idx]!, notes: e.target.value };
                                setForm({ ...form, orderLines: lines });
                              }}
                              placeholder="Ghi chú cho sản phẩm này..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add line button */}
                {form.orderLines.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        orderLines: [
                          ...form.orderLines,
                          {
                            type: 'PRODUCT',
                            productId: '',
                            quantity: 1,
                            unitPrice: 0,
                            recipeId: '',
                            customInput: '',
                            salePrice: 0,
                            notes: '',
                          },
                        ],
                      })
                    }
                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50/50 transition-all"
                  >
                    + Thêm sản phẩm
                  </button>
                )}

                {formErrors.orderLines && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.orderLines}</p>
                )}
              </div>

              {/* Order total preview */}
              {(() => {
                let totalSalePrice = 0;
                form.orderLines.forEach((line) => {
                  if (line.type === 'RECIPE')
                    totalSalePrice += (Number(line.salePrice) || 0) * (line.quantity || 1);
                  else totalSalePrice += (Number(line.unitPrice) || 0) * (line.quantity || 1);
                });
                if (totalSalePrice <= 0) return null;
                return (
                  <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-50/30 rounded-xl border border-purple-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">
                        Tổng giá trị đơn hàng
                      </span>
                      <span className="text-lg font-bold text-purple-600">
                        {formatCurrency(totalSalePrice)}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {form.orderLines.filter((l) => l.type === 'RECIPE' && l.recipeId).length} công
                      thức,{' '}
                      {form.orderLines.filter((l) => l.type === 'PRODUCT' && l.productId).length}{' '}
                      sản phẩm
                    </p>
                  </div>
                );
              })()}

              <div>
                <label className="label">
                  Ghi chú <span className="text-gray-400 font-normal">(không bắt buộc)</span>
                </label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ghi chú hoặc yêu cầu đặc biệt"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingOrderId(null);
                  }}
                  className="btn-secondary"
                >
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  {editingOrderId ? 'Lưu thay đổi' : 'Tạo đơn hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Orders list */}
      {loading ? (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Trạng thái</th>
                  <th className="text-center">Loại</th>
                  <th className="text-right">SL</th>
                  <th className="text-right">Tổng</th>
                  <th>Ngày</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((i) => (
                  <SkeletonRow key={i} cols={7} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Trạng thái</th>
                  <th className="text-center">Loại</th>
                  <th className="text-right">SL</th>
                  <th className="text-right">Tổng</th>
                  <th>Ngày</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="cursor-pointer group"
                    onClick={() => {
                      if (order.status === 'Draft') {
                        const orderLines = (order.orderLines || []).map((ol: any) => ({
                          type: ol.type,
                          recipeId: ol.recipeId || '',
                          customInput: ol.customInput || '',
                          salePrice: Number(ol.salePrice || 0),
                          productId: ol.productId || '',
                          quantity: ol.quantity || 1,
                          unitPrice: Number(ol.unitPrice || 0),
                          notes: ol.notes || '',
                        }));
                        setForm({
                          customerId: order.customerId,
                          notes: order.notes || '',
                          paidAmount: Number(order.paidAmount) || 0,
                          orderLines,
                        });
                        setEditingOrderId(order.id);
                        setShowForm(true);
                        setFormErrors({});
                      } else {
                        setSelectedOrder(order);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedOrder(order)}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-300 to-pink-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                          {order.customer?.name?.charAt(0) || '?'}
                        </div>
                        <span className="font-medium">{order.customer?.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={statusColors[order.status]}>
                        {statusIcons[order.status]} {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                    <td className="text-center">
                      {order.orderLines?.length > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full"
                          title={`${order.orderLines.length} dòng`}
                        >
                          📋 {order.orderLines.length} dòng
                        </span>
                      ) : order.recipeId ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full"
                          title="Đơn hàng theo công thức"
                        >
                          📋 Công thức
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-300">—</span>
                      )}
                    </td>
                    <td className="text-right text-gray-600 tabular-nums">
                      {order.items?.length || 0}
                    </td>
                    <td className="font-semibold tabular-nums text-right">
                      {formatCurrency(
                        Number(order.subtotal || 0) -
                          Number(order.discount || 0) +
                          Number(order.packagingCost || 0) +
                          Number(order.shippingCost || 0),
                      )}
                    </td>
                    <td className="text-gray-500 text-xs">{formatDate(order.orderDate)}</td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="btn-ghost btn-xs"
                          title="Xem chi tiết"
                          aria-label="Xem đơn hàng"
                        >
                          👁️
                        </button>
                        {PREV_STATUS[order.status] && (
                          <button
                            onClick={() => advanceOrder(order.id, PREV_STATUS[order.status], true)}
                            className="btn-xs btn-ghost border border-gray-200 group"
                            title={`Quay lại ${statusLabels[PREV_STATUS[order.status]] || PREV_STATUS[order.status].replace(/([A-Z])/g, ' $1').trim()}`}
                          >
                            <span className="group-hover:-translate-x-0.5 transition-transform inline-block">
                              ←
                            </span>
                          </button>
                        )}
                        {NEXT_STATUS[order.status] && (
                          <button
                            onClick={() => advanceOrder(order.id, NEXT_STATUS[order.status])}
                            className="btn-xs btn-success group"
                            title={`Chuyển sang ${statusLabels[NEXT_STATUS[order.status]] || NEXT_STATUS[order.status].replace(/([A-Z])/g, ' $1').trim()}`}
                          >
                            <span className="group-hover:translate-x-0.5 transition-transform inline-block">
                              →
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <EmptyState
                    icon="🛒"
                    title="Không tìm thấy đơn hàng"
                    message={
                      statusFilter
                        ? `Không có đơn hàng nào ở trạng thái "${statusFilter}". Thử bộ lọc khác.`
                        : 'Hãy tạo đơn hàng đầu tiên.'
                    }
                  />
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={(openEditAfterDraft) => {
            loadOrders();
            loadCounts();
            if (openEditAfterDraft) {
              setSelectedOrder(null);
              if (selectedOrder) {
                const orderLines = (selectedOrder.orderLines || []).map((ol: any) => ({
                  type: ol.type,
                  recipeId: ol.recipeId || '',
                  customInput: ol.customInput || '',
                  salePrice: Number(ol.salePrice || 0),
                  productId: ol.productId || '',
                  quantity: ol.quantity || 1,
                  unitPrice: Number(ol.unitPrice || 0),
                  notes: ol.notes || '',
                }));
                setForm({
                  customerId: selectedOrder.customerId,
                  notes: selectedOrder.notes || '',
                  paidAmount: Number(selectedOrder.paidAmount) || 0,
                  orderLines,
                });
                setEditingOrderId(selectedOrder.id);
                setShowForm(true);
                setFormErrors({});
              }
            } else if (selectedOrder && token) {
              apiClient(`/orders/${selectedOrder.id}`, { token })
                .then((res: any) => {
                  if (res.data) setSelectedOrder(res.data);
                })
                .catch(() => {});
            }
          }}
          token={token}
          showToast={showToast}
        />
      )}

      <ConfirmModal
        isOpen={!!confirmReturn}
        onClose={() => setConfirmReturn(null)}
        onConfirm={() => {
          if (!confirmReturn || !token) return;
          const { id, status, label } = confirmReturn;
          apiClient(`/orders/${id}/status`, { method: 'PATCH', body: { status }, token })
            .then(() => {
              showToast(`Đã chuyển sang ${label}`);
              loadOrders();
              loadCounts();
            })
            .catch((e: any) => showToast(e.message || 'Cập nhật thất bại', 'error'));
        }}
        title="Quay lại trạng thái"
        message={`Bạn có chắc muốn quay lại trạng thái "${confirmReturn?.label}"?`}
        confirmLabel="Xác nhận"
        variant="primary"
      />
    </div>
  );
}
