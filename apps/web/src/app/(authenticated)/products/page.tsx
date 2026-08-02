'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@handmade-shop/shared';
import { NumberInput } from '@/components/NumberInput';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import FlaticonIcon from '@/components/FlaticonIcon';
import { useSort, SortIcon } from '@/hooks/useSort';
import { SkeletonRow } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import Pagination from '@/components/Pagination';

interface Product {
  id: string;
  type: string;
  name: string;
  description?: string;
  cost: number;
  isActive: boolean;
  trackInventory: boolean;
}
interface MatchingRule {
  id: string;
  code: string;
  name: string;
  pattern: string;
}

const typeConfig: Record<string, { icon: string; badge: string; desc: string }> = {
  BASE: { icon: 'square', badge: 'badge-blue', desc: 'Base component' },
  CHARM: { icon: 'stars', badge: 'badge-pink', desc: 'Charm / add-on' },
};

export default function ProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'BASE' as string,
    name: '',
    description: '',
    cost: 0,
    trackInventory: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast, showToast } = useToast();

  const loadProducts = useCallback(async () => {
    if (!token) return;
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      const res = await apiClient<any>(`/products?${new URLSearchParams(params).toString()}`, {
        token,
      });
      setProducts(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (e: any) {
      showToast(e.message || 'Tải danh sách thất bại', 'error');
    }
    setLoading(false);
  }, [token, page, typeFilter, search, showToast]);

  useEffect(() => {
    loadProducts();
  }, [token, page, typeFilter, search, loadProducts]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Vui lòng nhập tên';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !validateForm()) return;
    try {
      const body = {
        ...form,
        cost: Number(form.cost),
      };
      if (editingId) {
        await apiClient(`/products/${editingId}`, { method: 'PUT', body, token });
        showToast('Đã cập nhật nguyên vật liệu');
      } else {
        await apiClient('/products', { method: 'POST', body, token });
        showToast('Đã thêm nguyên vật liệu');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ type: 'BASE', name: '', description: '', cost: 0, trackInventory: true });
      setFormErrors({});
      loadProducts();
    } catch (e: any) {
      showToast(e.message || 'Thao tác thất bại', 'error');
    }
  };

  const handleEdit = (product: Product) => {
    setForm({
      type: product.type,
      name: product.name,
      description: product.description || '',
      cost: Number(product.cost || 0),
      trackInventory: product.trackInventory !== false,
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await apiClient(`/products/${id}`, { method: 'DELETE', token });
      showToast('Đã xóa');
      loadProducts();
    } catch (e: any) {
      showToast(e.message || 'Xóa thất bại', 'error');
    }
  };

  const confirmDelete = (product: Product) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    const icon = document.createElement('div');
    icon.className = 'text-center mb-4';
    icon.innerHTML = '<div class="text-3xl mb-3">🗑️</div>';
    const title = document.createElement('h3');
    title.className = 'text-lg font-semibold text-gray-900';
    title.textContent = `Xóa "${product.name}"?`;
    const subtitle = document.createElement('p');
    subtitle.className = 'text-sm text-gray-500 mt-1';
    subtitle.textContent = 'Hành động này không thể hoàn tác.';
    const iconText = icon.querySelector('div')!;
    iconText.after(title);
    title.after(subtitle);
    const btnRow = document.createElement('div');
    btnRow.className = 'flex gap-3 mt-6';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary flex-1';
    cancelBtn.textContent = 'Hủy';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-danger flex-1';
    deleteBtn.textContent = 'Xóa';
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(deleteBtn);
    icon.appendChild(btnRow);
    dialog.appendChild(icon);
    overlay.appendChild(dialog);
    cancelBtn.addEventListener('click', () => document.body.removeChild(overlay));
    deleteBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      handleDelete(product.id);
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
    document.body.appendChild(overlay);
  };

  const filteredProducts = products.filter(
    (p) =>
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.isActive) ||
      (statusFilter === 'inactive' && !p.isActive),
  );
  const { sortedData, sortKey, sortDir, toggleSort } = useSort(filteredProducts, 'name', 'asc');

  const handleToggleStatus = async (product: Product) => {
    if (!token) return;
    try {
      await apiClient(`/products/${product.id}`, {
        method: 'PUT',
        body: { isActive: !product.isActive },
        token,
      });
      showToast(product.isActive ? 'Đã ngừng hoạt động' : 'Đã kích hoạt');
      loadProducts();
    } catch (e: any) {
      showToast(e.message || 'Cập nhật thất bại', 'error');
    }
  };

  return (
    <div className="page-enter">
      <Toast toast={toast} />

      {/* ─── Header ─── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-pink-50 via-white to-purple-50/70 border border-pink-100/70 shadow-[0_2px_12px_-4px_rgba(232,141,171,0.15)] mb-4 sm:mb-6">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-gradient-to-br from-pink-200/25 to-purple-200/25 rounded-full blur-3xl" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-gradient-to-tr from-rose-200/20 to-pink-200/20 rounded-full blur-2xl" />
        <div className="absolute top-1/2 -translate-y-1/2 right-1/3 w-16 h-16 bg-purple-100/10 rounded-full blur-xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #e88dab 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative px-4 py-3 sm:px-6 sm:py-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-400 via-pink-500 to-purple-500 flex items-center justify-center text-white shadow-md ring-1 ring-white/60">
                    <FlaticonIcon name="box" size="lg" />
                  </div>
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-pink-300/30 to-purple-300/30 blur-sm -z-10" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                      Nguyên vật liệu
                    </h1>
                    {products.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-pink-100 text-pink-700 shadow-sm ring-1 ring-pink-200/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                        {products.length}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Định nghĩa giá trị (giá vốn) cho các thành phần
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingId(null);
                setForm({ type: 'BASE', name: '', description: '', cost: 0, trackInventory: true });
                setFormErrors({});
                setShowForm(true);
              }}
              className="btn-primary !gap-1.5 !px-4"
            >
              <span className="text-base leading-none">＋</span>
              Thêm
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-pink-200/80 to-transparent" />
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
            onKeyDown={(e) => e.key === 'Enter' && loadProducts()}
          />
        </div>
        <select
          className="input max-w-[140px]"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả loại</option>
          <option value="BASE">🔷 BASE</option>
          <option value="CHARM">✨ CHARM</option>
        </select>
        <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                statusFilter === s
                  ? 'bg-white text-[#D97D9E] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'all' ? 'Tất cả' : s === 'active' ? 'Đang dùng' : 'Ngừng dùng'}
            </button>
          ))}
        </div>
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
              <h2 className="text-xl font-semibold">
                {editingId ? 'Chỉnh sửa' : 'Thêm nguyên vật liệu'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {editingId ? 'Cập nhật giá trị' : 'Định nghĩa nguyên vật liệu mới (thành phần)'}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Loại</label>
                  <select
                    className={`input ${formErrors.type ? 'input-error' : ''}`}
                    value={form.type}
                    onChange={(e) => {
                      setForm({ ...form, type: e.target.value });
                    }}
                  >
                    <option value="BASE">🔷 BASE — Thành phần cơ bản</option>
                    <option value="CHARM">✨ CHARM — Phụ kiện</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label label-required">Tên</label>
                <input
                  className={`input ${formErrors.name ? 'input-error' : ''}`}
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    setFormErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  required
                  placeholder="VD: Phôi móc khóa"
                />
                {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
              </div>

              <div>
                <label className="label">Mô tả</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Mô tả nguyên vật liệu"
                />
              </div>

              {/* Giá vốn (Cost) */}
              <div>
                <label className="label label-required">Giá vốn (VNĐ)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    đ
                  </span>
                  <NumberInput
                    className={`input pl-7 ${formErrors.cost ? 'input-error' : ''}`}
                    value={form.cost}
                    step={100}
                    onChange={(val) => setForm({ ...form, cost: val })}
                    required
                    placeholder="0"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {form.type === 'CHARM'
                    ? 'Giá vốn trên mỗi đơn vị. Chi phí thực tế được tính dựa trên quy tắc ghép ký tự trong Công thức bán.'
                    : 'Giá vốn trên mỗi đơn vị sử dụng.'}
                </p>
              </div>

              {/* Track Inventory */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="trackInventory"
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  checked={form.trackInventory}
                  onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })}
                />
                <div>
                  <label
                    htmlFor="trackInventory"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    Theo dõi tồn kho
                  </label>
                  <p className="text-xs text-gray-400">
                    Tự động cập nhật số lượng tồn kho khi có giao dịch
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    <th>Tên</th>
                    <th>Loại</th>
                    <th className="text-left">Giá vốn</th>
                    <th>Kho</th>
                    <th>Trạng thái</th>
                    <th className="text-left">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonRow key={i} cols={6} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Mobile product cards */}
          <div className="md:hidden">
            <div className="card p-0 overflow-hidden divide-y divide-gray-100">
              {sortedData.map((p) => (
                <div key={p.id} className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${
                        p.type === 'BASE' ? 'from-blue-50 to-blue-100' : 'from-pink-50 to-pink-100'
                      } flex items-center justify-center text-lg shadow-sm flex-shrink-0`}
                    >
                      {typeConfig[p.type]?.icon ? (
                        <FlaticonIcon name={typeConfig[p.type]!.icon} size="sm" />
                      ) : (
                        '📦'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-gray-900 text-sm truncate">{p.name}</p>
                        <span
                          className={`${typeConfig[p.type]?.badge || 'badge-gray'} flex-shrink-0`}
                        >
                          {p.type}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{p.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-xs font-bold text-gray-900 tabular-nums">
                          {formatCurrency(Number(p.cost))}
                        </span>
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full transition-all duration-150 ${
                            p.isActive
                              ? 'bg-emerald-50 text-emerald-600 active:bg-emerald-100'
                              : 'bg-gray-100 text-gray-400 active:bg-gray-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          {p.isActive ? 'Đang dùng' : 'Ngừng dùng'}
                        </button>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                            p.trackInventory !== false
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {p.trackInventory !== false ? 'Theo dõi kho' : 'Không theo dõi'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(p)}
                        className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-150"
                        title="Sửa"
                        aria-label="Chỉnh sửa"
                      >
                        <FlaticonIcon name="pencil" size="xs" />
                      </button>
                      <button
                        onClick={() => confirmDelete(p)}
                        className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-150"
                        title="Xóa"
                        aria-label="Xóa"
                      >
                        <FlaticonIcon name="trash" size="xs" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <table className="w-full">
                  <tbody>
                    <EmptyState
                      emoji="📦"
                      title="Không tìm thấy nguyên vật liệu"
                      message="Thêm nguyên vật liệu đầu tiên để bắt đầu."
                    />
                  </tbody>
                </table>
              )}
            </div>
            <div className="mt-3">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>

          {/* Desktop product table */}
          <div className="card p-0 overflow-hidden hidden md:block">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th
                      className="cursor-pointer select-none group"
                      onClick={() => toggleSort('name')}
                    >
                      Tên <SortIcon sortKey="name" currentKey={sortKey} dir={sortDir} />
                    </th>
                    <th
                      className="cursor-pointer select-none group"
                      onClick={() => toggleSort('type')}
                    >
                      Loại <SortIcon sortKey="type" currentKey={sortKey} dir={sortDir} />
                    </th>
                    <th
                      className="text-left cursor-pointer select-none group"
                      onClick={() => toggleSort('cost')}
                    >
                      Giá vốn <SortIcon sortKey="cost" currentKey={sortKey} dir={sortDir} />
                    </th>
                    <th>Kho</th>
                    <th>Trạng thái</th>
                    <th className="text-left">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((p) => (
                    <tr key={p.id} className="group">
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg bg-gradient-to-br ${
                              p.type === 'BASE'
                                ? 'from-blue-50 to-blue-100'
                                : 'from-pink-50 to-pink-100'
                            } flex items-center justify-center text-lg shadow-sm`}
                          >
                            {typeConfig[p.type]?.icon ? (
                              <FlaticonIcon name={typeConfig[p.type]!.icon} size="sm" />
                            ) : (
                              '📦'
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{p.name}</p>
                            {p.description && (
                              <p className="text-xs text-gray-500 truncate max-w-[200px]">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={typeConfig[p.type]?.badge || 'badge-gray'}>{p.type}</span>
                      </td>
                      <td className="font-semibold tabular-nums text-left">
                        {formatCurrency(Number(p.cost))}
                      </td>
                      <td>
                        {p.trackInventory !== false ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Có
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Không
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`badge cursor-pointer transition-all duration-200 ${
                            p.isActive
                              ? 'badge-green hover:bg-emerald-200'
                              : 'badge-gray hover:bg-gray-200'
                          }`}
                        >
                          <span
                            className={`status-dot ${p.isActive ? 'status-dot-active' : 'status-dot-inactive'}`}
                          />
                          {p.isActive ? 'Đang dùng' : 'Ngừng dùng'}
                        </button>
                      </td>
                      <td className="text-left">
                        <div className="inline-flex items-center border border-gray-200 rounded-full overflow-hidden bg-white shadow-sm">
                          <button
                            onClick={() => handleEdit(p)}
                            className="flex items-center justify-center w-[28px] h-[28px] hover:bg-blue-50 hover:text-blue-600 transition-all duration-150 text-gray-400 border-r border-gray-200 last:border-r-0"
                            title="Sửa"
                            aria-label="Chỉnh sửa"
                          >
                            <FlaticonIcon name="pencil" size="xs" />
                          </button>
                          <button
                            onClick={() => confirmDelete(p)}
                            className="flex items-center justify-center w-[28px] h-[28px] hover:bg-red-50 hover:text-red-500 transition-all duration-150 text-gray-400 border-r border-gray-200 last:border-r-0"
                            title="Xóa"
                            aria-label="Xóa"
                          >
                            <FlaticonIcon name="trash" size="xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <EmptyState
                      emoji="📦"
                      title="Không tìm thấy nguyên vật liệu"
                      message="Thêm nguyên vật liệu đầu tiên để bắt đầu."
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
