'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@handmade-shop/shared';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { SkeletonCard } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import FlaticonIcon from '@/components/FlaticonIcon';
import Pagination from '@/components/Pagination';
import {
  ProductTypeBadge,
  type Recipe,
  type RecipeProduct,
  type Product,
  type MatchingRule,
} from './recipeConstants';
import RecipeForm from './RecipeForm';

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
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const { toast, showToast } = useToast();

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
                <FlaticonIcon name="receipt" size="md" />
              </div>
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-pink-400/20 to-purple-500/20 blur-sm -z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                  Sản phẩm bán
                </h1>
                {recipes.length > 0 && (
                  <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-white border border-gray-200 rounded-full text-gray-600 shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {recipes.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Công thức định nghĩa sản phẩm cuối cùng
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingRecipe(null);
              setShowForm(true);
            }}
            className="btn-primary !gap-1.5 !px-4"
          >
            <span>＋ Thêm sản phẩm bán</span>
          </button>
        </div>
        <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-pink-300/40 to-transparent" />
      </div>

      <div className="action-bar">
        <div className="relative flex-1 max-w-xs">
          <FlaticonIcon
            name="search"
            size="sm"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
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

      <RecipeForm
        isOpen={showForm}
        editingRecipe={editingRecipe}
        token={token}
        products={products}
        matchingRules={matchingRules}
        showToast={showToast}
        onClose={() => {
          setShowForm(false);
          setEditingRecipe(null);
        }}
        onSuccess={loadRecipes}
      />

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
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-sm">
                      <FlaticonIcon name="receipt" size="md" />
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
                      >
                        <FlaticonIcon name="trash" size="sm" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(recipe);
                        }}
                        className="btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Nhân bản"
                      >
                        <FlaticonIcon name="clipboard" size="sm" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRecipe(recipe);
                          setShowForm(true);
                        }}
                        className="btn-ghost btn-xs"
                        aria-label="Chỉnh sửa"
                      >
                        <FlaticonIcon name="pencil" size="sm" />
                      </button>
                      <span
                        className={
                          'text-gray-400 transition-transform duration-200 ' +
                          (expandedRecipe === recipe.id ? 'rotate-90' : '')
                        }
                      >
                        <FlaticonIcon name="angle-right" size="sm" />
                      </span>
                    </div>
                  </div>
                </div>
                {expandedRecipe === recipe.id && (
                  <div className="mx-5 mb-5 p-5 bg-gray-50 rounded-xl animate-[slideDown_0.2s_ease-out]">
                    {baseRp && (
                      <div className="mb-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shadow-sm">
                            <FlaticonIcon name="square" size="xs" className="text-blue-600" />
                          </div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Nền tảng
                          </h4>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm hover:shadow-md transition-all duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shadow-sm">
                                <FlaticonIcon name="square" size="sm" className="text-blue-600" />
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
                            <div className="w-7 h-7 rounded-lg bg-pink-100 flex items-center justify-center shadow-sm">
                              <FlaticonIcon name="stars" size="xs" className="text-pink-600" />
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
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center shadow-sm">
                                      <FlaticonIcon
                                        name="stars"
                                        size="sm"
                                        className="text-pink-600"
                                      />
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
                                            <FlaticonIcon
                                              name="text"
                                              size="xs"
                                              className="text-purple-500"
                                            />{' '}
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
                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shadow-sm">
                          <FlaticonIcon name="analyse" size="xs" className="text-gray-500" />
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
              emoji="📋"
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
