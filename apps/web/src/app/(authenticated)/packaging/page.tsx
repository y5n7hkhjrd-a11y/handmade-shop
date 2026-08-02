'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@handmade-shop/shared';
import { NumberInput } from '@/components/NumberInput';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { SkeletonCard } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import FlaticonIcon from '@/components/FlaticonIcon';
import Pagination from '@/components/Pagination';

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
  ITEM: { icon: 'box', badge: 'badge-blue', label: 'Per Item' },
  ORDER: { icon: 'gift', badge: 'badge-pink', label: 'Per Order' },
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'ITEM',
    description: '',
    components: [{ name: '', quantity: 0, unit: 'pieces', cost: 0 }],
  });
  const { toast, showToast } = useToast();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await apiClient('/packaging', {
        method: 'POST',
        body: {
          ...form,
          components: form.components.map((c) => ({
            ...c,
            quantity: Number(c.quantity),
            cost: Number(c.cost),
          })),
        },
        token,
      });
      showToast('Đã tạo mẫu đóng gói');
      setShowForm(false);
      setForm({
        name: '',
        type: 'ITEM',
        description: '',
        components: [{ name: '', quantity: 0, unit: 'pieces', cost: 0 }],
      });
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
          components: tpl.components.map((c) => ({
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-mint-500 flex items-center justify-center text-white shadow-sm">
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
              <p className="text-xs text-gray-400 mt-0.5">Phương án đóng gói</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary !gap-1.5 !px-4">
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
          📦 Per Item <span className="text-gray-400 ml-1">({itemTemplates.length})</span>
        </button>
        <button
          onClick={() => {
            setTypeFilter('ORDER');
            setPage(1);
          }}
          className={`filter-chip ${typeFilter === 'ORDER' ? 'filter-chip-active' : ''}`}
        >
          🎁 Per Order <span className="text-gray-400 ml-1">({orderTemplates.length})</span>
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
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
        </span>
      </div>

      {showForm && (
        <div
          className="modal-overlay"
          onClick={() => setShowForm(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add Packaging Template</h2>
              <p className="text-sm text-gray-500 mt-1">
                Define a new packaging option for items or orders
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
                  <select
                    className="input"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="ITEM">📦 Per Item</option>
                    <option value="ORDER">🎁 Per Order</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of this packaging option"
                />
              </div>
              <div>
                <label className="label">Components</label>
                {form.components.map((comp, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                    <input
                      className="input text-sm"
                      placeholder="Name"
                      value={comp.name}
                      onChange={(e) => {
                        const c = [...form.components];
                        c[idx] = { ...c[idx]!, name: e.target.value };
                        setForm({ ...form, components: c });
                      }}
                    />
                    <NumberInput
                      className="input text-sm"
                      placeholder="Qty"
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
                      placeholder="Unit"
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
                <button
                  type="button"
                  className="text-sm text-[#66863A] font-medium hover:text-[#7FA345]"
                  onClick={() =>
                    setForm({
                      ...form,
                      components: [
                        ...form.components,
                        { name: '', quantity: 0, unit: 'pieces', cost: 0 },
                      ],
                    })
                  }
                >
                  + Add component
                </button>
              </div>
              {form.components.some((c) => c.cost > 0) && (
                <div className="p-3 bg-pink-50 rounded-lg border border-pink-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-pink-700 font-medium">Total Packaging Cost</span>
                    <span className="text-pink-600 font-bold text-lg">
                      {formatCurrency(form.components.reduce((s, c) => s + Number(c.cost), 0))}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex gap-3 justify-end pt-2 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Template
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
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-400 to-mint-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                      <FlaticonIcon name="gift" size="md" />
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
                  <p className="font-bold text-[#7FA345] text-lg flex-shrink-0">
                    {formatCurrency(Number(tpl.totalCost))}
                  </p>
                </div>
                {tpl.description && <p className="text-sm text-gray-500 mb-3">{tpl.description}</p>}
                <div className="flex items-center justify-between">
                  <button
                    className="text-sm text-[#66863A] font-medium hover:text-[#7FA345]"
                    onClick={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
                  >
                    {expandedId === tpl.id ? '▲ Hide' : '▼ Show'} components (
                    {tpl.components.length})
                  </button>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDuplicate(tpl)}
                      className="btn-ghost btn-xs"
                      title="Nhân bản mẫu"
                      aria-label="Nhân bản mẫu"
                    >
                      {' '}
                      <FlaticonIcon name="clipboard" size="xs" />
                    </button>
                  </div>
                </div>
                {expandedId === tpl.id && (
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
                    : 'Tạo mẫu đóng gói đầu tiên cho sản phẩm hoặc đơn hàng.'
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
