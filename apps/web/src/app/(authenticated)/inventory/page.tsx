'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@handmade-shop/shared';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { SkeletonRow } from '@/components/LoadingSpinner';
import { useSort, SortIcon } from '@/hooks/useSort';
import EmptyState from '@/components/EmptyState';
import FlaticonIcon from '@/components/FlaticonIcon';
import Pagination from '@/components/Pagination';
import InventoryForm from './InventoryForm';
import CustomSelect from '@/components/CustomSelect';
import CustomDate from '@/components/CustomDate';

interface Transaction {
  id: string;
  type: string;
  product?: { id: string; name: string; type?: string };
  componentName?: string;
  quantity: number;
  cost?: number | null;
  reference?: string;
  notes?: string;
  createdAt: string;
}

interface StockSummaryItem {
  productId: string | null;
  componentName: string | null;
  _sum: { quantity: number | null };
}

interface ProductItem {
  id: string;
  name: string;
  type: string;
}

const LOW_STOCK_THRESHOLD = 10;

const typeConfig: Record<string, { icon: string; label: string; iconBg: string; chip: string }> = {
  IMPORT: {
    icon: 'download',
    label: 'Nhập kho',
    iconBg: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  },
  SALE: {
    icon: 'upload',
    label: 'Xuất kho',
    iconBg: 'bg-red-50 text-red-600 ring-red-100',
    chip: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  },
  ADJUSTMENT: {
    icon: 'balance-scale-left',
    label: 'Điều chỉnh',
    iconBg: 'bg-amber-50 text-amber-600 ring-amber-100',
    chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  },
};

function txSign(type: string): string {
  return type === 'IMPORT' ? '+' : type === 'SALE' ? '−' : '±';
}

function txColor(type: string): string {
  return type === 'IMPORT'
    ? 'text-emerald-600'
    : type === 'SALE'
      ? 'text-red-600'
      : 'text-amber-600';
}

function txIconFor(
  product?: { type?: string },
  componentName?: string,
): { icon: string; bg: string; sub: string } {
  if (product?.type === 'CHARM') {
    return { icon: 'stars', bg: 'bg-pink-50 text-pink-500 ring-pink-100', sub: 'CHARM' };
  }
  if (product?.type === 'BASE') {
    return { icon: 'box', bg: 'bg-avocado-50 text-avocado-600 ring-avocado-100', sub: 'BASE' };
  }
  if (componentName) {
    return { icon: 'flask', bg: 'bg-gray-100 text-gray-500 ring-gray-200', sub: 'Nguyên liệu' };
  }
  return { icon: 'box', bg: 'bg-gray-100 text-gray-500 ring-gray-200', sub: 'Sản phẩm' };
}

