'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { SkeletonRow } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import Pagination from '@/components/Pagination';
import FlaticonIcon from '@/components/FlaticonIcon';

interface MatchingRule {
  id: string;
  code: string;
  name: string;
  pattern: string;
  description: string | null;
  isActive: boolean;
}

const defaultRules = [
  {
    code: 'ALPHANUMERIC',
    name: 'Chữ & Số',
    pattern: '[a-zA-Z0-9]',
    description: 'Tất cả chữ và số',
  },
  { code: 'ALPHA', name: 'Chỉ chữ', pattern: '[a-zA-Z]', description: 'Chữ cái' },
  { code: 'NUMBER', name: 'Chỉ số', pattern: '[0-9]', description: 'Chữ số' },
  { code: 'UNDERSCORE', name: 'Dấu gạch dưới (_)', pattern: '_', description: 'Charm hình' },
  { code: 'AT', name: 'Ký tự @', pattern: '@', description: 'Charm kim loại' },
  { code: 'HASH', name: 'Ký tự #', pattern: '#', description: 'Charm đặc biệt' },
  { code: 'CUSTOM', name: 'Quy tắc tùy chỉnh', pattern: '', description: 'Dành cho quản trị' },
];

export default function MatchingRulesPage() {
  const { token, user } = useAuth();
  const [rules, setRules] = useState<MatchingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    pattern: '',
    description: '',
    isActive: true,
  });
  const [formError, setFormError] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const isAdmin = user?.role === 'ADMIN';

  const loadRules = useCallback(async () => {
    if (!token) return;
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      const res = await apiClient<any>(
        `/matching-rules?${new URLSearchParams(params).toString()}`,
        { token },
      );
      setRules(res.data);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (e: any) {
      showToast(e.message || 'Tải quy tắc thất bại', 'error');
    }
    setLoading(false);
  }, [token, page, search, showToast]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.code.trim()) errors.code = 'Vui lòng nhập mã quy tắc';
    if (!form.name.trim()) errors.name = 'Vui lòng nhập tên quy tắc';
    if (form.code === 'CUSTOM' && !form.pattern.trim())
      errors.pattern = 'Vui lòng nhập pattern cho quy tắc tùy chỉnh';
    if (!form.name.trim()) errors.name = 'Vui lòng nhập tên hiển thị';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !validateForm()) return;
    try {
      const body = {
        code: form.code,
        name: form.name,
        pattern: form.pattern,
        description: form.description || undefined,
        isActive: form.isActive,
      };

      if (editingId) {
        await apiClient(`/matching-rules/${editingId}`, { method: 'PUT', body, token });
        showToast('Đã cập nhật quy tắc ghép ký tự');
      } else {
        await apiClient('/matching-rules', { method: 'POST', body, token });
        showToast('Đã thêm quy tắc ghép ký tự');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ code: '', name: '', pattern: '', description: '', isActive: true });
      setFormErrors({});
      loadRules();
    } catch (e: any) {
      showToast(e.message || 'Thao tác thất bại', 'error');
    }
  };

  const handleEdit = (rule: MatchingRule) => {
    setForm({
      code: rule.code,
      name: rule.name,
      pattern: rule.pattern,
      description: rule.description || '',
      isActive: rule.isActive,
    });
    setEditingId(rule.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await apiClient(`/matching-rules/${id}`, { method: 'DELETE', token });
      showToast('Đã xóa quy tắc ghép ký tự');
      loadRules();
    } catch (e: any) {
      showToast(e.message || 'Xóa thất bại', 'error');
    }
  };

  const confirmDelete = (rule: MatchingRule) => {
    const overlay = document.createElement('div');
    overlay.className =
      'fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]';

    const dialog = document.createElement('div');
    dialog.className = 'bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full border border-gray-100';

    dialog.innerHTML = `
      <div class="text-center">
        <div class="text-3xl mb-3">🗑️</div>
        <h3 class="text-lg font-semibold text-gray-900">Xóa "${rule.name}"?</h3>
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
      handleDelete(rule.id);
    });
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  };

  const handleToggleStatus = async (rule: MatchingRule) => {
    if (!token) return;
    try {
      await apiClient(`/matching-rules/${rule.id}`, {
        method: 'PUT',
        body: { isActive: !rule.isActive },
        token,
      });
      showToast(rule.isActive ? 'Đã tắt quy tắc' : 'Đã kích hoạt quy tắc');
      loadRules();
    } catch (e: any) {
      showToast(e.message || 'Cập nhật thất bại', 'error');
    }
  };

  const handleResetDefaults = async () => {
    if (!token || !isAdmin) return;
    try {
      for (const rule of defaultRules) {
        await apiClient('/matching-rules', { method: 'POST', body: rule, token });
      }
      showToast('Đã khôi phục quy tắc mặc định');
      loadRules();
    } catch (e: any) {
      showToast(e.message || 'Khôi phục thất bại', 'error');
    }
  };

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
                <FlaticonIcon name="link-horizontal" size="md" />
              </div>
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-avocado-400/20 to-mint-500/20 blur-sm -z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                  Quy tắc ghép ký tự
                </h1>
                {rules.length > 0 && (
                  <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-white border border-gray-200 rounded-full text-gray-600 shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {rules.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Cách nhận diện ký tự cho sản phẩm CHARM
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={handleResetDefaults}
                className="btn-secondary btn-sm"
                title="Khôi phục quy tắc mặc định"
              >
                <FlaticonIcon name="arrows-repeat" size="sm" className="mr-1" /> Mặc định
              </button>
            )}
            <button
              onClick={() => {
                setEditingId(null);
                setForm({ code: '', name: '', pattern: '', description: '', isActive: true });
                setFormErrors({});
                setFormError('');
                setShowForm(true);
              }}
              className="btn-primary !gap-1.5 !px-4"
              disabled={!isAdmin}
            >
              <span>＋ Thêm quy tắc</span>
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-pink-300/40 to-transparent" />
      </div>

      {/* Search */}
      <div className="action-bar">
        <div className="relative flex-1 max-w-xs">
          <FlaticonIcon
            name="search"
            size="sm"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            className="input pl-9"
            placeholder="Tìm kiếm quy tắc..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex-1" />
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
          onClick={() => setShowForm(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingId ? 'Chỉnh sửa quy tắc' : 'Thêm quy tắc ghép ký tự'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {editingId
                  ? 'Cập nhật thông tin quy tắc'
                  : 'Tạo quy tắc nhận diện ký tự mới cho sản phẩm CHARM'}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label label-required">Mã quy tắc</label>
                  <input
                    className={`input font-mono text-xs uppercase ${formErrors.code ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : ''}`}
                    value={form.code}
                    onChange={(e) => {
                      setForm({ ...form, code: e.target.value.toUpperCase() });
                      setFormErrors((prev) => ({ ...prev, code: '' }));
                    }}
                    placeholder="VD: CUSTOM_RULE"
                    required
                    disabled={!!editingId}
                  />
                  {formErrors.code && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.code}</p>
                  )}
                </div>
                <div>
                  <label className="label label-required">Tên hiển thị</label>
                  <input
                    className={`input ${formErrors.name ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : ''}`}
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      setFormErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    placeholder="VD: Quy tắc tùy chỉnh"
                    required
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="label">
                  Pattern <span className="text-gray-400 font-normal">(biểu thức chính quy)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-mono">
                    /
                  </span>
                  <input
                    className={`input pl-7 font-mono text-sm ${formErrors.pattern ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : ''}`}
                    value={form.pattern}
                    onChange={(e) => {
                      setForm({ ...form, pattern: e.target.value });
                      setFormErrors((prev) => ({ ...prev, pattern: '' }));
                    }}
                    placeholder="[a-zA-Z0-9]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-mono">
                    /
                  </span>
                </div>
                {formErrors.pattern && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.pattern}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  Pattern được dùng để đếm số ký tự khớp trong chuỗi custom input
                </p>
              </div>

              <div>
                <label className="label">Mô tả</label>
                <input
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Mô tả ngắn về quy tắc này"
                />
              </div>

              {/* Test pattern */}
              {form.pattern && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Kiểm tra pattern
                  </p>
                  <input
                    className="input text-sm"
                    placeholder="Nhập chuỗi để kiểm tra..."
                    onChange={(e) => {
                      const testEl = e.target.nextElementSibling;
                      if (testEl) {
                        try {
                          const regex = new RegExp(form.pattern, 'g');
                          const matches = e.target.value.match(regex);
                          testEl.textContent = matches
                            ? `✓ Tìm thấy ${matches.length} ký tự khớp: "${matches.join('", "')}"`
                            : '✗ Không có ký tự nào khớp';
                          testEl.className = `mt-1 text-xs ${matches ? 'text-emerald-600' : 'text-red-500'}`;
                        } catch {
                          testEl.textContent = '⚠️ Pattern không hợp lệ';
                          testEl.className = 'mt-1 text-xs text-amber-600';
                        }
                      }
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Nhập chuỗi để xem pattern hoạt động như thế nào
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  className="w-4 h-4 rounded border-gray-300 text-avocado-600 focus:ring-avocado-500"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Kích hoạt
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Cập nhật' : 'Tạo quy tắc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rule list */}
      {loading ? (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                    Mã
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                    Tên quy tắc
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                    Pattern
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                    Mô tả
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                    Trạng thái
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                    Thao tác
                  </th>
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
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                    Mã
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                    Tên quy tắc
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                    Pattern
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                    Mô tả
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                    Trạng thái
                  </th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rules.map((rule) => (
                  <tr
                    key={rule.id}
                    className="group hover:bg-avocado-50/30 transition-colors duration-150"
                  >
                    <td className="px-5 py-4">
                      <code className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-avocado-50 text-avocado-700">
                        {rule.code}
                      </code>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{rule.name}</p>
                    </td>
                    <td className="px-5 py-4">
                      <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                        /{rule.pattern || <span className="text-gray-300 italic">trống</span>}/
                      </code>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-500">
                        {rule.description || (
                          <span className="text-gray-300 italic">Chưa có mô tả</span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleStatus(rule)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                          rule.isActive
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${rule.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}
                        />
                        {rule.isActive ? 'Hoạt động' : 'Tắt'}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => handleEdit(rule)}
                          className="btn-ghost btn-xs"
                          title="Chỉnh sửa quy tắc"
                          aria-label="Chỉnh sửa quy tắc"
                          disabled={!isAdmin}
                        >
                          <FlaticonIcon name="pencil" size="sm" />
                        </button>
                        <button
                          onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
                          className="btn-ghost btn-xs"
                          aria-label="Xem chi tiết"
                        >
                          <span
                            className="transition-transform duration-200 inline-block"
                            style={{
                              transform: expandedId === rule.id ? 'rotate(90deg)' : 'rotate(0deg)',
                            }}
                          >
                            ▶
                          </span>
                        </button>
                        <button
                          onClick={() => confirmDelete(rule)}
                          className="btn-ghost btn-xs hover:text-red-600"
                          title="Xóa quy tắc"
                          aria-label="Xóa quy tắc"
                          disabled={!isAdmin}
                        >
                          <FlaticonIcon name="trash" size="sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <EmptyState
                        emoji="🔤"
                        title="Chưa có quy tắc ghép ký tự nào"
                        message="Thêm quy tắc để bắt đầu cấu hình cách nhận diện ký tự cho sản phẩm CHARM."
                        action={
                          isAdmin
                            ? { label: 'Thêm quy tắc', onClick: () => setShowForm(true) }
                            : undefined
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* System info callout */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-start gap-3">
          <FlaticonIcon name="bulb" size="lg" className="flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-gray-700">Thông tin hệ thống</h4>
            <p className="text-xs text-gray-500 mt-1">
              Quy tắc ghép ký tự được sử dụng bởi <strong>Rule Engine</strong> để tính giá vốn
              (Material Cost) cho sản phẩm CHARM. Khi khách hàng nhập chuỗi custom (VD: TANDAT__),
              hệ thống sẽ đếm số ký tự khớp với từng pattern và nhân với giá của sản phẩm CHARM
              tương ứng.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {defaultRules.map((r) => (
                <code
                  key={r.code}
                  className="text-[10px] px-2 py-1 bg-white rounded border border-gray-200 text-gray-500 font-mono"
                >
                  {r.code}: /{r.pattern || '?'}/
                </code>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
