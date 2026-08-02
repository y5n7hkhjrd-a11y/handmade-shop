'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDate } from '@handmade-shop/shared';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { SkeletonRow } from '@/components/LoadingSpinner';
import FlaticonIcon from '@/components/FlaticonIcon';
import { useSort, SortIcon } from '@/hooks/useSort';
import EmptyState from '@/components/EmptyState';
import Pagination from '@/components/Pagination';
import ConfirmModal from '@/components/ConfirmModal';
import OrderDetail from './OrderDetail';
import OrderForm from './OrderForm';
import {
  statusFlow,
  statusIcons,
  statusLabels,
  statusPillClasses,
  statusDotColors,
  filterChipActiveColors,
  filterChipHoverColors,
  PREV_STATUS,
  NEXT_STATUS,
  SOCIAL_PLATFORMS,
} from './orderConstants';

const STEP_DOT_COLORS = [
  'bg-gray-400 ring-gray-300',
  'bg-amber-300 ring-amber-200',
  'bg-mint-300 ring-mint-200',
  'bg-pink-300 ring-pink-200',
  'bg-avocado-300 ring-avocado-200',
  'bg-green-300 ring-green-200',
];

const STEP_DOT_BG = [
  'bg-gray-400',
  'bg-amber-300',
  'bg-mint-300',
  'bg-pink-300',
  'bg-avocado-300',
  'bg-green-300',
];

const STEP_LINE_COLORS = [
  'bg-gray-300',
  'bg-amber-300',
  'bg-mint-300',
  'bg-pink-300',
  'bg-avocado-300',
  'bg-green-300',
];

/* ─── Deadline chip (shared by desktop table + mobile card) ─── */
function DeadlineChip({ order }: { order: any }) {
  if (!order.deadline) return null;
  const deadlineDate = new Date(order.deadline);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  deadlineDate.setHours(23, 59, 59, 999);
  const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = diffDays <= 0 && !['Completed', 'ReadyToShip'].includes(order.status);
  const isSoon =
    diffDays > 0 && diffDays <= 3 && !['Completed', 'ReadyToShip'].includes(order.status);
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
        isOverdue
          ? 'bg-red-50 text-red-600'
          : isSoon
            ? 'bg-amber-50 text-amber-600'
            : 'bg-emerald-50 text-emerald-600'
      }`}
      title={`Hạn chót: ${formatDate(order.deadline)}${isOverdue ? ' (quá hạn)' : isSoon ? ` (còn ${diffDays} ngày)` : ''}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full inline-block ${
          isOverdue ? 'bg-red-500' : isSoon ? 'bg-amber-500' : 'bg-emerald-500'
        }`}
      />
      {formatDate(order.deadline)}
    </span>
  );
}

/* ─── Mobile order card (replaces the table on small screens) ─── */
function MobileOrderCard({ order, onClick }: { order: any; onClick: () => void }) {
  const total =
    Number(order.subtotal || 0) - Number(order.discount || 0) + Number(order.packagingCost || 0);
  const lineInfo =
    order.orderLines?.length > 0
      ? `${order.orderLines.length} dòng`
      : order.recipeId
        ? 'Công thức'
        : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-pink-50/60 transition-colors cursor-pointer"
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-mint-300 to-mint-400 flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0">
        {order.customer?.name?.charAt(0) || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-gray-900 truncate">{order.customer?.name || 'N/A'}</p>
          <span className="font-bold text-gray-900 tabular-nums text-sm flex-shrink-0">
            {formatCurrency(total)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              statusPillClasses[order.status] || 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                statusDotColors[order.status] || 'bg-gray-400'
              }`}
            />
            {statusLabels[order.status] || order.status}
          </span>
          {order.deadline && <DeadlineChip order={order} />}
          {lineInfo && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-avocado-600 bg-avocado-50">
              📋 {lineInfo}
            </span>
          )}
        </div>
      </div>
      <svg
        className="w-4 h-4 text-gray-300 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}

