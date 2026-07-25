'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { SkeletonRow } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import Pagination from '@/components/Pagination';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export default function CustomersPage() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' });
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const { toast, showToast } = useToast();

  const loadCustomers = useCallback(async () => {
    if (!token) return;
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      const res = await apiClient<any>(`/customers?${new URLSearchParams(params).toString()}`, {
        token,
      });
      setCustomers(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (e: any) {
      showToast(e.message || 'Tải danh sách thất bại', 'error');
    }
    setLoading(false);
  }, [token, page, search, showToast]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      if (editingId) {
        await apiClient(`/customers/${editingId}`, { method: 'PUT', body: form, token });
        showToast('Đã cập nhật khách hàng');
      } else {
        await apiClient('/customers', { method: 'POST', body: form, token });
        showToast('Đã thêm khách hàng');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', email: '', phone: '', address: '', notes: '' });
      loadCustomers();
    } catch (e: any) {
      showToast(e.message || 'Thất bại', 'error');
    }
  };

  const handleEdit = (c: Customer) => {
    setForm({
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      notes: c.notes || '',
    });
    setEditingId(c.id);
    setShowForm(true);
  };
  const handleDelete = async (id: string) => {
    if (!token || !confirm('Xóa khách hàng này?')) return;
    await apiClient(`/customers/${id}`, { method: 'DELETE', token });
    showToast('Đã xóa khách hàng');
    loadCustomers();
  };

  return (
    <div className="page-enter">
      <Toast toast={toast} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Khách hàng</h1>
          <p className="text-gray-500 mt-1 text-sm">{customers.length} khách hàng</p>
        </div>
        <div className="flex gap-2">
          <div className="tabs">
            <button
              className={viewMode === 'table' ? 'tab-active' : 'tab'}
              onClick={() => setViewMode('table')}
            >
              📋 Bảng
            </button>
            <button
              className={viewMode === 'cards' ? 'tab-active' : 'tab'}
              onClick={() => setViewMode('cards')}
            >
              📇 Thẻ
            </button>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setForm({ name: '', email: '', phone: '', address: '', notes: '' });
              setShowForm(true);
            }}
            className="btn-primary"
          >
            + Thêm khách hàng
          </button>
        </div>
      </div>

      <div className="action-bar">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            className="input pl-9"
            placeholder="Tìm kiếm khách hàng..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => e.key === 'Enter' && loadCustomers()}
          />
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
                {editingId ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label label-required">Tên khách hàng</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Số điện thoại</label>
                  <input
                    className="input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Địa chỉ</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Cập nhật' : 'Lưu'}
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
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((i) => (
                  <SkeletonRow key={i} cols={5} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Email</th>
                  <th>Điện thoại</th>
                  <th>Địa chỉ</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-300 to-pink-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                          {c.name.charAt(0)}
                        </div>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="text-gray-600">{c.email || '—'}</td>
                    <td className="text-gray-600">{c.phone || '—'}</td>
                    <td className="text-gray-500 text-xs truncate max-w-[120px] lg:max-w-[250px]">
                      {c.address || '—'}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(c)}
                          className="btn-ghost btn-xs"
                          aria-label="Chỉnh sửa khách hàng"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="btn-ghost btn-xs hover:text-red-600"
                          aria-label="Xóa khách hàng"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <EmptyState
                    icon="👥"
                    title="Không tìm thấy khách hàng"
                    message="Thêm khách hàng đầu tiên để bắt đầu."
                  />
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => (
            <div key={c.id} className="card group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-300 to-pink-400 flex items-center justify-center text-white font-bold shadow-sm">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
                  {c.email && <p className="text-xs text-gray-500 truncate">{c.email}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(c)}
                    className="btn-ghost btn-xs"
                    aria-label="Chỉnh sửa"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="btn-ghost btn-xs hover:text-red-600"
                    aria-label="Xóa"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              {c.phone && (
                <div className="detail-row py-1.5">
                  <span className="detail-label">📞</span>
                  <span className="detail-value">{c.phone}</span>
                </div>
              )}
              {c.address && (
                <div className="detail-row py-1.5">
                  <span className="detail-label">📍</span>
                  <span className="detail-value text-xs">{c.address}</span>
                </div>
              )}
            </div>
          ))}
          {customers.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">No customers found</div>
          )}
        </div>
      )}
    </div>
  );
}
