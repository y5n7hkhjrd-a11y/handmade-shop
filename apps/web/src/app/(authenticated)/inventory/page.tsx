'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { formatDateTime } from '@handmade-shop/shared';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { SkeletonRow } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import Pagination from '@/components/Pagination';

interface Transaction {
  id: string;
  type: string;
  product?: { id: string; name: string };
  componentName?: string;
  quantity: number;
  unit: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

interface StockSummary {
  productId: string | null;
  componentName: string | null;
  _sum: { quantity: number | null };
}

const typeConfig: Record<string, { icon: string; badge: string; label: string }> = {
  IMPORT: { icon: '📥', badge: 'badge-green', label: 'Import' },
  SALE: { icon: '📤', badge: 'badge-red', label: 'Sale' },
  ADJUSTMENT: { icon: '⚖️', badge: 'badge-yellow', label: 'Adjustment' },
};

export default function InventoryPage() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stockSummary, setStockSummary] = useState<StockSummary[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [showStockView, setShowStockView] = useState(false);
  const [form, setForm] = useState({
    type: 'IMPORT',
    productId: '',
    componentName: '',
    quantity: 0,
    unit: 'pieces',
    reference: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast, showToast } = useToast();

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (typeFilter) params.type = typeFilter;
      if (productFilter) params.productId = productFilter;
      const res = await apiClient<any>(`/inventory?${new URLSearchParams(params).toString()}`, {
        token,
      });
      setTransactions(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (e: any) {
      showToast(e.message || 'Thất bại', 'error');
    }
    setLoading(false);
  }, [token, page, typeFilter, productFilter, showToast]);

  useEffect(() => {
    loadData();
    if (token) {
      apiClient('/inventory/stock/summary', { token })
        .then((r: any) => setStockSummary(r.data || []))
        .catch(() => {});
      apiClient('/products?limit=100', { token })
        .then((r: any) => setProducts(r.data || []))
        .catch(() => {});
    }
  }, [token, page, typeFilter, productFilter, loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (form.quantity <= 0) {
      setFormErrors({ quantity: 'Quantity must be greater than 0' });
      return;
    }
    try {
      await apiClient('/inventory', {
        method: 'POST',
        body: { ...form, quantity: Number(form.quantity) },
        token,
      });
      showToast('Đã ghi nhận giao dịch');
      setShowForm(false);
      setForm({
        type: 'IMPORT',
        productId: '',
        componentName: '',
        quantity: 0,
        unit: 'pieces',
        reference: '',
        notes: '',
      });
      setFormErrors({});
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Thất bại', 'error');
    }
  };

  // Calculate stock levels
  const productStock: Record<string, number> = {};
  const productNames: Record<string, string> = {};
  products.forEach((p) => {
    productNames[p.id] = p.name;
  });

  transactions.forEach((tx) => {
    const key = tx.product?.id || tx.componentName || 'unknown';
    if (!productStock[key]) productStock[key] = 0;
    if (tx.type === 'IMPORT') productStock[key] += Number(tx.quantity);
    else if (tx.type === 'SALE') productStock[key] -= Number(tx.quantity);
    else productStock[key] += Number(tx.quantity);
  });

  const totals = { import: 0, sale: 0, adjustment: 0 };
  transactions.forEach((tx) => {
    if (tx.type === 'IMPORT') totals.import += Number(tx.quantity);
    else if (tx.type === 'SALE') totals.sale += Number(tx.quantity);
    else if (tx.type === 'ADJUSTMENT') totals.adjustment += Number(tx.quantity);
  });
  const netStock = totals.import - totals.sale + totals.adjustment;

  return (
    <div className="page-enter">
      <Toast toast={toast} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kho hàng</h1>
          <p className="text-gray-500 mt-1 text-sm">Theo dõi nhập xuất tồn kho</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowStockView(!showStockView)} className="btn-secondary btn-sm">
            <span className="mr-1.5">{showStockView ? '📋' : '📊'}</span>
            {showStockView ? 'Giao dịch' : 'Tồn kho'}
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Ghi nhận giao dịch
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm shadow-sm">
              📥
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tổng nhập
            </span>
          </div>
          <p className="text-xl font-bold text-emerald-600">{totals.import.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-sm shadow-sm">
              📤
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tổng xuất
            </span>
          </div>
          <p className="text-xl font-bold text-red-600">{totals.sale.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-sm shadow-sm">
              ⚖️
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Điều chỉnh
            </span>
          </div>
          <p className="text-xl font-bold text-amber-600">{totals.adjustment.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div
              className={`w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-sm shadow-sm ${
                netStock >= 0 ? 'from-pink-300 to-pink-400' : 'from-red-400 to-red-600'
              }`}
            >
              📊
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tồn kho ròng
            </span>
          </div>
          <p className={`text-xl font-bold ${netStock >= 0 ? 'text-[#D97D9E]' : 'text-red-600'}`}>
            {netStock >= 0 ? '+' : ''}
            {netStock.toLocaleString()}
          </p>
          <div className="progress-bar mt-2">
            <div
              className={`progress-bar-fill ${totals.import > 0 ? 'bg-gradient-to-r from-[#E88DAB] to-emerald-500' : 'bg-gray-300'}`}
              style={{
                width: `${totals.import > 0 ? Math.min((totals.sale / totals.import) * 100, 100) : 0}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {totals.import > 0
              ? `${((totals.sale / totals.import) * 100).toFixed(0)}% đã dùng`
              : 'Không có dữ liệu'}
          </p>
        </div>
      </div>

      {/* Stock Levels View */}
      {showStockView && (
        <div className="card mb-6 animate-[slideDown_0.2s_ease-out]">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tồn kho hiện tại</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(productStock).map(([key, qty]) => {
              const name = productNames[key] || key;
              const maxStock = Math.max(...Object.values(productStock), 1);
              const pct = (qty / maxStock) * 100;
              const isLow = qty <= 10 && qty > 0;
              const isOut = qty <= 0;
              return (
                <div key={key} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 truncate flex-1">
                      {name}
                    </span>
                    <span
                      className={`text-sm font-bold ml-2 ${
                        isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {qty.toLocaleString()}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-bar-fill ${
                        isOut ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(pct, isOut ? 4 : 0)}%` }}
                    />
                  </div>
                  {isOut && (
                    <p className="text-[10px] text-red-500 mt-1 font-medium">⚠ Out of stock</p>
                  )}
                  {isLow && !isOut && (
                    <p className="text-[10px] text-amber-500 mt-1 font-medium">⚠ Low stock</p>
                  )}
                </div>
              );
            })}
            {Object.keys(productStock).length === 0 && (
              <div className="col-span-full text-center py-6 text-gray-400 text-sm">
                No stock data available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="action-bar">
        <select
          className="input max-w-[180px]"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả loại</option>
          <option value="IMPORT">📥 Import</option>
          <option value="SALE">📤 Sale</option>
          <option value="ADJUSTMENT">⚖️ Adjustment</option>
        </select>
        <select
          className="input max-w-[200px]"
          value={productFilter}
          onChange={(e) => {
            setProductFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả sản phẩm</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              📦 {p.name}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500 ml-auto">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Create Transaction Modal */}
      {showForm && (
        <div
          className="modal-overlay"
          onClick={() => setShowForm(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Giao dịch mới</h2>
              <p className="text-sm text-gray-500 mt-1">Ghi nhận biến động kho</p>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="label">Loại</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="IMPORT">📥 Import — Stock received</option>
                  <option value="SALE">📤 Sale — Stock sold</option>
                  <option value="ADJUSTMENT">⚖️ Adjustment — Stock correction</option>
                </select>
              </div>

              <div>
                <label className="label">
                  Sản phẩm <span className="text-gray-400 font-normal">(hoặc tên nguyên liệu)</span>
                </label>
                <select
                  className="input"
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                >
                  <option value="">Chọn sản phẩm...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {!form.productId && (
                <div>
                  <label className="label">
                    Component Name <span className="text-gray-400 font-normal">(fallback)</span>
                  </label>
                  <input
                    className="input"
                    value={form.componentName}
                    onChange={(e) => setForm({ ...form, componentName: e.target.value })}
                    placeholder="e.g., Beads, String, Clasp"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label label-required">Số lượng</label>
                  <input
                    className={`input ${formErrors.quantity ? 'input-error' : ''}`}
                    type="number"
                    step="0.0001"
                    value={form.quantity}
                    onChange={(e) => {
                      setForm({ ...form, quantity: Number(e.target.value) });
                      setFormErrors({});
                    }}
                    required
                  />
                  {formErrors.quantity && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.quantity}</p>
                  )}
                </div>
                <div>
                  <label className="label">Đơn vị</label>
                  <input
                    className="input"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">
                  Tham chiếu{' '}
                  <span className="text-gray-400 font-normal">(ví dụ: PO#, hóa đơn)</span>
                </label>
                <input
                  className="input"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="Tham chiếu (không bắt buộc)"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  Ghi nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transactions List */}
      {loading ? (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Product</th>
                  <th className="text-right">Qty</th>
                  <th>Reference</th>
                  <th>Date</th>
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
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Loại</th>
                  <th>Sản phẩm / Nguyên liệu</th>
                  <th className="text-right">Số lượng</th>
                  <th>Tham chiếu</th>
                  <th>Ngày</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="group">
                    <td>
                      <span className={typeConfig[tx.type]?.badge || 'badge-gray'}>
                        {typeConfig[tx.type]?.icon} {typeConfig[tx.type]?.label || tx.type}
                      </span>
                    </td>
                    <td>
                      <span className="font-medium">
                        {tx.product?.name || tx.componentName || (
                          <span className="text-gray-300 italic">—</span>
                        )}
                      </span>
                    </td>
                    <td
                      className={`text-right font-semibold tabular-nums ${
                        tx.type === 'IMPORT'
                          ? 'text-emerald-600'
                          : tx.type === 'SALE'
                            ? 'text-red-600'
                            : 'text-amber-600'
                      }`}
                    >
                      {tx.type === 'IMPORT' ? '+' : tx.type === 'SALE' ? '−' : '±'}
                      {Number(tx.quantity).toLocaleString()}
                      <span className="text-xs text-gray-400 ml-0.5">{tx.unit}</span>
                    </td>
                    <td className="text-gray-500 text-xs font-mono">
                      {tx.reference || <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="text-gray-500 text-xs">{formatDateTime(tx.createdAt)}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <EmptyState
                    icon="📊"
                    title="Không tìm thấy giao dịch"
                    message={
                      typeFilter
                        ? 'Không có giao dịch phù hợp với bộ lọc.'
                        : 'Ghi nhận giao dịch đầu tiên để bắt đầu.'
                    }
                  />
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
