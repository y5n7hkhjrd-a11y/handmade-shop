'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { formatDateTime } from '@handmade-shop/shared';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { SkeletonRow } from '@/components/LoadingSpinner';
import { useSort, SortIcon } from '@/hooks/useSort';
import EmptyState from '@/components/EmptyState';
import FlaticonIcon from '@/components/FlaticonIcon';
import Pagination from '@/components/Pagination';
import InventoryForm from './InventoryForm';

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
  IMPORT: { icon: 'download', badge: 'badge-green', label: 'Import' },
  SALE: { icon: 'upload', badge: 'badge-red', label: 'Sale' },
  ADJUSTMENT: { icon: 'balance-scale-left', badge: 'badge-yellow', label: 'Adjustment' },
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

  // Sort
  const { sortedData, sortKey, sortDir, toggleSort } = useSort(transactions, 'createdAt', 'desc');

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

      {/* Page header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 via-white to-purple-50/50 border border-pink-100/60 p-4 sm:p-6 mb-4 sm:mb-6 shadow-[0_2px_12px_-4px_rgba(232,141,171,0.15)]">
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-pink-200/30 rounded-full blur-2xl" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-purple-200/25 rounded-full blur-2xl" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-rose-200/20 rounded-full blur-2xl" />
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white shadow-sm">
                <FlaticonIcon name="warehouse-alt" size="md" />
              </div>
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-pink-400/20 to-purple-500/20 blur-sm -z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                  Kho hàng
                </h1>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Theo dõi nhập xuất tồn kho</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStockView(!showStockView)}
              className="btn-secondary btn-sm"
            >
              <span className="mr-1.5">{showStockView ? '📋' : '📊'}</span>
              {showStockView ? 'Giao dịch' : 'Tồn kho'}
            </button>
            <button onClick={() => setShowForm(true)} className="btn-primary !gap-1.5 !px-4">
              <span>＋ Ghi nhận giao dịch</span>
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-pink-300/40 to-transparent" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm col-span-2 lg:col-span-1">
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
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm col-span-2 lg:col-span-1">
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
      <InventoryForm
        isOpen={showForm}
        token={token}
        products={products}
        showToast={showToast}
        onClose={() => setShowForm(false)}
        onSuccess={loadData}
      />

      {/* Transactions List */}
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
                    <th>Type</th>
                    <th>Product</th>
                    <th className="text-left">Qty</th>
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
        </>
      ) : (
        <>
          {/* Mobile transaction cards */}
          <div className="md:hidden">
            <div className="card p-0 overflow-hidden divide-y divide-gray-100">
              {sortedData.map((tx) => (
                <div key={tx.id} className="px-4 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={typeConfig[tx.type]?.badge || 'badge-gray'}>
                      {typeConfig[tx.type]?.icon ? (
                        <FlaticonIcon name={typeConfig[tx.type]!.icon} size="sm" />
                      ) : null}{' '}
                      {typeConfig[tx.type]?.label || tx.type}
                    </span>
                    <span
                      className={`text-sm font-bold tabular-nums ${
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
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 text-sm mt-1.5 truncate">
                    {tx.product?.name || tx.componentName || (
                      <span className="text-gray-300 italic">—</span>
                    )}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <span className="text-[10px] text-gray-500 font-mono truncate">
                      {tx.reference || <span className="text-gray-300 italic">—</span>}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {formatDateTime(tx.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <table className="w-full">
                  <tbody>
                    <EmptyState
                      emoji="📊"
                      title="Không tìm thấy giao dịch"
                      message={
                        typeFilter
                          ? 'Không có giao dịch phù hợp với bộ lọc.'
                          : 'Ghi nhận giao dịch đầu tiên để bắt đầu.'
                      }
                    />
                  </tbody>
                </table>
              )}
            </div>
            <div className="mt-3">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>

          {/* Desktop transactions table */}
          <div className="card p-0 overflow-hidden hidden md:block">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th
                      className="cursor-pointer select-none group"
                      onClick={() => toggleSort('type')}
                    >
                      Loại <SortIcon sortKey="type" currentKey={sortKey} dir={sortDir} />
                    </th>
                    <th
                      className="cursor-pointer select-none group"
                      onClick={() => toggleSort('product.name')}
                    >
                      Sản phẩm / Nguyên liệu{' '}
                      <SortIcon sortKey="product.name" currentKey={sortKey} dir={sortDir} />
                    </th>
                    <th
                      className="text-left cursor-pointer select-none group"
                      onClick={() => toggleSort('quantity')}
                    >
                      Số lượng <SortIcon sortKey="quantity" currentKey={sortKey} dir={sortDir} />
                    </th>
                    <th>Tham chiếu</th>
                    <th
                      className="cursor-pointer select-none group"
                      onClick={() => toggleSort('createdAt')}
                    >
                      Ngày <SortIcon sortKey="createdAt" currentKey={sortKey} dir={sortDir} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((tx) => (
                    <tr key={tx.id} className="group">
                      <td>
                        <span className={typeConfig[tx.type]?.badge || 'badge-gray'}>
                          {typeConfig[tx.type]?.icon ? (
                            <FlaticonIcon name={typeConfig[tx.type]!.icon} size="sm" />
                          ) : null}{' '}
                          {typeConfig[tx.type]?.label || tx.type}
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
                        className={`text-left font-semibold tabular-nums ${
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
                      emoji="📊"
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
        </>
      )}
    </div>
  );
}