export default function InventoryPage() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stockSummary, setStockSummary] = useState<StockSummaryItem[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'transactions' | 'stock'>('transactions');
  const [typeFilter, setTypeFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const { toast, showToast } = useToast();

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (typeFilter) params.type = typeFilter;
      if (productFilter) params.productId = productFilter;
      if (dateFrom) params.startDate = new Date(dateFrom + 'T00:00:00').toISOString();
      if (dateTo) params.endDate = new Date(dateTo + 'T23:59:59').toISOString();
      const res = await apiClient<any>(`/inventory?${new URLSearchParams(params).toString()}`, {
        token,
      });
      setTransactions(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (e: any) {
      showToast(e.message || 'Thất bại', 'error');
    }
    setLoading(false);
  }, [token, page, typeFilter, productFilter, dateFrom, dateTo, showToast]);

  const loadSummary = useCallback(async () => {
    if (!token) return;
    try {
      const r: any = await apiClient('/inventory/stock/summary', { token });
      setStockSummary(r.data?.items || []);
      setTotals(r.data?.totals || {});
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    loadData();
    loadSummary();
    if (token) {
      apiClient('/products?limit=100', { token })
        .then((r: any) => setProducts(r.data || []))
        .catch(() => {});
    }
  }, [token, page, typeFilter, productFilter, dateFrom, dateTo, loadData, loadSummary]);

  // ── Stock levels from the real all-time summary ──
  const productNameById: Record<string, string> = {};
  const productTypeById: Record<string, string> = {};
  products.forEach((p) => {
    productNameById[p.id] = p.name;
    productTypeById[p.id] = p.type;
  });

  const stockItems = stockSummary
    .map((row) => {
      const isProduct = !!row.productId;
      const name = isProduct
        ? productNameById[row.productId!] || 'Sản phẩm'
        : row.componentName || 'Nguyên liệu';
      return {
        key: row.productId || row.componentName || 'unknown',
        name,
        qty: Number(row._sum?.quantity || 0),
        type: isProduct ? productTypeById[row.productId!] : undefined,
      };
    })
    .sort((a, b) => {
      // Out of stock first, then low, then rest — alphabetical within each group
      const rank = (q: number) => (q <= 0 ? 0 : q <= LOW_STOCK_THRESHOLD ? 1 : 2);
      return rank(a.qty) - rank(b.qty) || a.name.localeCompare(b.name, 'vi');
    });

  const netStock = stockItems.reduce((sum, i) => sum + i.qty, 0);
  const outCount = stockItems.filter((i) => i.qty <= 0).length;
  const lowCount = stockItems.filter((i) => i.qty > 0 && i.qty <= LOW_STOCK_THRESHOLD).length;
  const maxStock = Math.max(...stockItems.map((i) => i.qty), 1);

  // ── Sort transactions ──
  const { sortedData, sortKey, sortDir, toggleSort } = useSort(transactions, 'createdAt', 'desc');

  const hasActiveFilters = !!typeFilter || !!productFilter || !!dateFrom || !!dateTo;
  const activeFilterCount =
    (typeFilter ? 1 : 0) + (productFilter ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);
  const clearAllFilters = () => {
    setTypeFilter('');
    setProductFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };
  const usedPct =
    (totals.IMPORT || 0) > 0 ? Math.min(((totals.SALE || 0) / totals.IMPORT) * 100, 100) : 0;

  return (
    <div className="page-enter">
      <Toast toast={toast} />

      {/* ─── Header ─── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-pink-50 via-white to-avocado-50/70 border border-pink-100/70 shadow-[0_2px_12px_-4px_rgba(127,163,69,0.15)] mb-4 sm:mb-6">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-gradient-to-br from-pink-200/25 to-mint-200/25 rounded-full blur-3xl" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-gradient-to-tr from-mint-200/20 to-pink-200/20 rounded-full blur-2xl" />
        <div className="absolute top-1/2 -translate-y-1/2 right-1/3 w-16 h-16 bg-pink-100/10 rounded-full blur-xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #cddda9 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-pink-500 flex items-center justify-center text-white shadow-md ring-1 ring-white/60">
                    <FlaticonIcon name="warehouse-alt" size="lg" />
                  </div>
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-pink-300/30 to-mint-300/30 blur-sm -z-10" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                      Kho hàng
                    </h1>
                    {stockItems.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-pink-100 text-pink-700 shadow-sm ring-1 ring-pink-200/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                        {stockItems.length} mặt hàng
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">Theo dõi nhập xuất tồn kho</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setView('transactions')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                    view === 'transactions'
                      ? 'bg-white text-[#66863A] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Giao dịch
                </button>
                <button
                  onClick={() => setView('stock')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                    view === 'stock'
                      ? 'bg-white text-[#66863A] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Tồn kho
                </button>
              </div>
              <button onClick={() => setShowForm(true)} className="btn-primary !gap-1.5 !px-4">
                <span>＋ Ghi nhận giao dịch</span>
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-pink-200/80 to-transparent" />
      </div>

      {/* ─── Stat cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-5">
        <div className="bg-white border border-gray-100 rounded-xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-sm ring-1 ring-black/5">
              <FlaticonIcon name="download" size="md" className="text-inherit" />
            </div>
            <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              +{(totals.IMPORT || 0).toLocaleString()}
            </span>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng nhập</p>
          <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1 tabular-nums truncate">
            {(totals.IMPORT || 0).toLocaleString()}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate">Hàng nhập vào kho</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shadow-sm ring-1 ring-black/5">
              <FlaticonIcon name="upload" size="md" className="text-inherit" />
            </div>
            <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-red-50 text-red-600">
              −{(totals.SALE || 0).toLocaleString()}
            </span>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng xuất</p>
          <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1 tabular-nums truncate">
            {(totals.SALE || 0).toLocaleString()}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate">Hàng xuất khỏi kho</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm ring-1 ring-black/5">
              <FlaticonIcon name="balance-scale-left" size="md" className="text-inherit" />
            </div>
            <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
              ±{(totals.ADJUSTMENT || 0).toLocaleString()}
            </span>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Điều chỉnh</p>
          <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1 tabular-nums truncate">
            {(totals.ADJUSTMENT || 0).toLocaleString()}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate">Kiểm kê / điều chỉnh</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-avocado-50 text-avocado-700 flex items-center justify-center shadow-sm ring-1 ring-black/5">
              <FlaticonIcon name="box-open" size="md" className="text-inherit" />
            </div>
            <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-avocado-50 text-avocado-700">
              {stockItems.length} mặt hàng
            </span>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tồn kho ròng</p>
          <p
            className={`text-xl md:text-2xl font-bold mt-1 tabular-nums truncate ${
              netStock >= 0 ? 'text-gray-900' : 'text-red-600'
            }`}
          >
            {netStock >= 0 ? '+' : ''}
            {netStock.toLocaleString()}
          </p>
          <div className="h-1.5 rounded-full bg-gray-100 mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                usedPct > 0 ? 'bg-gradient-to-r from-[#7FA345] to-emerald-500' : 'bg-gray-200'
              }`}
              style={{ width: `${Math.min(Math.max(usedPct, 0), 100)}%` }}
            />
          </div>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate">
            {usedPct > 0 ? `${usedPct.toFixed(0)}% đã dùng` : 'Không có dữ liệu'}
            {outCount > 0 && ` · ${outCount} hết hàng`}
          </p>
        </div>
      </div>

      {/* ─── Tồn kho view ─── */}
      {view === 'stock' && (
        <div className="card mb-6 animate-[slideDown_0.2s_ease-out]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Tồn kho hiện tại</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {stockItems.length} mặt hàng · {outCount} hết hàng · {lowCount} sắp hết
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full bg-red-50 text-red-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Hết hàng
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Sắp hết
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Còn hàng
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stockItems.map((item) => {
              const isOut = item.qty <= 0;
              const isLow = item.qty > 0 && item.qty <= LOW_STOCK_THRESHOLD;
              const pct = (item.qty / maxStock) * 100;
              return (
                <div
                  key={item.key}
                  className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-pink-200 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0 ${
                          item.type === 'CHARM'
                            ? 'bg-pink-50 text-pink-500'
                            : item.type === 'BASE'
                              ? 'bg-avocado-50 text-avocado-600'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <FlaticonIcon
                          name={item.type === 'CHARM' ? 'stars' : 'box'}
                          size="sm"
                          className="text-inherit"
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 truncate flex-1">
                        {item.name}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-bold tabular-nums flex-shrink-0 ${
                        isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {item.qty.toLocaleString()}
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
                  <div className="mt-1.5">
                    {isOut ? (
                      <span className="text-[10px] text-red-500 font-medium">
                        ⚠ Hết hàng — cần nhập thêm
                      </span>
                    ) : isLow ? (
                      <span className="text-[10px] text-amber-500 font-medium">
                        ⚠ Sắp hết (≤ {LOW_STOCK_THRESHOLD})
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-500 font-medium">● Còn hàng</span>
                    )}
                  </div>
                </div>
              );
            })}
            {stockItems.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  emoji="📦"
                  title="Chưa có dữ liệu tồn kho"
                  message="Ghi nhận giao dịch nhập kho đầu tiên để bắt đầu theo dõi tồn kho."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Filter card (Giao dịch view) ─── */}
      {view === 'transactions' && (
        <div className="relative rounded-xl bg-white border border-gray-200/80 shadow-sm mb-4 sm:mb-6">
          <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center text-white shadow-sm">
                <FlaticonIcon name="bars-filter" size="sm" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Bộ lọc</h2>
                <p className="text-[11px] text-gray-400">
                  Lọc theo loại giao dịch, sản phẩm và ngày
                </p>
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-pink-600 bg-pink-50 hover:bg-pink-100 border border-pink-200/70 rounded-full px-3 py-1.5 transition-colors flex-shrink-0"
              >
                <FlaticonIcon name="refresh" size="xs" />
                Xóa bộ lọc ({activeFilterCount})
              </button>
            )}
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {/* Type chips */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-1 h-3.5 rounded-full bg-pink-400 inline-block" />
                Loại giao dịch
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:flex-wrap md:overflow-visible md:pb-0">
                <button
                  onClick={() => {
                    setTypeFilter('');
                    setPage(1);
                  }}
                  className={`filter-chip flex-shrink-0 ${!typeFilter ? 'filter-chip-active' : ''}`}
                >
                  Tất cả <span className="text-gray-400 ml-1">({transactions.length})</span>
                </button>
                {Object.entries(typeConfig).map(([type, cfg]) => (
                  <button
                    key={type}
                    onClick={() => {
                      setTypeFilter(type);
                      setPage(1);
                    }}
                    className={`filter-chip flex-shrink-0 ${typeFilter === type ? 'filter-chip-active' : ''}`}
                  >
                    <FlaticonIcon name={cfg.icon} size="sm" className="inline-flex" />
                    <span>{cfg.label}</span>
                    <span className="text-gray-400 ml-1">({totals[type] || 0})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Product + date */}
            <div className="flex flex-col xl:flex-row gap-3">
              <CustomSelect
                className="w-full xl:max-w-[240px]"
                value={productFilter}
                onChange={(productId) => {
                  setProductFilter(productId);
                  setPage(1);
                }}
                placeholder="Tất cả sản phẩm"
                options={[
                  { value: '', label: 'Tất cả sản phẩm' },
                  ...products.map((product) => ({
                    value: product.id,
                    label: `📦 ${product.name}`,
                  })),
                ]}
              />
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
                <CustomDate
                  className="w-full sm:w-40"
                  value={dateFrom}
                  placeholder="Từ ngày"
                  onChange={(v) => {
                    setDateFrom(v);
                    setPage(1);
                  }}
                />
                <span className="hidden sm:inline text-gray-400 text-sm flex-shrink-0">→</span>
                <CustomDate
                  className="w-full sm:w-40"
                  value={dateTo}
                  placeholder="Đến ngày"
                  onChange={(v) => {
                    setDateTo(v);
                    setPage(1);
                  }}
                />
              </div>
              <span className="text-sm text-gray-500 ml-auto self-center flex-shrink-0">
                {transactions.length} giao dịch
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Create Transaction Modal */}
      <InventoryForm
        isOpen={showForm}
        token={token}
        products={products}
        showToast={showToast}
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          loadData();
          loadSummary();
        }}
      />

      {/* ─── Transactions list ─── */}
      {view === 'transactions' &&
        (loading ? (
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
                      <th>Loại</th>
                      <th>Sản phẩm / Nguyên liệu</th>
                      <th className="text-left">Số lượng</th>
                      <th>Tham chiếu</th>
                      <th>Ngày</th>
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
            {/* Mobile transaction cards */}
            <div className="md:hidden">
              <div className="card p-0 overflow-hidden divide-y divide-gray-100">
                {sortedData.map((tx) => {
                  const cfg = typeConfig[tx.type];
                  const item = txIconFor(tx.product, tx.componentName);
                  return (
                    <div key={tx.id} className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg?.iconBg || 'bg-gray-100 text-gray-500'}`}
                        >
                          <FlaticonIcon
                            name={cfg?.icon || 'box'}
                            size="xs"
                            className="text-inherit"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {tx.product?.name || tx.componentName || (
                                <span className="text-gray-300 italic">—</span>
                              )}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${cfg?.chip || 'bg-gray-100 text-gray-600'}`}
                            >
                              <FlaticonIcon name={cfg?.icon || 'box'} size="xs" />
                              {cfg?.label || tx.type}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <span className={`text-sm font-bold tabular-nums ${txColor(tx.type)}`}>
                              {txSign(tx.type)}
                              {Number(tx.quantity).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                              {formatDateTime(tx.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            {Number(tx.cost) > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 tabular-nums">
                                <FlaticonIcon name="wallet" size="xs" className="text-gray-400" />
                                {formatCurrency(Number(tx.cost))}
                              </span>
                            )}
                            {tx.reference && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 font-mono">
                                <FlaticonIcon name="barcode" size="xs" className="text-gray-400" />
                                {tx.reference}
                              </span>
                            )}
                            {item.sub !== 'Sản phẩm' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400">
                                <FlaticonIcon name={item.icon} size="xs" />
                                {item.sub}
                              </span>
                            )}
                            {tx.notes && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] text-gray-400 truncate"
                                title={tx.notes}
                              >
                                <FlaticonIcon name="note" size="xs" />
                                <span className="truncate max-w-[140px]">{tx.notes}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {transactions.length === 0 && (
                  <table className="w-full">
                    <tbody>
                      <EmptyState
                        emoji="📊"
                        title="Không tìm thấy giao dịch"
                        message={
                          hasActiveFilters
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
                      <th>Giá vốn</th>
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
                    {sortedData.map((tx) => {
                      const cfg = typeConfig[tx.type];
                      const item = txIconFor(tx.product, tx.componentName);
                      return (
                        <tr
                          key={tx.id}
                          className="group hover:bg-mint-50/40 transition-colors duration-150"
                        >
                          {/* Loại */}
                          <td>
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg ? txColor(tx.type) : 'text-gray-500'}`}
                            >
                              <FlaticonIcon name={cfg?.icon || 'box'} size="xs" />
                              {cfg?.label || tx.type}
                            </span>
                          </td>
                          {/* Sản phẩm / Nguyên liệu */}
                          <td>
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-lg ring-1 flex items-center justify-center shadow-sm flex-shrink-0 ${item.bg}`}
                              >
                                <FlaticonIcon name={item.icon} size="sm" className="text-inherit" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate max-w-[220px]">
                                  {tx.product?.name || tx.componentName || (
                                    <span className="text-gray-300 italic">—</span>
                                  )}
                                </p>
                                {item.sub !== 'Sản phẩm' && (
                                  <p className="text-[10px] text-gray-400 font-medium">
                                    {item.sub}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          {/* Số lượng */}
                          <td className="text-left">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold tabular-nums ${cfg?.chip || 'bg-gray-100 text-gray-600'}`}
                            >
                              <span className={txColor(tx.type)}>{txSign(tx.type)}</span>
                              <span className="text-gray-900">
                                {Number(tx.quantity).toLocaleString()}
                              </span>
                            </span>
                          </td>
                          {/* Giá vốn */}
                          <td className="text-left">
                            {Number(tx.cost) > 0 ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 tabular-nums">
                                <FlaticonIcon name="wallet" size="xs" className="text-gray-400" />
                                {formatCurrency(Number(tx.cost))}
                              </span>
                            ) : (
                              <span className="text-gray-300 italic text-xs">—</span>
                            )}
                          </td>
                          {/* Tham chiếu */}
                          <td>
                            {tx.reference ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 font-mono bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">
                                <FlaticonIcon name="barcode" size="xs" className="text-gray-400" />
                                {tx.reference}
                              </span>
                            ) : (
                              <span className="text-gray-300 italic text-xs">—</span>
                            )}
                          </td>
                          {/* Ngày + notes */}
                          <td>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                                <FlaticonIcon name="calendar" size="xs" className="text-gray-400" />
                                <span className="font-medium whitespace-nowrap">
                                  {formatDateTime(tx.createdAt)}
                                </span>
                              </span>
                              {tx.notes && (
                                <span
                                  className="relative group/note flex-shrink-0"
                                  title={tx.notes}
                                >
                                  <span className="w-6 h-6 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
                                    <FlaticonIcon
                                      name="note"
                                      size="xs"
                                      className="text-amber-500"
                                    />
                                  </span>
                                  <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap opacity-0 group-hover/note:opacity-100 transition-opacity duration-150 bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-lg z-50 max-w-[260px] truncate">
                                    {tx.notes}
                                  </span>
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {transactions.length === 0 && (
                      <EmptyState
                        emoji="📊"
                        title="Không tìm thấy giao dịch"
                        message={
                          hasActiveFilters
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
        ))}
    </div>
  );
}