export default function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [deadlineFilter, setDeadlineFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const { toast, showToast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [matchingRules, setMatchingRules] = useState<any[]>([]);

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
      if (deadlineFilter) params.deadlineFilter = deadlineFilter;
      const res = await apiClient<any>(`/orders?${new URLSearchParams(params).toString()}`, {
        token,
      });
      setOrders(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (e: any) {
      showToast(e.message || 'Failed', 'error');
    }
    setLoading(false);
  }, [token, page, statusFilter, deadlineFilter, showToast]);

  useEffect(() => {
    // Deep-link support: /orders?status=WaitingConfirm or /orders?id=...
    // Keyed on [token] because AuthProvider hydrates token from localStorage
    // asynchronously — on a fresh page load token is null on first render.
    if (!token) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const id = params.get('id');
    if (status && status !== statusFilter) {
      setPage(1);
      setStatusFilter(status);
    }
    if (id) {
      apiClient(`/orders/${id}`, { token })
        .then((res: any) => {
          if (res.data) setSelectedOrder(res.data);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOrders, token]);

  const [confirmAdvanceTable, setConfirmAdvanceTable] = useState<{
    id: string;
    status: string;
    label: string;
  } | null>(null);

  const advanceOrder = (id: string, status: string, orderObj?: any) => {
    if (!token) return;

    if (orderObj?.status === 'InProgress') {
      const paid = Number(orderObj.paidAmount) || 0;
      const salePriceTotal =
        Number(orderObj.subtotal || 0) -
        Number(orderObj.discount || 0) +
        Number(orderObj.packagingCost || 0);
      const remaining = salePriceTotal - paid;
      if (remaining > 0) {
        showToast(
          'Vui lòng xác nhận khách hàng đã thanh toán trước khi chuyển sang Đơn đã gói',
          'error',
        );
        return;
      }
    }

    const label = statusLabels[status] || status.replace(/([A-Z])/g, ' $1').trim();
    setConfirmAdvanceTable({ id, status, label });
  };

  const doAdvanceTable = async () => {
    if (!token || !confirmAdvanceTable) return;
    const { id, status } = confirmAdvanceTable;
    setConfirmAdvanceTable(null);
    try {
      await apiClient(`/orders/${id}/status`, { method: 'PATCH', body: { status }, token });
      showToast(
        `Đã chuyển sang ${statusLabels[status] || status.replace(/([A-Z])/g, ' $1').trim()}`,
      );
      loadOrders();
      loadCounts();
    } catch (e: any) {
      showToast(e.message || 'Cập nhật thất bại', 'error');
    }
  };

  // Sort
  const { sortedData, sortKey, sortDir, toggleSort } = useSort(orders, 'orderDate', 'desc');

  // Stats (use fetched counts, fall back to local page counts)
  const localCounts = statusFlow.reduce(
    (acc, s) => ({ ...acc, [s]: orders.filter((o: any) => o.status === s).length }),
    {} as Record<string, number>,
  );
  const effectiveCounts = Object.keys(statusCounts).length > 0 ? statusCounts : localCounts;

  return (
    <div className="page-enter">
      <Toast toast={toast} />

      {/* Page header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 via-white to-avocado-50/50 border border-pink-100/60 p-4 sm:p-6 mb-4 sm:mb-6 shadow-[0_2px_12px_-4px_rgba(127,163,69,0.15)]">
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-pink-200/30 rounded-full blur-2xl" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-mint-200/25 rounded-full blur-2xl" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-avocado-200/20 rounded-full blur-2xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-mint-500 flex items-center justify-center text-white shadow-sm">
                <FlaticonIcon name="receipt" size="md" />
              </div>
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-avocado-400/20 to-mint-500/20 blur-sm -z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                  Đơn hàng
                </h1>
                {orders.length > 0 && (
                  <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-white border border-gray-200 rounded-full text-gray-600 shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {orders.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Theo dõi đơn hàng trong quy trình sản xuất
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingOrder(null);
              setShowForm(true);
            }}
            className="btn-primary !gap-1.5 !px-4"
          >
            <span>＋ Đơn hàng mới</span>
          </button>
        </div>
        <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-pink-300/40 to-transparent" />
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
            {statusIcons[s] ? (
              <FlaticonIcon name={statusIcons[s]} size="sm" className="inline-flex" />
            ) : null}
            <span>{statusLabels[s] || s.replace(/([A-Z])/g, ' $1').trim()}</span>
            <span className="text-gray-400 ml-1">({effectiveCounts[s] || 0})</span>
          </button>
        ))}
      </div>

      {/* Deadline filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => {
            setDeadlineFilter('');
            setPage(1);
          }}
          className={`filter-chip text-xs ${!deadlineFilter ? 'filter-chip-active' : 'hover:!border-gray-200 hover:!text-gray-600'}`}
        >
          📅 Mọi hạn chót
        </button>
        <button
          onClick={() => {
            setDeadlineFilter('overdue');
            setStatusFilter('');
            setPage(1);
          }}
          className={`filter-chip text-xs ${deadlineFilter === 'overdue' ? 'filter-chip-active !bg-red-50 !border-red-300 !text-red-700 !shadow-sm' : 'hover:!border-red-200 hover:!text-red-600 hover:!bg-red-50/50'}`}
        >
          🔴 Quá hạn
        </button>
        <button
          onClick={() => {
            setDeadlineFilter('soon');
            setStatusFilter('');
            setPage(1);
          }}
          className={`filter-chip text-xs ${deadlineFilter === 'soon' ? 'filter-chip-active !bg-amber-50 !border-amber-300 !text-amber-700 !shadow-sm' : 'hover:!border-amber-200 hover:!text-amber-600 hover:!bg-amber-50/50'}`}
        >
          🟡 Sắp hết hạn
        </button>
      </div>

      {/* Create/Edit Order Form */}
      <OrderForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingOrder(null);
        }}
        editingOrder={editingOrder}
        token={token}
        customers={customers}
        products={products}
        recipes={recipes}
        matchingRules={matchingRules}
        onSuccess={() => {
          loadOrders();
          loadCounts();
        }}
        onCustomerCreated={(c) => setCustomers((prev) => [...prev, c])}
        showToast={showToast}
      />

      {/* Orders list */}
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
                    <th>Khách hàng</th>
                    <th>Trạng thái</th>
                    <th className="text-left">Số sản phẩm</th>
                    <th className="text-right">Tổng</th>
                    <th className="text-left">📅 Hạn chót</th>
                    <th className="text-left">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((i) => (
                    <SkeletonRow key={i} cols={6} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="md:hidden">
            <div className="card p-0 overflow-hidden divide-y divide-gray-100">
              {sortedData.length === 0 ? (
                <table className="w-full">
                  <tbody>
                    <EmptyState
                      emoji="🛒"
                      title="Không tìm thấy đơn hàng"
                      message={
                        statusFilter
                          ? `Không có đơn hàng nào ở trạng thái "${statusFilter}". Thử bộ lọc khác.`
                          : 'Hãy tạo đơn hàng đầu tiên.'
                      }
                    />
                  </tbody>
                </table>
              ) : (
                sortedData.map((order) => (
                  <MobileOrderCard
                    key={order.id}
                    order={order}
                    onClick={() => {
                      if (order.status === 'Draft') {
                        setEditingOrder(order);
                        setShowForm(true);
                      } else {
                        setSelectedOrder(order);
                      }
                    }}
                  />
                ))
              )}
            </div>
            <div className="mt-3">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>

          {/* Desktop table */}
          <div className="card p-0 overflow-hidden hidden md:block">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th
                      className="cursor-pointer select-none group"
                      onClick={() => toggleSort('customer.name')}
                    >
                      Khách hàng{' '}
                      <SortIcon sortKey="customer.name" currentKey={sortKey} dir={sortDir} />
                    </th>
                    <th
                      className="cursor-pointer select-none group"
                      onClick={() => toggleSort('status')}
                    >
                      Trạng thái <SortIcon sortKey="status" currentKey={sortKey} dir={sortDir} />
                    </th>
                    <th className="text-left">Số sản phẩm</th>
                    <th
                      className="text-left cursor-pointer select-none group"
                      onClick={() => toggleSort('subtotal')}
                    >
                      Tổng <SortIcon sortKey="subtotal" currentKey={sortKey} dir={sortDir} />
                    </th>
                    <th
                      className="text-left cursor-pointer select-none group"
                      onClick={() => toggleSort('deadline')}
                    >
                      📅 Hạn chót <SortIcon sortKey="deadline" currentKey={sortKey} dir={sortDir} />
                    </th>
                    <th
                      className="text-left cursor-pointer select-none group"
                      onClick={() => toggleSort('orderDate')}
                    >
                      Ngày tạo <SortIcon sortKey="orderDate" currentKey={sortKey} dir={sortDir} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((order) => {
                    return (
                      <tr
                        key={order.id}
                        className="cursor-pointer group transition-all duration-200 hover:bg-mint-50/40"
                        onClick={() => {
                          if (order.status === 'Draft') {
                            setEditingOrder(order);
                            setShowForm(true);
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
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mint-300 to-mint-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                              {order.customer?.name?.charAt(0) || '?'}
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium truncate">
                                {order.customer?.name || 'N/A'}
                              </span>
                              {order.customer &&
                                (order.customer.facebook ||
                                  order.customer.instagram ||
                                  order.customer.tiktok ||
                                  order.customer.threads ||
                                  order.customer.phone) && (
                                  <div className="flex items-center gap-0.5 mt-0.5 flex-wrap">
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
                                            className="w-3.5 h-3.5 flex items-center justify-center rounded bg-white border border-gray-200 hover:shadow-sm hover:scale-110 transition-all duration-200"
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
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-0">
                              {(() => {
                                const orderIdx = statusFlow.indexOf(order.status);
                                return statusFlow.map((step, i) => {
                                  const isDone = i < orderIdx;
                                  const isCurrent = i === orderIdx;
                                  return (
                                    <div key={step} className="flex items-center">
                                      <div
                                        className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all duration-300 ring-1 ${
                                          isDone || isCurrent
                                            ? `${STEP_DOT_COLORS[i]} text-white shadow-sm`
                                            : 'bg-white border border-gray-200 ring-gray-200'
                                        }`}
                                        title={statusLabels[step]}
                                      >
                                        <FlaticonIcon
                                          name={statusIcons[step]}
                                          size="xs"
                                          className={
                                            isDone || isCurrent ? 'text-white' : 'text-gray-300'
                                          }
                                        />
                                      </div>
                                      {i < statusFlow.length - 1 && (
                                        <div
                                          className={`w-[6px] h-[3px] mx-[1.5px] rounded-full transition-all duration-300 ${
                                            i < orderIdx ? STEP_LINE_COLORS[i] : 'bg-gray-200'
                                          }`}
                                        />
                                      )}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                            {Array.isArray(order.shipping) &&
                              order.shipping.some(
                                (s: any) => s.status === 'Failed' && !s.deletedAt,
                              ) && (
                                <div className="relative group flex-shrink-0">
                                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center shadow-sm shadow-red-200">
                                    <FlaticonIcon
                                      name="triangle-warning"
                                      size="xs"
                                      className="text-white"
                                    />
                                  </div>
                                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
                                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-lg z-50">
                                    Vận chuyển thất bại
                                  </span>
                                </div>
                              )}
                          </div>
                        </td>
                        <td className="text-left">
                          {order.orderLines?.length > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-avocado-600 bg-avocado-50 px-1.5 py-0.5 rounded-full"
                              title={`${order.orderLines.length} dòng`}
                            >
                              📋 {order.orderLines.length} dòng
                            </span>
                          ) : order.recipeId ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-avocado-600 bg-avocado-50 px-1.5 py-0.5 rounded-full"
                              title="Đơn hàng theo công thức"
                            >
                              📋 Công thức
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-300">—</span>
                          )}
                        </td>
                        <td className="font-semibold tabular-nums text-left">
                          {formatCurrency(
                            Number(order.subtotal || 0) -
                              Number(order.discount || 0) +
                              Number(order.packagingCost || 0),
                          )}
                        </td>
                        <td className="text-left">
                          {order.deadline ? (
                            <DeadlineChip order={order} />
                          ) : (
                            <span className="text-[10px] text-gray-300">—</span>
                          )}
                        </td>
                        <td className="text-left">
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                            <FlaticonIcon name="calendar" size="xs" className="text-gray-400" />
                            <span className="font-medium">{formatDate(order.orderDate)}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <EmptyState
                      emoji="🛒"
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
        </>
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
                setEditingOrder(selectedOrder);
                setShowForm(true);
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
        isOpen={!!confirmAdvanceTable}
        onClose={() => setConfirmAdvanceTable(null)}
        onConfirm={doAdvanceTable}
        title="Xác nhận chuyển trạng thái"
        message={`Bạn có chắc muốn chuyển sang trạng thái "${confirmAdvanceTable?.label}"?`}
        confirmLabel="Xác nhận"
        variant="primary"
      />
    </div>
  );
}
