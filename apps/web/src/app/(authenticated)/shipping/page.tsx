'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@handmade-shop/shared';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { SkeletonRow } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import Pagination from '@/components/Pagination';
import { copyToClipboard } from '@/lib/clipboard';

interface Shipping {
  id: string;
  orderId: string;
  deliveryType: string;
  shippingMethod: string;
  carrier?: string;
  trackingNumber?: string;
  status: string;
  eta?: string;
  cost: number;
  shippedAt?: string;
  deliveredAt?: string;
  order?: any;
}

const statusFlow = ['Pending', 'Shipped', 'InTransit', 'Delivered'];
const statusConfig: Record<string, { label: string; icon: string; badge: string; color: string }> =
  {
    Pending: { label: 'Pending', icon: '📋', badge: 'badge-gray', color: 'bg-gray-400' },
    Shipped: { label: 'Shipped', icon: '📦', badge: 'badge-blue', color: 'bg-blue-500' },
    InTransit: { label: 'In Transit', icon: '🚚', badge: 'badge-yellow', color: 'bg-amber-500' },
    Delivered: { label: 'Delivered', icon: '✅', badge: 'badge-green', color: 'bg-emerald-500' },
    Failed: { label: 'Failed', icon: '❌', badge: 'badge-red', color: 'bg-red-500' },
  };

const nextActions: Record<string, { status: string; label: string; btn: string }> = {
  Pending: { status: 'Shipped', label: 'Mark Shipped', btn: 'btn-primary' },
  Shipped: { status: 'InTransit', label: 'In Transit →', btn: 'btn-primary' },
  InTransit: { status: 'Delivered', label: 'Mark Delivered', btn: 'btn-success' },
};

