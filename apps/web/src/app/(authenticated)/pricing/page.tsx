'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@handmade-shop/shared';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { SkeletonRow } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import Pagination from '@/components/Pagination';

interface PricingProduct {
  id: string;
  type: string;
  name: string;
  description?: string | null;
  baseCost: number;
  isActive: boolean;
  trackInventory: boolean;
  costBreakdown: {
    baseCost: number;
    availablePackaging: {
      item: Array<{ id: string; name: string; cost: number }>;
      order: Array<{ id: string; name: string; cost: number }>;
    };
  };
}

interface ProductDetail {
  id: string;
  type: string;
  name: string;
  description?: string | null;
  baseCost: number;
  isActive: boolean;
  trackInventory: boolean;
  recipePricing: Array<{
    recipeId: string;
    recipeName: string;
    recipeDescription?: string | null;
    quantity: number;
    matchingRule: { id: string; code: string; name: string; pattern: string } | null;
    estimatedCost: number;
    charCostPerMatch: number;
  }>;
  packagingSummary: {
    item: Array<{
      id: string;
      name: string;
      totalCost: number;
      components: Array<{ name: string; quantity: number; unit: string; cost: number }>;
    }>;
    order: Array<{
      id: string;
      name: string;
      totalCost: number;
      components: Array<{ name: string; quantity: number; unit: string; cost: number }>;
    }>;
  };
}

const typeStyles: Record<string, { icon: string; color: string; gradient: string }> = {
  BASE: { icon: '🔷', color: 'bg-blue-50 text-blue-700 border-blue-200', gradient: 'from-blue-500 to-blue-600' },
  CHARM: { icon: '✨', color: 'bg-pink-50 text-pink-700 border-pink-200', gradient: 'from-pink-500 to-rose-500' },
};

