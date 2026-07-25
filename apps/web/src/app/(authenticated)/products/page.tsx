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
  BASE: { icon: '🔷', badge: 'badge-blue', desc: 'Base component' },
  CHARM: { icon: '✨', badge: 'badge-pink', desc: 'Charm / add-on' },
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nguyên vật liệu</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Định nghĩa giá trị (giá vốn) cho các thành phần — {products.length} loại
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm({ type: 'BASE', name: '', description: '', cost: 0, trackInventory: true });
            setFormErrors({});
            setShowForm(true);
          }}
          className="btn-primary"
        >
          + Thêm nguyên vật liệu
        </button>
      </div>

      <div className="action-bar">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
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
                  <input
                    className={`input pl-7 ${formErrors.cost ? 'input-error' : ''}`}
                    type="number"
                    min={0}
                    step={100}
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
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
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Loại</th>
                  <th className="text-right">Giá vốn</th>
                  <th>Kho</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
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
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Loại</th>
                  <th className="text-right">Giá vốn</th>
                  <th>Kho</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products
                  .filter(
                    (p) =>
                      statusFilter === 'all' ||
                      (statusFilter === 'active' && p.isActive) ||
                      (statusFilter === 'inactive' && !p.isActive),
                  )
                  .map((p) => (
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
                            {typeConfig[p.type]?.icon || '📦'}
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
                      <td className="font-semibold tabular-nums text-right">
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
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => handleEdit(p)}
                            className="btn-ghost btn-xs"
                            title="Chỉnh sửa"
                            aria-label="Chỉnh sửa"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => confirmDelete(p)}
                            className="btn-ghost btn-xs hover:text-red-600"
                            title="Xóa"
                            aria-label="Xóa"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {products.length === 0 && (
                  <EmptyState
                    icon="📦"
                    title="Không tìm thấy nguyên vật liệu"
                    message="Thêm nguyên vật liệu đầu tiên để bắt đầu."
                  />
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
