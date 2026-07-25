'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@handmade-shop/shared';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { SkeletonCard } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import Pagination from '@/components/Pagination';

interface MatchingRule {
  id: string;
  code: string;
  name: string;
  pattern: string;
}
interface RecipeProduct {
  id: string;
  productId: string;
  quantity: number;
  matchingRuleId?: string | null;
  product: { id: string; name: string; type: string; cost: number };
}
interface Product {
  id: string;
  name: string;
  type: string;
  cost: number;
  isActive?: boolean;
}
interface Recipe {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  recipeProducts?: RecipeProduct[];
}

function ProductTypeBadge({ type }: { type: string }) {
  if (type === 'BASE') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
        🔷 Nền tảng
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-pink-50 text-pink-700">
      ✨ Bổ sung
    </span>
  );
}

export default function RecipesPage() {
  const { token } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [matchingRules, setMatchingRules] = useState<MatchingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    notes: '',
    baseProductId: '',
    charmProducts: [] as Array<{ productId: string; matchingRuleId: string }>,
  });
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const baseProducts = products.filter((p) => p.isActive !== false && p.type === 'BASE');
  const charmProductsMaster = products.filter((p) => p.isActive !== false && p.type === 'CHARM');

  const loadRecipes = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiClient<any>(`/recipes?page=${page}&limit=20`, { token });
      setRecipes(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (e: any) {
      showToast(e.message || 'Thất bại', 'error');
    }
    setLoading(false);
  }, [token, page, showToast]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  useEffect(() => {
    if (token) {
      apiClient('/products?limit=100', { token })
        .then((r: any) => setProducts(r.data || []))
        .catch(() => {});
      apiClient('/matching-rules/all', { token })
        .then((r: any) => setMatchingRules(r.data || []))
        .catch(() => {});
    }
  }, [token]);

  const resetForm = () => {
    const defaultBaseId = baseProducts.length > 0 ? baseProducts[0]!.id : '';
    setForm({
      name: '',
      description: '',
      notes: '',
      baseProductId: defaultBaseId,
      charmProducts: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!form.baseProductId) {
      showToast('Vui lòng chọn sản phẩm nền tảng (BASE)', 'error');
      return;
    }

    // Validate: mỗi CHARM đã chọn phải có quy tắc ghép (prefix)
    const invalidCharms = form.charmProducts.filter((cp) => cp.productId && !cp.matchingRuleId);
    if (invalidCharms.length > 0) {
      showToast('Vui lòng chọn quy tắc ghép (Prefix) cho tất cả CHARM đã chọn', 'error');
      return;
    }

    try {
      const recipeProducts = [
        { productId: form.baseProductId, quantity: 1 },
        ...form.charmProducts
          .filter((cp) => cp.productId)
          .map((cp) => ({
            productId: cp.productId,
            quantity: 1,
            matchingRuleId: cp.matchingRuleId || undefined,
          })),
      ];
      const body = {
        name: form.name,
        description: form.description || undefined,
        notes: form.notes || undefined,
        recipeProducts,
      };
      if (editingId) {
        await apiClient(`/recipes/${editingId}`, { method: 'PUT', body, token });
        showToast('Đã cập nhật sản phẩm bán');
      } else {
        await apiClient('/recipes', { method: 'POST', body, token });
        showToast('Đã tạo sản phẩm bán');
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadRecipes();
    } catch (e: any) {
      showToast(e.message || 'Thất bại', 'error');
    }
  };

  const handleEdit = (r: Recipe) => {
    const rps = r.recipeProducts || [];
    const baseRp = rps.find((rp) => rp.product?.type === 'BASE');
    const charms = rps.filter((rp) => rp.product?.type === 'CHARM');
    setForm({
      name: r.name,
      description: r.description || '',
      notes: r.notes || '',
      baseProductId: baseRp?.productId || '',
      charmProducts: charms.map((c) => ({
        productId: c.productId,
        matchingRuleId: c.matchingRuleId || '',
      })),
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleDuplicate = async (recipe: Recipe) => {
    if (!token) return;
    try {
      await apiClient('/recipes', {
        method: 'POST',
        body: {
          name: `${recipe.name} (Copy)`,
          description: recipe.description,
          notes: recipe.notes,
          recipeProducts: (recipe.recipeProducts || []).map((rp) => ({
            productId: rp.productId,
            quantity: rp.quantity,
            matchingRuleId: rp.matchingRuleId || undefined,
          })),
        },
        token,
      });
      showToast('Đã nhân bản sản phẩm bán');
      loadRecipes();
    } catch (e: any) {
      showToast(e.message || 'Nhân bản thất bại', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await apiClient(`/recipes/${id}`, { method: 'DELETE', token });
      showToast('Đã xóa sản phẩm bán');
      if (expandedRecipe === id) setExpandedRecipe(null);
      loadRecipes();
    } catch (e: any) {
      showToast(e.message || 'Xóa thất bại', 'error');
    }
  };

  const confirmDelete = (recipe: Recipe) => {
    const overlay = document.createElement('div');
    overlay.className =
      'fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]';
    const dialog = document.createElement('div');
    dialog.className = 'bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full border border-gray-100';
    dialog.innerHTML = `
      <div class="text-center">
        <div class="text-3xl mb-3">🗑️</div>
        <h3 class="text-lg font-semibold text-gray-900">Xóa "${recipe.name}"?</h3>
        <p class="text-sm text-gray-500 mt-1">Hành động này không thể hoàn tác.</p>
      </div>
      <div class="flex gap-3 mt-6">
        <button id="cancel-btn" class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Hủy</button>
        <button id="delete-btn" class="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors">Xóa</button>
      </div>
    `;
    dialog
      .querySelector('#cancel-btn')!
      .addEventListener('click', () => document.body.removeChild(overlay));
    dialog.querySelector('#delete-btn')!.addEventListener('click', () => {
      document.body.removeChild(overlay);
      handleDelete(recipe.id);
    });
    overlay.appendChild(dialog);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
    document.body.appendChild(overlay);
  };

  const filteredRecipes = recipes.filter(
    (r) =>
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()),
  );

  // Build used matching rule IDs from current form CHARM selections
  const getUsedRuleIds = () => {
    const used = new Set<string>();
    form.charmProducts.forEach((cp) => {
      if (cp.matchingRuleId) used.add(cp.matchingRuleId);
    });
    return used;
  };

  return (
    <div className="page-enter">
      <Toast toast={toast} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sản phẩm bán</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Công thức định nghĩa sản phẩm cuối cùng — {recipes.length} sản phẩm
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            resetForm();
            setShowForm(true);
          }}
          className="btn-primary"
        >
          + Thêm sản phẩm bán
        </button>
      </div>

      <div className="action-bar">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            className="input pl-9"
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <span className="text-sm text-gray-500 ml-auto">{filteredRecipes.length} sản phẩm</span>
      </div>

      {showForm && (
        <div
          className="modal-overlay"
          onClick={() => setShowForm(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-content max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingId ? 'Chỉnh sửa' : 'Thêm sản phẩm bán'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {editingId ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm cuối cùng để bán'}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label label-required">Tên sản phẩm bán</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="VD: Móc khóa Custom"
                />
              </div>
              <div>
                <label className="label">Mô tả</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Mô tả sản phẩm bán ra"
                />
              </div>

              {/* BASE section */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-50/30 rounded-xl p-5 border border-blue-100/80 transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-base shadow-sm">
                      🔷
                    </div>
                    <div>
                      <label className="font-semibold text-gray-800 text-sm">
                        Sản phẩm nền tảng
                      </label>
                      <p className="text-[11px] text-gray-500">
                        Chọn 1 BASE làm nền cho sản phẩm bán
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-100/80 px-2.5 py-1 rounded-full">
                    Bắt buộc
                  </span>
                </div>
                {baseProducts.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-amber-500">⚠️</span>
                    <p className="text-xs text-amber-700">
                      Chưa có sản phẩm BASE. Vui lòng tạo nguyên vật liệu BASE trước.
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      className="input w-full pr-24 appearance-none"
                      value={form.baseProductId}
                      onChange={(e) => setForm({ ...form, baseProductId: e.target.value })}
                    >
                      {baseProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-blue-100/60 px-2 py-1 rounded-md pointer-events-none">
                      <span className="text-[10px] text-blue-500 font-medium">Giá vốn</span>
                      <span className="text-xs font-bold text-blue-700 tabular-nums">
                        {(() => {
                          const p = products.find((pr) => pr.id === form.baseProductId);
                          return p ? formatCurrency(Number(p.cost)) : '0₫';
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* CHARM section */}
              <div className="bg-gradient-to-br from-pink-50 to-pink-50/30 rounded-xl p-5 border border-pink-100/80 transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-base shadow-sm">
                      ✨
                    </div>
                    <div>
                      <label className="font-semibold text-gray-800 text-sm">
                        Phụ kiện bổ sung
                      </label>
                      <p className="text-[11px] text-gray-500">
                        Thêm CHARM để cá nhân hóa sản phẩm
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-pink-600 bg-pink-100/80 px-2.5 py-1 rounded-full">
                    Không bắt buộc
                  </span>
                </div>

                {/* Header row */}
                {form.charmProducts.length > 0 && (
                  <div className="hidden sm:grid grid-cols-[7fr_3fr_auto] gap-2 px-1 mb-1.5">
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                      Sản phẩm
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                      Quy tắc ghép
                    </span>
                  </div>
                )}

                {/* Charm rows */}
                {form.charmProducts.map((cp, idx) => {
                  const selectedProduct = products.find((p) => p.id === cp.productId);
                  const usedRuleIds = getUsedRuleIds();
                  if (cp.matchingRuleId) usedRuleIds.delete(cp.matchingRuleId);
                  const availableRules = matchingRules.filter((r) => !usedRuleIds.has(r.id));
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-lg border border-pink-200/60 p-2.5 shadow-sm mb-2 last:mb-3 transition-all duration-200 hover:border-pink-300/80 hover:shadow-md"
                    >
                      {/* Mobile: flex row for select + delete */}
                      <div className="flex items-center gap-2 mb-2 sm:hidden">
                        <select
                          className="input text-sm flex-1 appearance-none"
                          value={cp.productId}
                          onChange={(e) => {
                            const cps = [...form.charmProducts];
                            cps[idx] = { productId: e.target.value, matchingRuleId: '' };
                            setForm({ ...form, charmProducts: cps });
                          }}
                        >
                          <option value="">Chọn CHARM...</option>
                          {charmProductsMaster.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              charmProducts: form.charmProducts.filter((_, i) => i !== idx),
                            })
                          }
                          className="w-7 h-7 bg-red-50 text-red-400 rounded-lg flex items-center justify-center text-xs hover:bg-red-100 hover:text-red-600 transition-all duration-200 flex-shrink-0"
                          aria-label="Xóa CHARM"
                          title="Xóa CHARM"
                        >
                          ✕
                        </button>
                      </div>
                      {/* Mobile: rule select + cost below */}
                      <div className="sm:hidden space-y-2">
                        {cp.productId &&
                          (availableRules.length > 0 ? (
                            <select
                              className="input text-xs w-full appearance-none"
                              value={cp.matchingRuleId}
                              onChange={(e) => {
                                const cps = [...form.charmProducts];
                                cps[idx] = { ...cps[idx], matchingRuleId: e.target.value };
                                setForm({ ...form, charmProducts: cps });
                              }}
                            >
                              <option value="">Chọn quy tắc...</option>
                              {availableRules.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-[11px] text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-md text-center">
                              ⚠ Hết quy tắc
                            </div>
                          ))}
                        <p className="text-xs text-gray-500">
                          Giá vốn:{' '}
                          <span className="font-semibold text-pink-700">
                            {selectedProduct ? formatCurrency(Number(selectedProduct.cost)) : '0₫'}
                          </span>
                        </p>
                      </div>

                      {/* Desktop: grid layout — Charm 70%, prefix 30% */}
                      <div className="hidden sm:grid sm:grid-cols-[7fr_3fr_auto] gap-2 items-center">
                        {/* Product select với badge giá vốn inline */}
                        <div className="relative">
                          <select
                            className="input text-xs w-full pr-24 appearance-none"
                            value={cp.productId}
                            onChange={(e) => {
                              const cps = [...form.charmProducts];
                              cps[idx] = { productId: e.target.value, matchingRuleId: '' };
                              setForm({ ...form, charmProducts: cps });
                            }}
                          >
                            <option value="">Chọn CHARM...</option>
                            {charmProductsMaster.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-pink-100/60 px-2 py-1 rounded-md pointer-events-none">
                            <span className="text-[10px] text-pink-500 font-medium">Giá vốn</span>
                            <span className="text-xs font-bold text-pink-700 tabular-nums">
                              {selectedProduct
                                ? formatCurrency(Number(selectedProduct.cost))
                                : '0₫'}
                            </span>
                          </div>
                        </div>

                        {/* Matching rule — luôn hiện trong grid */}
                        {availableRules.length > 0 ? (
                          <select
                            className="input text-xs w-full appearance-none"
                            value={cp.matchingRuleId}
                            onChange={(e) => {
                              const cps = [...form.charmProducts];
                              cps[idx] = { ...cps[idx], matchingRuleId: e.target.value };
                              setForm({ ...form, charmProducts: cps });
                            }}
                          >
                            <option value="">Chọn quy tắc...</option>
                            {availableRules.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="text-[11px] text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-md text-center">
                            <span>⚠ Hết quy tắc</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              charmProducts: form.charmProducts.filter((_, i) => i !== idx),
                            })
                          }
                          className="w-7 h-7 bg-red-50 text-red-400 rounded-lg flex items-center justify-center text-xs hover:bg-red-100 hover:text-red-600 transition-all duration-200 flex-shrink-0 justify-self-center"
                          aria-label="Xóa CHARM"
                          title="Xóa CHARM"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add CHARM button */}
                {(() => {
                  const allUsed =
                    charmProductsMaster.length > 0 &&
                    charmProductsMaster.every((p) =>
                      form.charmProducts.some((cp) => cp.productId === p.id),
                    );
                  return !allUsed ? (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          charmProducts: [
                            ...form.charmProducts,
                            { productId: '', matchingRuleId: '' },
                          ],
                        })
                      }
                      className="w-full py-2.5 border-2 border-dashed border-pink-200/70 rounded-lg text-sm font-medium text-pink-500 hover:text-pink-700 hover:border-pink-300 hover:bg-pink-50/50 transition-all duration-200 flex items-center justify-center gap-2 group/add"
                    >
                      <span className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center text-xs group-hover/add:bg-pink-200 transition-colors">
                        +
                      </span>
                      Thêm CHARM
                    </button>
                  ) : null;
                })()}
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Cập nhật' : 'Tạo sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecipes.map((recipe) => {
            const totalCost = (recipe.recipeProducts || []).reduce(
              (s, rp) => s + Number(rp.product?.cost || 0) * rp.quantity,
              0,
            );
            const baseRp = (recipe.recipeProducts || []).find((rp) => rp.product?.type === 'BASE');
            const charmRps = (recipe.recipeProducts || []).filter(
              (rp) => rp.product?.type === 'CHARM',
            );
            const getRuleCode = (rp: RecipeProduct) => {
              if (rp.matchingRuleId) {
                const rule = matchingRules.find((r) => r.id === rp.matchingRuleId);
                return rule ? rule.code : null;
              }
              return null;
            };
            return (
              <div key={recipe.id} className="card p-0 overflow-hidden group">
                <div
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-lg shadow-sm">
                      📋
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{recipe.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {recipe.description && (
                          <p className="text-sm text-gray-500 truncate">{recipe.description}</p>
                        )}
                        {baseRp && <span className="badge-blue text-[10px]">1 nền</span>}
                        {charmRps.length > 0 && (
                          <span className="text-xs text-gray-400">+{charmRps.length} CHARM</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-400">Giá vốn</p>
                      <p className="font-bold text-gray-900 tabular-nums">
                        {formatCurrency(totalCost)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(recipe);
                        }}
                        className="btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                        title="Xóa"
                        aria-label="Xóa"
                      >
                        🗑️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(recipe);
                        }}
                        className="btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Nhân bản"
                        aria-label="Nhân bản"
                      >
                        📋
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(recipe);
                        }}
                        className="btn-ghost btn-xs"
                        aria-label="Chỉnh sửa"
                      >
                        ✏️
                      </button>
                      <span
                        className={
                          'text-gray-400 transition-transform duration-200 ' +
                          (expandedRecipe === recipe.id ? 'rotate-90' : '')
                        }
                      >
                        ▶
                      </span>
                    </div>
                  </div>
                </div>
                {expandedRecipe === recipe.id && (
                  <div className="mx-5 mb-5 p-5 bg-gray-50 rounded-xl animate-[slideDown_0.2s_ease-out]">
                    {baseRp && (
                      <div className="mb-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-xs shadow-sm">
                            🔷
                          </div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Nền tảng
                          </h4>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm hover:shadow-md transition-all duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-lg shadow-sm">
                                🔷
                              </div>
                              <div>
                                <div className="flex items-center gap-2.5">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {baseRp.product.name}
                                  </p>
                                  <ProductTypeBadge type="BASE" />
                                </div>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  Giá vốn: {formatCurrency(Number(baseRp.product.cost))}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-400 mb-0.5">Chi phí</p>
                              <p className="text-base font-bold text-gray-900 tabular-nums">
                                {formatCurrency(Number(baseRp.product.cost))}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {charmRps.length > 0 && (
                      <div className="mb-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-pink-100 flex items-center justify-center text-xs shadow-sm">
                              ✨
                            </div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Phụ kiện bổ sung
                            </h4>
                          </div>
                          <span className="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded-full">
                            {charmRps.length} cái
                          </span>
                        </div>
                        <div className="space-y-2">
                          {charmRps.map((rp) => {
                            const ruleCode = getRuleCode(rp);
                            return (
                              <div
                                key={rp.id}
                                className="bg-white rounded-xl p-4 border border-pink-100 shadow-sm hover:shadow-md hover:border-pink-200 transition-all duration-200"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center text-lg shadow-sm">
                                      ✨
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2.5">
                                        <p className="text-sm font-semibold text-gray-900">
                                          {rp.product.name}
                                        </p>
                                        <ProductTypeBadge type="CHARM" />
                                      </div>
                                      <p className="text-[11px] text-gray-400 mt-0.5">
                                        Giá vốn:{' '}
                                        <span className="tabular-nums">
                                          {formatCurrency(Number(rp.product.cost))}
                                        </span>
                                        {ruleCode && (
                                          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-medium">
                                            <span className="text-[10px]">🔤</span>
                                            {ruleCode}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-400 mb-0.5">Chi phí</p>
                                    <p className="text-base font-bold text-gray-900 tabular-nums">
                                      {formatCurrency(Number(rp.product.cost))}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs shadow-sm">
                          📊
                        </div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Tổng chi phí
                        </h4>
                      </div>

                      <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Giá vốn (thành phần)</span>
                        <span className="text-sm font-bold text-gray-900 tabular-nums">
                          {formatCurrency(totalCost)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filteredRecipes.length === 0 && (
            <EmptyState
              icon="📋"
              title={search ? 'Không tìm thấy phù hợp' : 'Chưa có sản phẩm bán nào'}
              message={search ? 'Thử từ khóa khác.' : 'Tạo sản phẩm bán đầu tiên từ công thức.'}
            />
          )}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
