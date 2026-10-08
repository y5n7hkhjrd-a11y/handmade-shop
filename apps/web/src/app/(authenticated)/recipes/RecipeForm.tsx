'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@handmade-shop/shared';
import FlaticonIcon from '@/components/FlaticonIcon';
import CustomSelect from '@/components/CustomSelect';
import { useEscapeClose } from '@/hooks/useEscapeClose';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { type Product, type MatchingRule } from './recipeConstants';

interface RecipeFormProps {
  isOpen: boolean;
  editingRecipe: {
    id: string;
    name: string;
    description?: string;
    notes?: string;
    recipeProducts?: Array<{
      productId: string;
      quantity: number;
      matchingRuleId?: string | null;
      product?: { id: string; name: string; type: string; cost: number };
    }>;
  } | null;
  token: string | null;
  products: Product[];
  matchingRules: MatchingRule[];
  showToast: (message: string, type?: 'success' | 'error') => void;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RecipeForm({
  isOpen,
  editingRecipe,
  token,
  products,
  matchingRules,
  showToast,
  onClose,
  onSuccess,
}: RecipeFormProps) {
  const baseProducts = products.filter((p) => p.isActive !== false && p.type === 'BASE');
  const charmProductsMaster = products.filter((p) => p.isActive !== false && p.type === 'CHARM');

  const [form, setForm] = useState({
    name: '',
    description: '',
    notes: '',
    baseProductId: '',
    charmProducts: [] as Array<{ productId: string; matchingRuleId: string }>,
  });

  useEscapeClose(onClose, isOpen);
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      if (editingRecipe) {
        const rps = editingRecipe.recipeProducts || [];
        const baseRp = rps.find((rp) => rp.product?.type === 'BASE');
        const charms = rps.filter((rp) => rp.product?.type === 'CHARM');
        setForm({
          name: editingRecipe.name,
          description: editingRecipe.description || '',
          notes: editingRecipe.notes || '',
          baseProductId: baseRp?.productId || '',
          charmProducts: charms.map((c) => ({
            productId: c.productId,
            matchingRuleId: c.matchingRuleId || '',
          })),
        });
      } else {
        const defaultBaseId = baseProducts.length > 0 ? baseProducts[0]!.id : '';
        setForm({
          name: '',
          description: '',
          notes: '',
          baseProductId: defaultBaseId,
          charmProducts: [],
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingRecipe]);

  const getUsedRuleIds = () => {
    const used = new Set<string>();
    form.charmProducts.forEach((cp) => {
      if (cp.matchingRuleId) used.add(cp.matchingRuleId);
    });
    return used;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!form.baseProductId) {
      showToast('Vui lòng chọn sản phẩm nền tảng (BASE)', 'error');
      return;
    }
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
      if (editingRecipe) {
        await apiClient(`/recipes/${editingRecipe.id}`, { method: 'PUT', body, token });
        showToast('Đã cập nhật sản phẩm bán');
      } else {
        await apiClient('/recipes', { method: 'POST', body, token });
        showToast('Đã tạo sản phẩm bán');
      }
      onClose();
      setForm({ name: '', description: '', notes: '', baseProductId: '', charmProducts: [] });
      onSuccess();
    } catch (e: any) {
      showToast(e.message || 'Thất bại', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">
            {editingRecipe ? 'Chỉnh sửa' : 'Thêm sản phẩm bán'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {editingRecipe ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm cuối cùng để bán'}
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
          <div className="bg-gradient-to-br from-avocado-50 to-avocado-50/30 rounded-xl p-5 border border-avocado-100/80 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-avocado-100 flex items-center justify-center shadow-sm">
                  <FlaticonIcon name="square" size="sm" className="text-mint-600" />
                </div>
                <div>
                  <label className="font-semibold text-gray-800 text-sm">Sản phẩm nền tảng</label>
                  <p className="text-[11px] text-gray-500">Chọn 1 BASE làm nền cho sản phẩm bán</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-mint-600 bg-avocado-100/80 px-2.5 py-1 rounded-full">
                Bắt buộc
              </span>
            </div>
            {baseProducts.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <FlaticonIcon name="triangle-warning" size="sm" className="text-amber-500" />
                <p className="text-xs text-amber-700">
                  Chưa có sản phẩm BASE. Vui lòng tạo nguyên vật liệu BASE trước.
                </p>
              </div>
            ) : (
              <div className="relative">
                <CustomSelect
                  value={form.baseProductId}
                  onChange={(baseProductId) => setForm({ ...form, baseProductId })}
                  options={baseProducts.map((p) => ({
                    value: p.id,
                    label: `${p.name} — ${formatCurrency(Number(p.cost))}`,
                  }))}
                />
              </div>
            )}
          </div>

          {/* CHARM section */}
          <div className="bg-gradient-to-br from-pink-50 to-pink-50/30 rounded-xl p-5 border border-avocado-100/80 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center shadow-sm">
                  <FlaticonIcon name="stars" size="sm" className="text-pink-600" />
                </div>
                <div>
                  <label className="font-semibold text-gray-800 text-sm">Phụ kiện bổ sung</label>
                  <p className="text-[11px] text-gray-500">Thêm CHARM để cá nhân hóa sản phẩm</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-pink-600 bg-pink-100/80 px-2.5 py-1 rounded-full">
                Không bắt buộc
              </span>
            </div>

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

            {form.charmProducts.map((cp, idx) => {
              const selectedProduct = products.find((p) => p.id === cp.productId);
              const usedRuleIds = getUsedRuleIds();
              if (cp.matchingRuleId) usedRuleIds.delete(cp.matchingRuleId);
              const availableRules = matchingRules.filter((r) => !usedRuleIds.has(r.id));
              return (
                <div
                  key={idx}
                  className="bg-white rounded-lg border border-avocado-200/60 p-2.5 shadow-sm mb-2 last:mb-3 transition-all duration-200 hover:border-avocado-300/80 hover:shadow-md"
                >
                  {/* Mobile layout */}
                  <div className="flex items-center gap-2 mb-2 sm:hidden">
                    <CustomSelect
                      className="flex-1"
                      value={cp.productId}
                      onChange={(productId) => {
                        const cps = [...form.charmProducts];
                        cps[idx] = { productId, matchingRuleId: '' };
                        setForm({ ...form, charmProducts: cps });
                      }}
                      options={[
                        { value: '', label: 'Chọn CHARM...' },
                        ...charmProductsMaster.map((p) => ({ value: p.id, label: p.name })),
                      ]}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          charmProducts: form.charmProducts.filter((_, i) => i !== idx),
                        })
                      }
                      className="w-7 h-7 bg-red-50 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all duration-200 flex-shrink-0"
                      aria-label="Xóa CHARM"
                    >
                      <FlaticonIcon name="x" size="xs" />
                    </button>
                  </div>
                  <div className="sm:hidden space-y-2">
                    {cp.productId &&
                      (availableRules.length > 0 ? (
                        <CustomSelect
                          value={cp.matchingRuleId}
                          onChange={(matchingRuleId) => {
                            const cps = [...form.charmProducts];
                            cps[idx] = { ...cps[idx], matchingRuleId };
                            setForm({ ...form, charmProducts: cps });
                          }}
                          options={[
                            { value: '', label: 'Chọn quy tắc...' },
                            ...availableRules.map((r) => ({ value: r.id, label: r.name })),
                          ]}
                        />
                      ) : (
                        <div className="text-[11px] text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-md text-center flex items-center justify-center gap-1">
                          <FlaticonIcon
                            name="triangle-warning"
                            size="xs"
                            className="text-amber-500"
                          />{' '}
                          Hết quy tắc
                        </div>
                      ))}
                    <p className="text-xs text-gray-500">
                      Giá vốn:{' '}
                      <span className="font-semibold text-pink-700">
                        {selectedProduct ? formatCurrency(Number(selectedProduct.cost)) : '0₫'}
                      </span>
                    </p>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden sm:grid sm:grid-cols-[7fr_3fr_auto] gap-2 items-center">
                    <div className="relative">
                      <CustomSelect
                        value={cp.productId}
                        onChange={(productId) => {
                          const cps = [...form.charmProducts];
                          cps[idx] = { productId, matchingRuleId: '' };
                          setForm({ ...form, charmProducts: cps });
                        }}
                        options={[
                          { value: '', label: 'Chọn CHARM...' },
                          ...charmProductsMaster.map((p) => ({
                            value: p.id,
                            label: `${p.name} — ${formatCurrency(Number(p.cost))}`,
                          })),
                        ]}
                      />
                    </div>
                    {availableRules.length > 0 ? (
                      <CustomSelect
                        value={cp.matchingRuleId}
                        onChange={(matchingRuleId) => {
                          const cps = [...form.charmProducts];
                          cps[idx] = { ...cps[idx], matchingRuleId };
                          setForm({ ...form, charmProducts: cps });
                        }}
                        options={[
                          { value: '', label: 'Chọn quy tắc...' },
                          ...availableRules.map((r) => ({ value: r.id, label: r.name })),
                        ]}
                      />
                    ) : (
                      <div className="text-[11px] text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-md text-center flex items-center justify-center gap-1">
                        <FlaticonIcon
                          name="triangle-warning"
                          size="xs"
                          className="text-amber-500"
                        />{' '}
                        Hết quy tắc
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
                      className="w-7 h-7 bg-red-50 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all duration-200 flex-shrink-0 justify-self-center"
                      aria-label="Xóa CHARM"
                    >
                      <FlaticonIcon name="x" size="xs" />
                    </button>
                  </div>
                </div>
              );
            })}

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
                      charmProducts: [...form.charmProducts, { productId: '', matchingRuleId: '' }],
                    })
                  }
                  className="w-full py-2.5 border-2 border-dashed border-avocado-200/70 rounded-lg text-sm font-medium text-pink-500 hover:text-pink-700 hover:border-avocado-300 hover:bg-pink-50/50 transition-all duration-200 flex items-center justify-center gap-2 group/add"
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
            <button type="button" onClick={onClose} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              {editingRecipe ? 'Cập nhật' : 'Tạo sản phẩm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
