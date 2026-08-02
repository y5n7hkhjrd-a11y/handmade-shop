'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@handmade-shop/shared';
import FlaticonIcon from '@/components/FlaticonIcon';
import { NumberInput } from '@/components/NumberInput';
import { useEscapeClose } from '@/hooks/useEscapeClose';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { SOCIAL_PLATFORMS } from './orderConstants';

interface OrderLineInput {
  type: 'RECIPE' | 'PRODUCT';
  recipeId: string;
  customInput: string;
  salePrice: number;
  productId: string;
  quantity: number;
  unitPrice: number;
  notes: string;
}

interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingOrder: {
    id: string;
    customerId: string;
    deadline?: string;
    notes?: string;
    paidAmount?: number;
    orderLines: Array<{
      type: string;
      recipeId?: string;
      customInput?: string;
      salePrice?: number;
      productId?: string;
      quantity?: number;
      unitPrice?: number;
      notes?: string;
    }>;
  } | null;
  token: string | null;
  customers: any[];
  products: any[];
  recipes: any[];
  matchingRules: any[];
  onSuccess: () => void;
  onCustomerCreated: (customer: any) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

function getRuleMatchInfo(input: string, pattern: string): { count: number; chars: string[] } {
  try {
    const regex = new RegExp(pattern, 'g');
    const matches = input.match(regex);
    return { count: matches ? matches.length : 0, chars: matches || [] };
  } catch {
    return { count: 0, chars: [] };
  }
}