export default function ShippingPage() {
  const { token } = useAuth();
  const [shipments, setShipments] = useState<Shipping[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    orderId: '',
    deliveryType: '',
    shippingMethod: '',
    carrier: '',
    trackingNumber: '',
    cost: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedShipment, setSelectedShipment] = useState<Shipping | null>(null);
  const { toast, showToast } = useToast();

  const loadShipments = useCallback(async () => {
    if (!token) return;
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!form.orderId) {
      setFormErrors({ orderId: 'Order ID is required' });
      return;
    }
    try {
      await apiClient('/shipping', {
        method: 'POST',
        body: { ...form, cost: Number(form.cost) },
        token,
      });
      showToast('Đã tạo đơn vận chuyển');
      setShowForm(false);
      setForm({
        orderId: '',
        deliveryType: '',
        shippingMethod: '',
        carrier: '',
        trackingNumber: '',
        cost: 0,
      });
      setFormErrors({});
      loadShipments();
    } catch (e: any) {
      showToast(e.message || 'Tạo không thành công', 'error');
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    if (!token) return;
    try {
      const body: any = { status: newStatus };
      if (newStatus === 'Shipped') body.shippedAt = new Date().toISOString();
      if (newStatus === 'Delivered') body.deliveredAt = new Date().toISOString();
      await apiClient(`/shipping/${id}`, { method: 'PUT', body, token });
      showToast(`Đã cập nhật sang ${statusConfig[newStatus]?.label || newStatus}`);
      loadShipments();
    } catch (e: any) {
      showToast(e.message || 'Cập nhật thất bại', 'error');
    }
  };

  const statusCounts = statusFlow.reduce(
    (acc, s) => ({ ...acc, [s]: shipments.filter((sh: Shipping) => sh.status === s).length }),
    {} as Record<string, number>,
  );
  const failedCount = shipments.filter((s) => s.status === 'Failed').length;

  return (
    <div className="page-enter">
      <Toast toast={toast} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vận chuyển</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Quản lý vận chuyển, nhà vận chuyển và theo dõi
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setFormErrors({});
          }}
          className="btn-primary"
        >
          + Đơn vận chuyển mới
        </button>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => {
            setStatusFilter('');
            setPage(1);
          }}
          className={`filter-chip ${!statusFilter ? 'filter-chip-active' : ''}`}
        >
          All <span className="text-gray-400 ml-1">({shipments.length})</span>
        </button>
        {statusFlow.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`filter-chip ${statusFilter === s ? 'filter-chip-active' : ''}`}
          >
            {statusConfig[s]?.icon} {statusConfig[s]?.label}
            <span className="text-gray-400 ml-1">({statusCounts[s] || 0})</span>
          </button>
        ))}
        <button
          onClick={() => setStatusFilter('Failed')}
          className={`filter-chip ${statusFilter === 'Failed' ? 'filter-chip-active' : ''} hover:border-red-300 hover:text-red-700 hover:bg-red-50`}
        >
          ❌ Failed <span className="text-gray-400 ml-1">({failedCount})</span>
        </button>
      </div>

      {/* New Shipment Modal */}
      {showForm && (
        <div
          className="modal-overlay"
          onClick={() => setShowForm(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Đơn vận chuyển mới</h2>
              <p className="text-sm text-gray-500 mt-1">Tạo đơn vận chuyển cho đơn hàng</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label label-required">Mã đơn hàng</label>
                  <input
                    className={`input ${formErrors.orderId ? 'input-error' : ''}`}
                    value={form.orderId}
                    onChange={(e) => {
                      setForm({ ...form, orderId: e.target.value });
                      setFormErrors({});
                    }}
                    placeholder="UUID"
                    required
                  />
                  {formErrors.orderId && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.orderId}</p>
                  )}
                </div>
                <div>
                  <label className="label label-required">Loại giao hàng</label>
                  <input
                    className="input"
                    value={form.deliveryType}
                    onChange={(e) => setForm({ ...form, deliveryType: e.target.value })}
                    placeholder="Standard / Express"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label label-required">Phương thức vận chuyển</label>
                <input
                  className="input"
                  value={form.shippingMethod}
                  onChange={(e) => setForm({ ...form, shippingMethod: e.target.value })}
                  placeholder="e.g., VNPost, GHN, GHTK"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Đơn vị vận chuyển</label>
                  <input
                    className="input"
                    value={form.carrier}
                    onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                    placeholder="e.g., Vietnam Post"
                  />
                </div>
                <div>
                  <label className="label">Mã theo dõi</label>
                  <input
                    className="input"
                    value={form.trackingNumber}
                    onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })}
                    placeholder="Tracking number"
                  />
                </div>
              </div>

              <div>
                <label className="label">Phí (VNĐ)</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  Tạo đơn vận chuyển
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shipments List */}
      {loading ? (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Tracking</th>
                  <th>Status</th>
                  <th className="text-right">Cost</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((i) => (
                  <SkeletonRow key={i} cols={5} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {shipments.map((s) => {
            const action = nextActions[s.status];
            const statusIdx = statusFlow.indexOf(s.status);
            return (
              <div key={s.id} className="card p-5 group">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Status progress */}
                  <div className="flex items-center gap-2 lg:w-48">
                    {s.status === 'Failed' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-sm shadow-sm animate-pulse">
                          ❌
                        </div>
                        <span className="text-sm font-semibold text-red-600">Failed</span>
                      </div>
                    ) : (
                      statusFlow.map((step, i) => (
                        <div key={step} className="flex items-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                              i <= statusIdx
                                ? 'bg-gradient-to-br from-[#E88DAB] to-[#D97D9E] text-white shadow-sm'
                                : 'bg-gray-200 text-gray-400'
                            }`}
                          >
                            {i < statusIdx ? '✓' : i + 1}
                          </div>
                          {i < statusFlow.length - 1 && (
                            <div
                              className={`w-4 h-0.5 mx-1 ${i < statusIdx ? 'bg-[#E88DAB]' : 'bg-gray-200'}`}
                            />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Method</p>
                      <p className="font-medium text-sm">{s.deliveryType}</p>
                      <p className="text-xs text-gray-400">{s.shippingMethod}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tracking</p>
                      {s.trackingNumber ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-sm">{s.trackingNumber}</span>
                          <button
                            onClick={() => copyToClipboard(s.trackingNumber!)}
                            className="copy-btn"
                            title="Sao chép mã vận đơn"
                          >
                            📋
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-300 italic text-sm">—</span>
                      )}
                      {s.carrier && <p className="text-xs text-gray-400">{s.carrier}</p>}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <span className={statusConfig[s.status]?.badge || 'badge-gray'}>
                        {statusConfig[s.status]?.icon} {statusConfig[s.status]?.label || s.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Cost</p>
                      <p className="font-bold text-[#D97D9E]">{formatCurrency(Number(s.cost))}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 lg:flex-col">
                    {action && (
                      <button
                        onClick={() => updateStatus(s.id, action.status)}
                        className={`btn-xs ${action.btn}`}
                      >
                        {action.label}
                      </button>
                    )}
                    {s.status === 'InTransit' && (
                      <button
                        onClick={() => updateStatus(s.id, 'Failed')}
                        className="btn-xs btn-danger"
                      >
                        Mark Failed
                      </button>
                    )}
                  </div>
                </div>

                {/* Timeline info */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
                  <span>
                    Order:{' '}
                    <span className="font-mono text-gray-500">{s.orderId.slice(0, 8)}...</span>
                  </span>
                  {s.shippedAt && <span>📦 Shipped: {formatDateTime(s.shippedAt)}</span>}
                  {s.deliveredAt && <span>✅ Delivered: {formatDateTime(s.deliveredAt)}</span>}
                  {s.eta && <span>📅 ETA: {formatDateTime(s.eta)}</span>}
                </div>
              </div>
            );
          })}
          {shipments.length === 0 && (
            <EmptyState
              icon="🚚"
              title="Không tìm thấy đơn vận chuyển"
              message={
                statusFilter
                  ? 'Không có đơn vận chuyển phù hợp với bộ lọc.'
                  : 'Tạo đơn vận chuyển đầu tiên để bắt đầu.'
              }
            />
          )}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
