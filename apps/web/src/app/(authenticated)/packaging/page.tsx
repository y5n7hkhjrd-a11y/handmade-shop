'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@handmade-shop/shared';
import { NumberInput } from '@/components/NumberInput';
import { useToast } from '@/hooks/useToast';
import { useEscapeClose } from '@/hooks/useEscapeClose';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import Toast from '@/components/Toast';
import { SkeletonCard } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import FlaticonIcon from '@/components/FlaticonIcon';
import Pagination from '@/components/Pagination';
import CustomSelect from '@/components/CustomSelect';

interface PackagingComponent {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost: number;
}
interface PackagingTemplate {
  id: string;
  name: string;
  type: string;
  description?: string;
  totalCost: number;
  components: PackagingComponent[];
}

const typeConfig: Record<string, { icon: string; badge: string; label: string }> = {
  ITEM: { icon: 'box', badge: 'badge-blue', label: 'Đóng gói từng sản phẩm' },
  ORDER: { icon: 'gift', badge: 'badge-pink', label: 'Đóng gói cả đơn' },
};

const EMPTY_FORM = {
  name: '',
  type: 'ITEM',
  description: '',
  totalCost: 0,
  useComponents: false,
  components: [{ name: '', quantity: 0, unit: 'cái', cost: 0 }],
};

