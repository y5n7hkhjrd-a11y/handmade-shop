'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { SkeletonRow } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import Pagination from '@/components/Pagination';
import { copyToClipboard } from '@/lib/clipboard';

interface CostRule {
  id: string;
  name: string;
  productType: string;
  product?: { name: string } | null;
  formula: any;
  isActive: boolean;
}

const typeStyles: Record<string, { icon: string; color: string }> = {
  BASE: { icon: '🔷', color: 'text-blue-700 bg-blue-100 ring-blue-700/10' },
  CHARM: { icon: '✨', color: 'text-[#D97D9E] bg-[#FCE7F3] ring-[#D97D9E]/10' },
};

function formatFormula(formula: any): string {
  try {
    const str = JSON.stringify(formula, null, 2);
    // Syntax highlight with ANSI-like HTML
    return str
      .replace(/"([^"]+)":/g, '<span class="text-[#D97D9E]">"$1"</span>:')
      .replace(/: "([^"]+)"/g, ': <span class="text-emerald-600">"$1"</span>')
      .replace(/: (\d+(\.\d+)?)/g, ': <span class="text-amber-600">$1</span>')
      .replace(/: (true|false)/g, ': <span class="text-blue-600">$1</span>');
  } catch {
    return String(formula);
  }
}

export default function CostRulesPage() {
  const { token } = useAuth();
  const [rules, setRules] = useState<CostRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    productType: 'BASE',
    productId: '',
    formula: '{}',
    isActive: true,
  });
  const [formError, setFormError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const loadRules = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiClient<any>(`/cost-rules?page=${page}&limit=20`, { token });
      setRules(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (e: any) {
      showToast(e.message || 'Failed', 'error');
    }
    setLoading(false);
  }, [token, page, showToast]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormError('');
    try {
      JSON.parse(form.formula);
    } catch (parseErr: any) {
      setFormError('JSON không hợp lệ: ' + (parseErr?.message || 'lỗi cú pháp'));
      return;
    }
    try {
      const formula = JSON.parse(form.formula);
      await apiClient('/cost-rules', { method: 'POST', body: { ...form, formula }, token });
      showToast('Đã tạo quy tắc tính giá vốn');
      setShowForm(false);
      setForm({ name: '', productType: 'BASE', productId: '', formula: '{}', isActive: true });
      loadRules();
    } catch (e: any) {
      showToast(e.message || 'Tạo quy tắc thất bại', 'error');
    }
  };

  return (
    <div className="page-enter">
      <Toast toast={toast} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Định giá</h1>
          <p className="text-gray-500 mt-1 text-sm">{rules.length} quy tắc định giá</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setFormError('');
          }}
          className="btn-primary"
        >
          + Thêm quy tắc
        </button>
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
              <h2 className="text-xl font-semibold">Add Cost Rule</h2>
              <p className="text-sm text-gray-500 mt-1">
                Define a formula for calculating material costs
              </p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label label-required">Tên quy tắc</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="VD: Giá nguyên liệu cơ bản"
                  />
                </div>
                <div>
                  <label className="label">Loại sản phẩm</label>
                  <select
                    className="input"
                    value={form.productType}
                    onChange={(e) => setForm({ ...form, productType: e.target.value })}
                  >
                    <option value="BASE">🔷 BASE</option>
                    <option value="CHARM">✨ CHARM</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">
                  Mã sản phẩm{' '}
                  <span className="text-gray-400 font-normal">
                    (không bắt buộc — để trống nếu áp dụng cho tất cả)
                  </span>
                </label>
                <input
                  className="input"
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  placeholder="Leave empty for all products"
                />
              </div>
              <div>
                <label className="label label-required">
                  Công thức <span className="text-gray-400 font-normal">(JSON)</span>
                </label>
                <div className="relative">
                  <textarea
                    className="input font-mono text-xs"
                    rows={5}
                    value={form.formula}
                    onChange={(e) => {
                      setForm({ ...form, formula: e.target.value });
                      setFormError('');
                    }}
                    required
                    placeholder='{"type": "fixed", "cost": 10000}'
                  />
                  {form.formula !== '{}' && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          formula: JSON.stringify({ type: 'fixed', cost: 10000 }, null, 2),
                        })
                      }
                      className="absolute top-2 right-2 btn-ghost btn-xs text-gray-400 hover:text-[#E88DAB]"
                    >
                      📋 Mẫu
                    </button>
                  )}
                </div>
                {formError && <p className="mt-1 text-xs text-red-600">{formError}</p>}
                {/* Formula preview */}
                {(() => {
                  try {
                    const parsed = JSON.parse(form.formula);
                    if (typeof parsed === 'object' && parsed !== null) {
                      return (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5">
                            Preview
                          </p>
                          <div className="space-y-1 text-xs">
                            {Object.entries(parsed).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-2">
                                <span className="text-[#D97D9E] font-medium">{key}</span>
                                <span className="text-gray-300">:</span>
                                <span
                                  className={
                                    typeof value === 'number'
                                      ? 'text-amber-600 font-mono'
                                      : 'text-emerald-600 font-mono'
                                  }
                                >
                                  {typeof value === 'string' ? `"${value}"` : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  } catch {
                    return null;
                  }
                })()}
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Rule
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
                  <th>Type</th>
                  <th>Product</th>
                  <th>Formula</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2].map((i) => (
                  <SkeletonRow key={i} cols={5} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="card p-0 overflow-hidden group">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={
                          typeStyles[rule.productType]?.color
                            ? `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${typeStyles[rule.productType].color}`
                            : 'badge-gray'
                        }
                      >
                        {typeStyles[rule.productType]?.icon} {rule.productType}
                      </span>
                      <span className={`badge-${rule.isActive ? 'green' : 'gray'}`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                    {rule.product?.name && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Applies to: {rule.product.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(rule.formula, null, 2))}
                      className="btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Sao chép công thức"
                      aria-label="Sao chép công thức"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
                      className="btn-ghost btn-xs"
                      aria-label="Xem chi tiết công thức"
                    >
                      <span
                        className="transition-transform duration-200"
                        style={{
                          transform: expandedId === rule.id ? 'rotate(90deg)' : 'rotate(0deg)',
                        }}
                      >
                        ▶
                      </span>
                    </button>
                  </div>
                </div>
                {/* Formula summary */}
                <div className="mt-2 flex items-center gap-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-600 truncate flex-1">
                    {JSON.stringify(rule.formula).slice(0, 60)}
                    {JSON.stringify(rule.formula).length > 60 ? '...' : ''}
                  </code>
                </div>
              </div>
              {expandedId === rule.id && (
                <div className="mx-5 mb-5 p-4 bg-gray-50 rounded-xl animate-[slideDown_0.2s_ease-out]">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Formula Details
                    </h4>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(rule.formula, null, 2))}
                      className="copy-btn"
                    >
                      📋 <span className="copy-icon">Sao chép JSON</span>
                    </button>
                  </div>
                  <pre
                    className="text-xs font-mono whitespace-pre-wrap overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: formatFormula(rule.formula) }}
                  />
                </div>
              )}
            </div>
          ))}
          {rules.length === 0 && (
            <EmptyState
              icon="💰"
              title="Không tìm thấy quy tắc tính giá vốn"
              message="Tạo quy tắc tính giá vốn để bắt đầu tính chi phí nguyên liệu."
            />
          )}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