export default function PricingPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<PricingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedItemPackaging, setSelectedItemPackaging] = useState<string | null>(null);
  const [selectedOrderPackaging, setSelectedOrderPackaging] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const loadProducts = useCallback(async () => {
    if (!token) return;
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      const res = await apiClient<any>(`/pricing?${new URLSearchParams(params).toString()}`, { token });
      setProducts(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (e: any) {
      showToast(e.message || 'Failed to load pricing data', 'error');
    }
    setLoading(false);
  }, [token, page, search, typeFilter, showToast]);

  useEffect(() => {
    loadProducts();
  }, [token, page, search, typeFilter, loadProducts]);

  const loadDetail = async (productId: string) => {
    if (!token) return;
    setDetailLoading(true);
    setSelectedItemPackaging(null);
    setSelectedOrderPackaging(null);
    try {
      const res = await apiClient<any>(`/pricing/${productId}`, { token });
      setSelectedProduct(res.data);
    } catch (e: any) {
      showToast(e.message || 'Failed to load product details', 'error');
    }
    setDetailLoading(false);
  };

  // Calculate total cost with selected packaging
  const calculateTotal = (product: ProductDetail | PricingProduct): number => {
    const baseCost = 'baseCost' in product ? product.baseCost : 0;
    let packagingCost = 0;

    if ('costBreakdown' in product) {
      if (selectedItemPackaging) {
        const item = product.costBreakdown.availablePackaging.item.find(p => p.id === selectedItemPackaging);
        if (item) packagingCost += item.cost;
      }
      if (selectedOrderPackaging) {
        const order = product.costBreakdown.availablePackaging.order.find(p => p.id === selectedOrderPackaging);
        if (order) packagingCost += order.cost;
      }
    }

    return baseCost + packagingCost;
  };

  const getSelectedPackagingNames = (): string => {
    const names: string[] = [];
    if (selectedItemPackaging && 'costBreakdown' in (selectedProduct || {})) {
      const item = (selectedProduct as any)?.packagingSummary?.item?.find((p: any) => p.id === selectedItemPackaging);
      if (item) names.push(item.name);
    }
    if (selectedOrderPackaging && 'costBreakdown' in (selectedProduct || {})) {
      const order = (selectedProduct as any)?.packagingSummary?.order?.find((p: any) => p.id === selectedOrderPackaging);
      if (order) names.push(order.name);
    }
    return names.join(' + ') || 'Không';
  };

  return (
    <div className="page-enter">
      <Toast toast={toast} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Định giá sản phẩm</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Chi phí nguyên vật liệu và đóng gói — {products.length} sản phẩm
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="action-bar">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            className="input pl-9"
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            onKeyDown={(e) => e.key === 'Enter' && loadProducts()}
          />
        </div>
        <select
          className="input max-w-[140px]"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="">Tất cả loại</option>
          <option value="BASE">🔷 BASE</option>
          <option value="CHARM">✨ CHARM</option>
        </select>
      </div>

      {loading ? (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Loại</th>
                  <th className="text-right">Giá vốn</th>
                  <th className="text-right">Đóng gói (ITEM)</th>
                  <th className="text-right">Đóng gói (ORDER)</th>
                  <th className="text-right">Tổng cộng</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((i) => (
                  <SkeletonRow key={i} cols={6} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Product list */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-purple-50/50 to-transparent">
              <h3 className="font-semibold text-gray-700 text-sm">Danh sách sản phẩm</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => loadDetail(product.id)}
                  className={`w-full text-left p-4 hover:bg-purple-50/50 transition-all duration-150 group ${
                    selectedProduct?.id === product.id ? 'bg-purple-50 ring-1 ring-purple-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeStyles[product.type]?.color || 'bg-gray-100 text-gray-600'}`}>
                          {typeStyles[product.type]?.icon} {product.type}
                        </span>
                        {!product.isActive && (
                          <span className="badge-gray text-[10px]">Ngừng dùng</span>
                        )}
                      </div>
                      <h4 className="font-medium text-gray-900 truncate group-hover:text-purple-700 transition-colors">
                        {product.name}
                      </h4>
                      {product.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{product.description}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-gray-900 tabular-nums">
                        {formatCurrency(product.baseCost)}
                      </p>
                      <p className="text-[10px] text-gray-400">Giá vốn</p>
                    </div>
                  </div>
                </button>
              ))}
              {products.length === 0 && (
                <EmptyState
                  icon="💰"
                  title="Không có sản phẩm"
                  message="Thêm nguyên vật liệu để xem định giá."
                />
              )}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>

          {/* Cost breakdown detail */}
          <div className="space-y-4">
            {detailLoading ? (
              <div className="card">
                <div className="space-y-4 animate-pulse">
                  <div className="skeleton h-6 w-48" />
                  <div className="skeleton h-32 w-full" />
                  <div className="skeleton h-24 w-full" />
                </div>
              </div>
            ) : selectedProduct ? (
              <>
                {/* Cost summary card */}
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border mt-1 ${typeStyles[selectedProduct.type]?.color || 'bg-gray-100 text-gray-600'}`}>
                        {typeStyles[selectedProduct.type]?.icon} {selectedProduct.type}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 tabular-nums">
                        {formatCurrency(calculateTotal(selectedProduct))}
                      </p>
                      <p className="text-xs text-gray-500">Tổng chi phí</p>
                    </div>
                  </div>

                  {/* Cost breakdown bars */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Giá vốn</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(selectedProduct.baseCost)}</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill bg-blue-500"
                          style={{ width: `${Math.min((selectedProduct.baseCost / Math.max(calculateTotal(selectedProduct), 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    {selectedItemPackaging && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Đóng gói sản phẩm</span>
                          <span className="font-semibold tabular-nums text-emerald-600">
                            +{formatCurrency(
                              (() => {
                                const item = (selectedProduct as any)?.packagingSummary?.item?.find(
                                  (p: any) => p.id === selectedItemPackaging
                                );
                                return item?.totalCost || 0;
                              })()
                            )}
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill bg-emerald-500" style={{ width: `${Math.min(((() => { const item = (selectedProduct as any)?.packagingSummary?.item?.find((p: any) => p.id === selectedItemPackaging); return item?.totalCost || 0; })() / Math.max(calculateTotal(selectedProduct), 1)) * 100, 100)}%` }} />
                        </div>
                      </div>
                    )}
                    {selectedOrderPackaging && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Đóng gói đơn hàng</span>
                          <span className="font-semibold tabular-nums text-emerald-600">
                            +{formatCurrency(
                              (() => {
                                const order = (selectedProduct as any)?.packagingSummary?.order?.find(
                                  (p: any) => p.id === selectedOrderPackaging
                                );
                                return order?.totalCost || 0;
                              })()
                            )}
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill bg-teal-500" style={{ width: `${Math.min(((() => { const order = (selectedProduct as any)?.packagingSummary?.order?.find((p: any) => p.id === selectedOrderPackaging); return order?.totalCost || 0; })() / Math.max(calculateTotal(selectedProduct), 1)) * 100, 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Packaging selector */}
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                        Đóng gói sản phẩm (ITEM)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedItemPackaging(null)}
                          className={`filter-chip ${!selectedItemPackaging ? 'filter-chip-active' : ''}`}
                        >
                          Không
                        </button>
                        {((selectedProduct as any)?.packagingSummary?.item || []).map((pkg: any) => (
                          <button
                            key={pkg.id}
                            onClick={() => setSelectedItemPackaging(pkg.id)}
                            className={`filter-chip ${selectedItemPackaging === pkg.id ? 'filter-chip-active' : ''}`}
                          >
                            {pkg.name} ({formatCurrency(pkg.totalCost)})
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                        Đóng gói đơn hàng (ORDER)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedOrderPackaging(null)}
                          className={`filter-chip ${!selectedOrderPackaging ? 'filter-chip-active' : ''}`}
                        >
                          Không
                        </button>
                        {((selectedProduct as any)?.packagingSummary?.order || []).map((pkg: any) => (
                          <button
                            key={pkg.id}
                            onClick={() => setSelectedOrderPackaging(pkg.id)}
                            className={`filter-chip ${selectedOrderPackaging === pkg.id ? 'filter-chip-active' : ''}`}
                          >
                            {pkg.name} ({formatCurrency(pkg.totalCost)})
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recipe pricing */}
                {selectedProduct.recipePricing.length > 0 && (
                  <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-3">Công thức sử dụng</h3>
                    <div className="space-y-3">
                      {selectedProduct.recipePricing.map((rp) => (
                        <div key={rp.recipeId} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{rp.recipeName}</p>
                              {rp.recipeDescription && (
                                <p className="text-xs text-gray-500 mt-0.5">{rp.recipeDescription}</p>
                              )}
                            </div>
                            <span className="font-semibold text-gray-900 tabular-nums text-sm">
                              {formatCurrency(rp.estimatedCost)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>Số lượng: {rp.quantity}</span>
                            {rp.matchingRule && (
                              <span>Quy tắc ghép: {rp.matchingRule.code}</span>
                            )}
                            {rp.charCostPerMatch > 0 && (
                              <span>Phí mỗi ký tự: {formatCurrency(rp.charCostPerMatch)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Packaging details */}
                {selectedItemPackaging && (
                  <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-3">Chi tiết đóng gói</h3>
                    {((selectedProduct as any)?.packagingSummary?.item || [])
                      .filter((pkg: any) => pkg.id === selectedItemPackaging)
                      .concat(
                        ((selectedProduct as any)?.packagingSummary?.order || []).filter(
                          (pkg: any) => pkg.id === selectedOrderPackaging
                        )
                      )
                      .map((pkg: any) => (
                        <div key={pkg.id} className="mb-3 last:mb-0">
                          <p className="text-sm font-medium text-gray-700 mb-2">{pkg.name}</p>
                          <div className="bg-gray-50 rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="text-left px-3 py-1.5 font-medium text-gray-500">Thành phần</th>
                                  <th className="text-right px-3 py-1.5 font-medium text-gray-500">SL</th>
                                  <th className="text-right px-3 py-1.5 font-medium text-gray-500">ĐVT</th>
                                  <th className="text-right px-3 py-1.5 font-medium text-gray-500">Giá</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pkg.components.map((comp: any, idx: number) => (
                                  <tr key={idx} className="border-t border-gray-200/50">
                                    <td className="px-3 py-1.5 text-gray-700">{comp.name}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{comp.quantity}</td>
                                    <td className="px-3 py-1.5 text-right">{comp.unit}</td>
                                    <td className="px-3 py-1.5 text-right font-medium tabular-nums">{formatCurrency(comp.cost)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-gray-200 bg-gray-100/50">
                                  <td colSpan={3} className="px-3 py-1.5 font-medium text-gray-700">Tổng</td>
                                  <td className="px-3 py-1.5 text-right font-bold text-gray-900 tabular-nums">{formatCurrency(pkg.totalCost)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </>
            ) : (
              <div className="card">
                <EmptyState
                  icon="👆"
                  title="Chọn sản phẩm"
                  message="Chọn một sản phẩm từ danh sách để xem chi tiết định giá."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