export default function PackagingPage() {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<PackagingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const { toast, showToast } = useToast();

  useEscapeClose(() => setShowForm(false), showForm);
  useBodyScrollLock(showForm);

  const loadTemplates = useCallback(async () => {
    if (!token) return;
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (typeFilter) params.type = typeFilter;
      const res = await apiClient<any>(`/packaging?${new URLSearchParams(params).toString()}`, {
        token,
      });
      setTemplates(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (e: any) {
      showToast(e.message || 'Thất bại', 'error');
    }
    setLoading(false);
  }, [token, page, typeFilter, showToast]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (tpl: PackagingTemplate) => {
    setEditingId(tpl.id);
    setForm({
      name: tpl.name,
      type: tpl.type,
      description: tpl.description || '',
      totalCost: Number(tpl.totalCost) || 0,
      useComponents: (tpl.components || []).length > 0,
      components:
        (tpl.components || []).length > 0
          ? tpl.components.map((c) => ({
              name: c.name,
              quantity: Number(c.quantity),
              unit: c.unit,
              cost: Number(c.cost),
            }))
          : [{ name: '', quantity: 0, unit: 'cái', cost: 0 }],
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const body: Record<string, any> = {
      name: form.name,
      type: form.type,
      description: form.description || undefined,
      totalCost: Number(form.totalCost) || 0,
      components: form.useComponents
        ? form.components.map((c) => ({
            name: c.name,
            quantity: Number(c.quantity) || 0,
            unit: c.unit || 'cái',
            cost: Number(c.cost) || 0,
          }))
        : [],
    };
    try {
      if (editingId) {
        await apiClient(`/packaging/${editingId}`, { method: 'PUT', body, token });
        showToast('Đã cập nhật mẫu đóng gói');
      } else {
        await apiClient('/packaging', { method: 'POST', body, token });
        showToast('Đã tạo mẫu đóng gói');
      }
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setEditingId(null);
      loadTemplates();
    } catch (e: any) {
      showToast(e.message || 'Thất bại', 'error');
    }
  };

  const handleDuplicate = async (tpl: PackagingTemplate) => {
    if (!token) return;
    try {
      await apiClient('/packaging', {
        method: 'POST',
        body: {
          name: `${tpl.name} (Copy)`,
          type: tpl.type,
          description: tpl.description,
          totalCost: Number(tpl.totalCost),
          components: (tpl.components || []).map((c) => ({
            name: c.name,
            quantity: Number(c.quantity),
            unit: c.unit,
            cost: Number(c.cost),
          })),
        },
        token,
      });
      showToast('Đã nhân bản mẫu đóng gói');
      loadTemplates();
    } catch (e: any) {
      showToast(e.message || 'Nhân bản thất bại', 'error');
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      (!search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase())) &&
      (!typeFilter || t.type === typeFilter),
  );

  const itemTemplates = templates.filter((t) => t.type === 'ITEM');
  const orderTemplates = templates.filter((t) => t.type === 'ORDER');

  const componentsTotal = form.useComponents
    ? form.components.reduce((s, c) => s + Number(c.cost || 0), 0)
    : 0;

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
              <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center text-white shadow-sm">
                <FlaticonIcon name="gift" size="md" />
              </div>
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-avocado-400/20 to-mint-500/20 blur-sm -z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                  Đóng gói
                </h1>
                {templates.length > 0 && (
                  <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-white border border-gray-200 rounded-full text-gray-600 shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {templates.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Công thức đóng gói — chọn khi tạo đơn hàng
              </p>
            </div>
          </div>
          <button onClick={openCreate} className="btn-primary !gap-1.5 !px-4">
            <span>＋ Thêm phương án</span>
          </button>
        </div>
        <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-pink-300/40 to-transparent" />
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => {
            setTypeFilter('');
            setPage(1);
          }}
          className={`filter-chip ${!typeFilter ? 'filter-chip-active' : ''}`}
        >
          All <span className="text-gray-400 ml-1">({templates.length})</span>
        </button>
        <button
          onClick={() => {
            setTypeFilter('ITEM');
            setPage(1);
          }}
          className={`filter-chip ${typeFilter === 'ITEM' ? 'filter-chip-active' : ''}`}
        >
          📦 Từng sản phẩm <span className="text-gray-400 ml-1">({itemTemplates.length})</span>
        </button>
        <button
          onClick={() => {
            setTypeFilter('ORDER');
            setPage(1);
          }}
          className={`filter-chip ${typeFilter === 'ORDER' ? 'filter-chip-active' : ''}`}
        >
          🎁 Cả đơn <span className="text-gray-400 ml-1">({orderTemplates.length})</span>
        </button>
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
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <span className="text-sm text-gray-500 ml-auto">
          {filteredTemplates.length} mẫu đóng gói
        </span>
      </div>

      {showForm && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingId ? 'Sửa mẫu đóng gói' : 'Thêm mẫu đóng gói'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Giá nhập vào là <strong>giá cost</strong> — sẽ được cộng vào giá vốn khi tạo đơn
                hàng
              </p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label label-required">Tên</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="VD: Hộp quà"
                  />
                </div>
                <div>
                  <label className="label">Loại</label>
                  <CustomSelect
                    value={form.type}
                    onChange={(type) => setForm({ ...form, type })}
                    options={[
                      { value: 'ITEM', label: '📦 Từng sản phẩm' },
                      { value: 'ORDER', label: '🎁 Cả đơn' },
                    ]}
                  />
                </div>
              </div>
              <div>
                <label className="label">Mô tả</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Mô tả ngắn về phương án đóng gói này"
                />
              </div>

              {/* Giá cost chính */}
              <div>
                <label className="label label-required">
                  Giá cost ({form.type === 'ITEM' ? 'mỗi sản phẩm' : 'mỗi đơn'})
                </label>
                <NumberInput
                  className="input"
                  value={form.totalCost}
                  onChange={(val) => setForm({ ...form, totalCost: val })}
                  min={0}
                  step={1000}
                  placeholder="0"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  {form.type === 'ITEM'
                    ? 'Áp dụng cho từng sản phẩm — nhân với số lượng khi cộng vào đơn'
                    : 'Áp dụng một lần cho toàn bộ đơn hàng'}
                </p>
              </div>

              {/* Optional components breakdown */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.useComponents}
                    onChange={(e) => setForm({ ...form, useComponents: e.target.checked })}
                    className="accent-[#7FA345]"
                  />
                  Liệt kê chi tiết thành phần (tùy chọn)
                </label>
                {form.useComponents && (
                  <div className="mt-2">
                    {form.components.map((comp, idx) => (
                      <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                        <input
                          className="input text-sm"
                          placeholder="Tên"
                          value={comp.name}
                          onChange={(e) => {
                            const c = [...form.components];
                            c[idx] = { ...c[idx]!, name: e.target.value };
                            setForm({ ...form, components: c });
                          }}
                        />
                        <NumberInput
                          className="input text-sm"
                          placeholder="SL"
                          value={comp.quantity}
                          hideZero
                          onChange={(val) => {
                            const c = [...form.components];
                            c[idx] = { ...c[idx]!, quantity: val };
                            setForm({ ...form, components: c });
                          }}
                        />
                        <input
                          className="input text-sm"
                          placeholder="Đơn vị"
                          value={comp.unit}
                          onChange={(e) => {
                            const c = [...form.components];
                            c[idx] = { ...c[idx]!, unit: e.target.value };
                            setForm({ ...form, components: c });
                          }}
                        />
                        <div className="relative">
                          <NumberInput
                            className="input text-sm"
                            placeholder="Cost"
                            value={comp.cost}
                            hideZero
                            onChange={(val) => {
                              const c = [...form.components];
                              c[idx] = { ...c[idx]!, cost: val };
                              setForm({ ...form, components: c });
                            }}
                          />
                          {form.components.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setForm({
                                  ...form,
                                  components: form.components.filter((_, i) => i !== idx),
                                })
                              }
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-[10px] hover:bg-red-200"
                              aria-label="Xóa"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {componentsTotal !== Number(form.totalCost) && componentsTotal > 0 && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700 mb-2">
                        Tổng thành phần ({formatCurrency(componentsTotal)}) khác với giá cost đã
                        nhập ({formatCurrency(Number(form.totalCost))}). Giá cost đã nhập là giá
                        được dùng.
                      </div>
                    )}
                    <button
                      type="button"
                      className="text-sm text-[#66863A] font-medium hover:text-[#7FA345]"
                      onClick={() =>
                        setForm({
                          ...form,
                          components: [
                            ...form.components,
                            { name: '', quantity: 0, unit: 'cái', cost: 0 },
                          ],
                        })
                      }
                    >
                      + Thêm thành phần
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Lưu thay đổi' : 'Tạo mẫu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((tpl) => (
            <div key={tpl.id} className="card p-0 group">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0 ${
                        tpl.type === 'ITEM' ? 'bg-blue-500' : 'bg-pink-500'
                      }`}
                    >
                      <FlaticonIcon name={typeConfig[tpl.type]?.icon || 'gift'} size="md" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{tpl.name}</h3>
                      <span className={typeConfig[tpl.type]?.badge || 'badge-gray'}>
                        {typeConfig[tpl.type]?.icon ? (
                          <FlaticonIcon name={typeConfig[tpl.type]!.icon} size="sm" />
                        ) : null}{' '}
                        {typeConfig[tpl.type]?.label || tpl.type}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-[#7FA345] text-lg">
                      {formatCurrency(Number(tpl.totalCost))}
                    </p>
                    <p className="text-[10px] text-gray-400">giá cost</p>
                  </div>
                </div>
                {tpl.description && <p className="text-sm text-gray-500 mb-3">{tpl.description}</p>}
                {(tpl.components || []).length > 0 && (
                  <div className="flex items-center justify-between">
                    <button
                      className="text-sm text-[#66863A] font-medium hover:text-[#7FA345]"
                      onClick={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
                    >
                      {expandedId === tpl.id ? '▲ Ẩn' : '▼ Xem'} thành phần ({tpl.components.length}
                      )
                    </button>
                  </div>
                )}
                {expandedId === tpl.id && (tpl.components || []).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 animate-[slideDown_0.2s_ease-out]">
                    <div className="space-y-2">
                      {tpl.components.map((comp) => {
                        const pct =
                          Number(tpl.totalCost) > 0
                            ? (Number(comp.cost) / Number(tpl.totalCost)) * 100
                            : 0;
                        return (
                          <div key={comp.id}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-700 font-medium">{comp.name}</span>
                              <span className="text-gray-500">
                                {Number(comp.quantity)} {comp.unit} —{' '}
                                <span className="font-semibold text-gray-700">
                                  {formatCurrency(Number(comp.cost))}
                                </span>
                              </span>
                            </div>
                            <div className="progress-bar">
                              <div
                                className="progress-bar-fill bg-gradient-to-r from-avocado-500 to-mint-400"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Action buttons */}
                <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                  <button
                    onClick={() => handleDuplicate(tpl)}
                    className="btn-ghost btn-xs"
                    title="Nhân bản mẫu"
                    aria-label="Nhân bản mẫu"
                  >
                    <FlaticonIcon name="clipboard" size="xs" />
                  </button>
                  <button
                    onClick={() => openEdit(tpl)}
                    className="btn-ghost btn-xs"
                    title="Sửa mẫu"
                    aria-label="Sửa mẫu"
                  >
                    <FlaticonIcon name="edit" size="xs" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredTemplates.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                emoji="🎁"
                title={search || typeFilter ? 'Không tìm thấy mẫu phù hợp' : 'Chưa có mẫu đóng gói'}
                message={
                  search || typeFilter
                    ? 'Thử điều chỉnh từ khóa hoặc bộ lọc.'
                    : 'Tạo mẫu đóng gói đầu tiên để chọn khi tạo đơn hàng.'
                }
              />
            </div>
          )}
        </div>
      )}
      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