export default function OrderForm({
  isOpen,
  onClose,
  editingOrder,
  token,
  customers,
  products,
  recipes,
  matchingRules,
  onSuccess,
  onCustomerCreated,
  showToast,
}: OrderFormProps) {
  const [form, setForm] = useState<{
    customerId: string;
    deadline: string;
    notes: string;
    paidAmount: number;
    orderLines: OrderLineInput[];
  }>({
    customerId: '',
    deadline: '',
    notes: '',
    paidAmount: 0,
    orderLines: [],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const NEW_CUSTOMER_INIT = {
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    facebook: '',
    instagram: '',
    tiktok: '',
    threads: '',
  };
  const [newCustomer, setNewCustomer] = useState({ ...NEW_CUSTOMER_INIT });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const advanceAfterSave = useRef(false);

  // Escape closes only the top-most modal (AddCustomer first, then the main form)
  useEscapeClose(onClose, isOpen && !showAddCustomer);
  useEscapeClose(() => setShowAddCustomer(false), showAddCustomer);
  useBodyScrollLock(isOpen);

  // Initialize form when opening
  useEffect(() => {
    if (isOpen) {
      if (editingOrder) {
        const orderLines = (editingOrder.orderLines || []).map((ol) => ({
          type: (ol.type || 'PRODUCT') as 'RECIPE' | 'PRODUCT',
          recipeId: ol.recipeId || '',
          customInput: ol.customInput || '',
          salePrice: Number(ol.salePrice || 0),
          productId: ol.productId || '',
          quantity: ol.quantity || 1,
          unitPrice: Number(ol.unitPrice || 0),
          notes: ol.notes || '',
        }));
        setForm({
          customerId: editingOrder.customerId,
          deadline: editingOrder.deadline ? editingOrder.deadline.split('T')[0] : '',
          notes: editingOrder.notes || '',
          paidAmount: Number(editingOrder.paidAmount) || 0,
          orderLines,
        });
      } else {
        setForm({ customerId: '', deadline: '', notes: '', paidAmount: 0, orderLines: [] });
      }
      setFormErrors({});
    }
  }, [isOpen, editingOrder]);

  // Compute cost preview for a single RECIPE line
  const getRecipeLineCost = (line: { recipeId: string; customInput: string }) => {
    const recipe = recipes.find((r: any) => r.id === line.recipeId);
    if (!recipe) return null;
    const recipeProducts = (recipe as any).recipeProducts || [];
    let materialCost = 0;
    const items = recipeProducts.map((rp: any) => {
      const product = rp.product;
      if (!product) return { ...rp, estimatedCost: 0, ruleInfo: null };
      let cost = 0;
      let ruleInfo: { name: string; code: string; count: number } | null = null;
      if (product.type === 'BASE') {
        cost = Number(product.cost) * rp.quantity;
      } else if (rp.matchingRuleId) {
        const rule = matchingRules.find((mr: any) => mr.id === rp.matchingRuleId);
        if (rule && rule.pattern) {
          const info = getRuleMatchInfo(line.customInput, rule.pattern);
          ruleInfo = { name: rule.name, code: rule.code, count: info.count };
          cost = info.count * Number(product.cost) * rp.quantity;
        }
      }
      materialCost += cost;
      return { ...rp, estimatedCost: cost, ruleInfo };
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
      const body: Record<string, any> = {
        deadline: form.deadline || undefined,
        notes: form.notes,
        orderLines: form.orderLines.map((line) => {
          if (line.type === 'RECIPE') {
            return {
              type: 'RECIPE' as const,
              recipeId: line.recipeId,
              customInput: line.customInput,
              salePrice: Number(line.salePrice) || 0,
              quantity: line.quantity || 1,
              notes: line.notes || undefined,
            };
          }
          return {
            type: 'PRODUCT' as const,
            productId: line.productId,
            quantity: line.quantity || 1,
            unitPrice: Number(line.unitPrice) || 0,
            notes: line.notes || undefined,
          };
        }),
      };

      // Reset payment when editing order lines (prices may have changed)
      if (editingOrder) {
        body.paidAmount = 0;
      } else {
        body.paidAmount = form.paidAmount || 0;
      }

      if (editingOrder) {
        await apiClient(`/orders/${editingOrder.id}/lines`, { method: 'PUT', body, token });
        showToast('Đã lưu thay đổi');
        if (advanceAfterSave.current) {
          advanceAfterSave.current = false;
          try {
            await apiClient(`/orders/${editingOrder.id}/status`, {
              method: 'PATCH',
              body: { status: 'WaitingConfirm' },
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

      onClose();
      setForm({ customerId: '', deadline: '', notes: '', paidAmount: 0, orderLines: [] });
      setFormErrors({});
      onSuccess();
    } catch (e: any) {
      showToast(e.message || 'Thao tác thất bại', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Create/Edit Order Modal */}
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                {editingOrder ? 'Chỉnh sửa đơn hàng' : 'Đơn hàng mới'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {editingOrder
                  ? 'Điều chỉnh sản phẩm và thông tin đơn hàng'
                  : 'Tạo đơn hàng mới cho khách — mỗi dòng có thể là sản phẩm hoặc công thức'}
              </p>
            </div>
            {editingOrder && (
              <button
                type="button"
                onClick={() => {
                  advanceAfterSave.current = true;
                  const formEl = document.querySelector('form');
                  if (formEl) formEl.requestSubmit();
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label !mb-0">
                    Khách hàng <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCustomer(true);
                      setNewCustomer({ ...NEW_CUSTOMER_INIT });
                    }}
                    className="text-xs font-medium text-avocado-600 hover:text-avocado-700 flex items-center gap-1 transition-colors"
                    title="Thêm khách hàng mới"
                  >
                    <FlaticonIcon name="plus" size="xs" /> Thêm mới
                  </button>
                </div>
                <select
                  className={`input w-full ${formErrors.customerId ? 'input-error' : ''}`}
                  value={form.customerId}
                  onChange={(e) => {
                    setForm({ ...form, customerId: e.target.value });
                    if (formErrors.customerId) setFormErrors({ ...formErrors, customerId: '' });
                  }}
                >
                  <option value="">Chọn khách hàng...</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {formErrors.customerId && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.customerId}</p>
                )}
              </div>
              <div>
                <label className="label">Hạn chót</label>
                <input
                  type="date"
                  className="input"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
            </div>

            {/* Order Lines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label !mb-0">Sản phẩm / Công thức</label>
              </div>

              {form.orderLines.map((line, idx) => {
                const type = line.type;
                return (
                  <div
                    key={idx}
                    className="p-4 mb-3 bg-white border border-gray-200 rounded-xl relative group/line"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const lines = form.orderLines.filter((_, i) => i !== idx);
                        setForm({ ...form, orderLines: lines });
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-300 transition-all opacity-0 group-hover/line:opacity-100 shadow-sm"
                      title="Xóa dòng này"
                    >
                      ✕
                    </button>

                    {/* Line type toggle */}
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          const lines = [...form.orderLines];
                          lines[idx] = {
                            ...lines[idx]!,
                            type: 'RECIPE',
                            recipeId: line.recipeId || '',
                            customInput: line.customInput || '',
                            salePrice: line.salePrice || 0,
                            productId: '',
                            quantity: 1,
                            unitPrice: 0,
                          };
                          setForm({ ...form, orderLines: lines });
                        }}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full transition-all ${type === 'RECIPE' ? 'bg-avocado-100 text-avocado-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        <FlaticonIcon name="receipt" size="xs" /> Công thức
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const lines = [...form.orderLines];
                          lines[idx] = {
                            ...lines[idx]!,
                            type: 'PRODUCT',
                            recipeId: '',
                            customInput: '',
                            salePrice: 0,
                            productId: line.productId || '',
                            quantity: line.quantity || 1,
                            unitPrice: line.unitPrice || 0,
                          };
                          setForm({ ...form, orderLines: lines });
                        }}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full transition-all ${type === 'PRODUCT' ? 'bg-avocado-100 text-avocado-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        <FlaticonIcon name="box-open" size="xs" /> Sản phẩm
                      </button>
                    </div>

                    {/* RECIPE fields */}
                    {type === 'RECIPE' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label className="text-[10px] text-gray-500 font-medium">
                              Công thức
                            </label>
                            <select
                              className="input text-sm"
                              value={line.recipeId}
                              onChange={(e) => {
                                const lines = [...form.orderLines];
                                lines[idx] = { ...lines[idx]!, recipeId: e.target.value };
                                setForm({ ...form, orderLines: lines });
                              }}
                            >
                              <option value="">Chọn...</option>
                              {recipes.map((r: any) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 font-medium">
                              Số lượng
                            </label>
                            <NumberInput
                              className="input text-sm"
                              value={line.quantity}
                              onChange={(val) => {
                                const lines = [...form.orderLines];
                                lines[idx] = { ...lines[idx]!, quantity: val };
                                setForm({ ...form, orderLines: lines });
                              }}
                              min={1}
                              step={1}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                              Custom Input <span className="text-red-500">*</span>
                            </label>
                            <input
                              className="input text-sm font-mono uppercase"
                              value={line.customInput}
                              onChange={(e) => {
                                const lines = [...form.orderLines];
                                lines[idx] = {
                                  ...lines[idx]!,
                                  customInput: e.target.value.toUpperCase(),
                                };
                                setForm({ ...form, orderLines: lines });
                              }}
                              placeholder="VD: ABCD"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 font-medium">
                              Giá bán <span className="text-red-500">*</span>
                            </label>
                            <NumberInput
                              className="input text-sm"
                              value={line.salePrice}
                              onChange={(val) => {
                                const lines = [...form.orderLines];
                                lines[idx] = { ...lines[idx]!, salePrice: val };
                                setForm({ ...form, orderLines: lines });
                              }}
                              step={1000}
                              placeholder="0"
                            />
                          </div>
                        </div>
                        {/* Cost preview — each line shows the charm's matching rule inline */}
                        {line.recipeId &&
                          line.customInput &&
                          (() => {
                            const info = getRecipeLineCost({
                              recipeId: line.recipeId,
                              customInput: line.customInput,
                            });
                            if (!info) return null;
                            return (
                              <div className="p-2 bg-avocado-50 rounded-lg border border-avocado-100">
                                <p className="text-[10px] font-medium text-avocado-700 mb-1">
                                  Chi phí vật liệu ước tính:{' '}
                                  <strong>{formatCurrency(info.materialCost)}</strong>
                                </p>
                                <div className="grid grid-cols-[auto_auto_auto_auto] gap-x-2.5 items-center text-[10px] text-avocado-600">
                                  {info.items.map((item: any, ii: number) => {
                                    const ruleInfo = item.ruleInfo;
                                    return (
                                      <Fragment key={ii}>
                                        <span className="truncate font-medium text-avocado-800 min-w-0 max-w-44 py-0.5">
                                          {item.product?.name || '?'}
                                        </span>
                                        <span className="flex items-center gap-1 min-w-0 py-0.5">
                                          {ruleInfo ? (
                                            <>
                                              <span className="truncate min-w-0 max-w-40">
                                                {ruleInfo.name}
                                              </span>
                                              <code className="text-[9px] font-mono px-1 py-px rounded bg-white border border-avocado-100 text-avocado-400 flex-shrink-0">
                                                {ruleInfo.code}
                                              </code>
                                            </>
                                          ) : null}
                                        </span>
                                        <span className="flex-shrink-0 tabular-nums text-right py-0.5">
                                          {ruleInfo ? (
                                            <>
                                              <strong>{ruleInfo.count}</strong> ký tự
                                            </>
                                          ) : null}
                                        </span>
                                        <span className="flex-shrink-0 tabular-nums text-right py-0.5">
                                          {formatCurrency(item.estimatedCost)}
                                        </span>
                                      </Fragment>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                      </div>
                    )}

                    {/* PRODUCT fields */}
                    {type === 'PRODUCT' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-500 font-medium">Sản phẩm</label>
                          <select
                            className="input text-sm"
                            value={line.productId}
                            onChange={(e) => {
                              const lines = [...form.orderLines];
                              const defaultPrice = (() => {
                                const p = products.find((p: any) => p.id === e.target.value);
                                return p ? Number(p.cost || 0) : 0;
                              })();
                              lines[idx] = {
                                ...lines[idx]!,
                                productId: e.target.value,
                                unitPrice: line.unitPrice || defaultPrice,
                              };
                              setForm({ ...form, orderLines: lines });
                            }}
                          >
                            <option value="">Chọn...</option>
                            {products.map((p: any) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({formatCurrency(Number(p.cost))})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 font-medium">Giá bán</label>
                          <NumberInput
                            className="input text-sm"
                            value={line.unitPrice}
                            onChange={(val) => {
                              const lines = [...form.orderLines];
                              lines[idx] = { ...lines[idx]!, unitPrice: val };
                              setForm({ ...form, orderLines: lines });
                            }}
                            step={1000}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    )}

                    {/* Notes for any type */}
                    <div className="mt-2">
                      <textarea
                        className="input text-sm"
                        rows={1}
                        value={line.notes || ''}
                        onChange={(e) => {
                          const lines = [...form.orderLines];
                          lines[idx] = { ...lines[idx]!, notes: e.target.value };
                          setForm({ ...form, orderLines: lines });
                        }}
                        placeholder="Ghi chú cho sản phẩm này..."
                      />
                    </div>
                  </div>
                );
              })}

              {/* Add line button — pink dashed */}
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
                className="w-full py-3 border-2 border-dashed border-pink-200 rounded-xl text-sm font-medium text-avocado-500 hover:text-avocado-600 hover:border-avocado-300 hover:bg-pink-50/50 transition-all"
              >
                <FlaticonIcon name="plus" size="xs" className="mr-1" /> Thêm sản phẩm / Công thức
              </button>

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
                <div className="p-3 bg-gradient-to-br from-avocado-50 to-avocado-50/30 rounded-xl border border-avocado-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      Tổng giá trị đơn hàng
                    </span>
                    <span className="text-lg font-bold text-avocado-600">
                      {formatCurrency(totalSalePrice)}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {form.orderLines.filter((l) => l.type === 'RECIPE' && l.recipeId).length} công
                    thức,{' '}
                    {form.orderLines.filter((l) => l.type === 'PRODUCT' && l.productId).length} sản
                    phẩm
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
              <button type="button" onClick={onClose} className="btn-secondary">
                Hủy
              </button>
              <button type="submit" className="btn-primary">
                {editingOrder ? 'Lưu thay đổi' : 'Tạo đơn hàng'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                👤 Thêm khách hàng mới
              </h2>
              <button
                type="button"
                onClick={() => setShowAddCustomer(false)}
                className="btn-ghost btn-icon hover:bg-gray-100 rounded-full"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label label-required">Tên khách hàng</label>
                <input
                  className="input"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Nhập tên khách hàng"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="Email"
                  />
                </div>
                <div>
                  <label className="label">Số điện thoại</label>
                  <input
                    className="input"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="Số điện thoại"
                  />
                </div>
              </div>
              <div>
                <label className="label">Địa chỉ</label>
                <input
                  className="input"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Địa chỉ"
                />
              </div>
              <div>
                <label className="label">Ghi chú</label>
                <textarea
                  className="input"
                  rows={2}
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  placeholder="Ghi chú về khách hàng"
                />
              </div>
            </div>

            {/* Social Links */}
            <div className="px-5 pb-1">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-1 h-3.5 rounded-full bg-avocado-400 inline-block" />
                Mạng xã hội
              </p>
              <div className="grid grid-cols-2 gap-3">
                {SOCIAL_PLATFORMS.filter((p) => !p.phoneBased).map((platform) => (
                  <div key={platform.key}>
                    <label className="text-[11px] text-gray-400 mb-1 flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5">{platform.icon}</span>
                      {platform.label}
                    </label>
                    <input
                      className="input text-sm"
                      value={(newCustomer as any)[platform.key] || ''}
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, [platform.key]: e.target.value })
                      }
                      placeholder="URL hoặc username"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2.5 p-2.5 bg-mint-50 rounded-lg border border-mint-100">
                <div className="flex items-center gap-1.5 text-[11px] text-mint-700">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#0068FF">
                    <path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z" />
                  </svg>
                  <span>Zalo sẽ dùng số điện thoại của khách hàng</span>
                </div>
              </div>
            </div>

            <div className="p-5 border-t flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddCustomer(false)}
                className="btn-secondary"
                disabled={creatingCustomer}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!token) return;
                  if (!newCustomer.name.trim()) {
                    showToast('Vui lòng nhập tên khách hàng', 'error');
                    return;
                  }
                  setCreatingCustomer(true);
                  try {
                    const res = await apiClient<any>('/customers', {
                      method: 'POST',
                      body: {
                        name: newCustomer.name.trim(),
                        email: newCustomer.email || undefined,
                        phone: newCustomer.phone || undefined,
                        address: newCustomer.address || undefined,
                        notes: newCustomer.notes || undefined,
                        facebook: newCustomer.facebook || undefined,
                        instagram: newCustomer.instagram || undefined,
                        tiktok: newCustomer.tiktok || undefined,
                        threads: newCustomer.threads || undefined,
                      },
                      token,
                    });
                    const created = res.data;
                    onCustomerCreated(created);
                    setForm({ ...form, customerId: created.id });
                    setShowAddCustomer(false);
                    showToast('Đã thêm khách hàng mới', 'success');
                  } catch (e: any) {
                    showToast(e.message || 'Thêm khách hàng thất bại', 'error');
                  } finally {
                    setCreatingCustomer(false);
                  }
                }}
                className="btn-primary"
                disabled={creatingCustomer}
              >
                {creatingCustomer ? 'Đang thêm...' : 'Thêm khách hàng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
