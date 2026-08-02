'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import EmptyState from '@/components/EmptyState';
import FlaticonIcon from '@/components/FlaticonIcon';
import { useSort, SortIcon } from '@/hooks/useSort';
import Pagination from '@/components/Pagination';
import {
  getAvatarColor,
  SOCIAL_PLATFORMS,
  SocialIconsRow,
  FILTERS,
  hasSocial,
  initialForm,
  type Customer,
} from './customerConstants';
import CustomerForm from './CustomerForm';
import ConfirmModal from '@/components/ConfirmModal';

type FilterKey = 'all' | 'email' | 'phone' | 'social';

export default function CustomersPage() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const { toast, showToast } = useToast();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Mobile polish: auto-switch to card view on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => {
      if (mq.matches) setViewMode('cards');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Debounce search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  const loadCustomers = useCallback(async () => {
    if (!token) return;
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await apiClient<any>(`/customers?${new URLSearchParams(params).toString()}`, {
        token,
      });
      let data = res.data as Customer[];
      if (activeFilter === 'email') data = data.filter((c) => !!c.email);
      else if (activeFilter === 'phone') data = data.filter((c) => !!c.phone);
      else if (activeFilter === 'social') data = data.filter(hasSocial);
      setCustomers(data);
      setTotalPages(res.pagination.totalPages);
      setTotalCustomers(res.pagination.total || 0);
    } catch (e: any) {
      showToast(e.message || 'Tải danh sách thất bại', 'error');
    }
    setLoading(false);
  }, [token, page, debouncedSearch, activeFilter, showToast]);

  // Sort
  const {
    sortedData: sortedCustomers,
    sortKey,
    sortDir,
    toggleSort,
  } = useSort(customers, 'name', 'asc');

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleEdit = (c: Customer) => {
    setEditingCustomer(c);
    setShowForm(true);
  };

  const doDelete = async () => {
    if (!token || !deleteTarget) return;
    try {
      await apiClient(`/customers/${deleteTarget.id}`, { method: 'DELETE', token });
      showToast('Đã xóa khách hàng');
      loadCustomers();
    } catch (e: any) {
      showToast(e.message || 'Xóa thất bại', 'error');
    }
    setDeleteTarget(null);
  };

  // Keyboard: Escape to close modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForm) {
        setShowForm(false);
        setEditingCustomer(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showForm]);

  return (
    <div className="page-enter">
      <Toast toast={toast} />

      {/* ─── Header ─── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-pink-50 via-white to-avocado-50/70 border border-pink-100/70 shadow-[0_2px_12px_-4px_rgba(127,163,69,0.15)] mb-4 sm:mb-6">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-gradient-to-br from-pink-200/25 to-mint-200/25 rounded-full blur-3xl" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-gradient-to-tr from-mint-200/20 to-pink-200/20 rounded-full blur-2xl" />
        <div className="absolute top-1/2 -translate-y-1/2 right-1/3 w-16 h-16 bg-pink-100/10 rounded-full blur-xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, #cddda9 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative px-4 py-3 sm:px-6 sm:py-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-pink-500 flex items-center justify-center text-white text-lg shadow-md ring-1 ring-white/60">
                    <FlaticonIcon name="users-alt" size="lg" />
                  </div>
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-pink-300/30 to-mint-300/30 blur-sm -z-10" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                      Khách hàng
                    </h1>
                    {totalCustomers > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-pink-100 text-pink-700 shadow-sm ring-1 ring-pink-200/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                        {totalCustomers}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {totalCustomers > 0
                      ? 'Quản lý thông tin khách hàng'
                      : 'Quản lý danh sách khách hàng'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center bg-white rounded-lg border border-gray-200 p-0.5 shadow-sm">
                <button
                  className={`relative px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${viewMode === 'table' ? 'text-pink-700' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setViewMode('table')}
                >
                  {viewMode === 'table' && (
                    <span className="absolute inset-0 bg-pink-50 rounded-md shadow-sm animate-[fadeIn_0.15s_ease-out]" />
                  )}
                  <span className="relative z-10">
                    <FlaticonIcon name="list" size="xs" className="inline-flex mr-1" />
                    Bảng
                  </span>
                </button>
                <button
                  className={`relative px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${viewMode === 'cards' ? 'text-pink-700' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setViewMode('cards')}
                >
                  {viewMode === 'cards' && (
                    <span className="absolute inset-0 bg-pink-50 rounded-md shadow-sm animate-[fadeIn_0.15s_ease-out]" />
                  )}
                  <span className="relative z-10">
                    <FlaticonIcon name="address-card" size="xs" className="inline-flex mr-1" />
                    Thẻ
                  </span>
                </button>
              </div>
              <button
                onClick={() => {
                  setEditingCustomer(null);
                  setShowForm(true);
                }}
                className="btn-primary !gap-1.5 !px-4"
              >
                <span className="text-base leading-none">＋</span> Thêm
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-pink-200/80 to-transparent" />
      </div>

      {/* ─── Search & Filter ─── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="filter-search flex-1">
          <span className="search-icon">
            <FlaticonIcon name="search" size="sm" />
          </span>
          <input
            className="input !pl-9 !pr-9"
            placeholder="Tìm kiếm khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors text-xs"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setActiveFilter(f.key);
                setPage(1);
              }}
              className={`filter-chip text-xs ${activeFilter === f.key ? 'filter-chip-active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Form Modal ─── */}
      <CustomerForm
        isOpen={showForm}
        editingCustomer={editingCustomer}
        token={token}
        showToast={showToast}
        onClose={() => {
          setShowForm(false);
          setEditingCustomer(null);
        }}
        onSuccess={loadCustomers}
      />

      {/* ─── Loading State ─── */}
      {loading ? (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Email</th>
                  <th>Điện thoại</th>
                  <th>Địa chỉ</th>
                  <th className="text-left">Social</th>
                  <th className="text-left">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full skeleton" />
                        <div className="skeleton h-4 w-28" />
                      </div>
                    </td>
                    <td>
                      <div className="skeleton h-4 w-36" />
                    </td>
                    <td>
                      <div className="skeleton h-4 w-28" />
                    </td>
                    <td>
                      <div className="skeleton h-4 w-20" />
                    </td>
                    <td className="text-left">
                      <div className="skeleton h-5 w-16 rounded-md" />
                    </td>
                    <td className="text-left">
                      <div className="skeleton h-4 w-16" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* ─── Table View ─── */
        <div className="card p-0 overflow-hidden">
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
                    onClick={() => toggleSort('email')}
                  >
                    Email <SortIcon sortKey="email" currentKey={sortKey} dir={sortDir} />
                  </th>
                  <th
                    className="cursor-pointer select-none group"
                    onClick={() => toggleSort('phone')}
                  >
                    Điện thoại <SortIcon sortKey="phone" currentKey={sortKey} dir={sortDir} />
                  </th>
                  <th>Địa chỉ</th>
                  <th className="text-left">Social</th>
                  <th className="text-left">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {sortedCustomers.map((c) => (
                  <tr key={c.id} className="group/row transition-all duration-150">
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(c.name)} flex items-center justify-center text-white text-xs font-bold shadow-sm ring-1 ring-white/50 flex-shrink-0`}
                        >
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-gray-900 block truncate max-w-[160px]">
                            {c.name}
                          </span>
                          {c.notes && (
                            <span
                              className="text-[10px] text-gray-400 truncate max-w-[160px] block leading-tight"
                              title={c.notes}
                            >
                              <FlaticonIcon
                                name="clipboard"
                                size="xs"
                                className="inline-flex mr-0.5"
                              />{' '}
                              {c.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="text-gray-600 hover:text-avocado-600 transition-colors text-sm"
                        >
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>
                    <td>
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          className="text-gray-600 hover:text-avocado-600 transition-colors font-medium text-sm"
                        >
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>
                    <td>
                      {c.address ? (
                        <span
                          className="text-gray-500 text-xs block truncate max-w-[140px] lg:max-w-[220px]"
                          title={c.address}
                        >
                          <FlaticonIcon name="map-pin" size="xs" className="inline-flex mr-0.5" />{' '}
                          {c.address}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>
                    <td className="text-left">
                      <SocialIconsRow customer={c} size="sm" />
                    </td>
                    <td className="text-left">
                      <div className="inline-flex items-center border border-gray-200 rounded-full overflow-hidden bg-white shadow-sm">
                        <button
                          onClick={() => handleEdit(c)}
                          className="flex items-center justify-center w-[28px] h-[28px] hover:bg-mint-50 hover:text-mint-600 transition-all duration-150 text-gray-400 border-r border-gray-200 last:border-r-0"
                          title="Sửa"
                          aria-label="Chỉnh sửa khách hàng"
                        >
                          <FlaticonIcon name="pencil" size="xs" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="flex items-center justify-center w-[28px] h-[28px] hover:bg-red-50 hover:text-red-500 transition-all duration-150 text-gray-400 border-r border-gray-200 last:border-r-0"
                          title="Xóa"
                          aria-label="Xóa khách hàng"
                        >
                          <FlaticonIcon name="trash" size="xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {customers.length === 0 && (
            <div className="py-16">
              <EmptyState
                emoji="👥"
                title="Không tìm thấy khách hàng"
                message={
                  search
                    ? 'Không có kết quả phù hợp với từ khóa tìm kiếm.'
                    : activeFilter !== 'all'
                      ? 'Không có khách hàng phù hợp với bộ lọc.'
                      : 'Chưa có khách hàng nào.'
                }
              />
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : (
        /* ─── Cards View ─── */
        <div>
          {customers.length === 0 ? (
            <div className="card py-16">
              <EmptyState
                emoji="👥"
                title="Không tìm thấy khách hàng"
                message={
                  search
                    ? 'Không có kết quả phù hợp.'
                    : activeFilter !== 'all'
                      ? 'Không có khách hàng phù hợp với bộ lọc.'
                      : 'Chưa có khách hàng nào.'
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {customers.map((c) => (
                <div
                  key={c.id}
                  className="card group/card hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-default relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-avocado-300 via-mint-300 to-pink-300 opacity-60" />
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(c.name)} flex items-center justify-center text-white text-sm font-bold shadow-sm ring-1 ring-white/50 flex-shrink-0`}
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate flex items-center gap-1.5">
                        {c.name}
                      </h3>
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="text-xs text-gray-500 hover:text-avocado-600 transition-colors truncate block"
                        >
                          {c.email}
                        </a>
                      ) : (
                        <p className="text-xs text-gray-300 truncate">Chưa có email</p>
                      )}
                    </div>
                    <div className="inline-flex items-center border border-gray-200 rounded-full overflow-hidden bg-white shadow-sm flex-shrink-0">
                      <button
                        onClick={() => handleEdit(c)}
                        className="flex items-center justify-center w-[28px] h-[28px] hover:bg-mint-50 hover:text-mint-600 transition-all duration-150 text-gray-400 border-r border-gray-200 last:border-r-0"
                        title="Sửa"
                        aria-label="Chỉnh sửa"
                      >
                        <FlaticonIcon name="pencil" size="xs" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="flex items-center justify-center w-[28px] h-[28px] hover:bg-red-50 hover:text-red-500 transition-all duration-150 text-gray-400 border-r border-gray-200 last:border-r-0"
                        title="Xóa"
                        aria-label="Xóa"
                      >
                        <FlaticonIcon name="trash" size="xs" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {c.phone && (
                      <div className="flex items-center gap-2 text-sm group">
                        <FlaticonIcon
                          name="phone-call"
                          size="sm"
                          className="text-gray-400 w-5 flex-shrink-0"
                        />
                        <span className="text-gray-700 flex-1 truncate">{c.phone}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(c.phone!);
                            showToast('Đã sao chép số điện thoại');
                          }}
                          className="text-[10px] text-gray-300 hover:text-gray-500 transition-colors p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 flex-shrink-0"
                          title="Sao chép SĐT"
                        >
                          <FlaticonIcon name="clipboard" size="xs" />
                        </button>
                      </div>
                    )}
                    {c.address && (
                      <div className="flex items-start gap-2 text-sm">
                        <FlaticonIcon
                          name="map-pin"
                          size="sm"
                          className="text-gray-400 w-5 mt-0.5 flex-shrink-0"
                        />
                        <span
                          className="text-gray-600 text-xs flex-1 line-clamp-1"
                          title={c.address}
                        >
                          {c.address}
                        </span>
                      </div>
                    )}
                    {c.notes && (
                      <div className="flex items-start gap-2 text-sm">
                        <FlaticonIcon
                          name="clipboard"
                          size="sm"
                          className="text-gray-400 w-5 mt-0.5 flex-shrink-0"
                        />
                        <span className="text-gray-500 text-xs flex-1 line-clamp-2" title={c.notes}>
                          {c.notes}
                        </span>
                      </div>
                    )}
                  </div>
                  {(() => {
                    const hasAny = SOCIAL_PLATFORMS.some((p) => {
                      if (p.phoneBased) return !!c.phone;
                      return !!(c as any)[p.key];
                    });
                    if (!hasAny) return null;
                    return (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <SocialIconsRow customer={c} />
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Xóa khách hàng"
        message={`Bạn có chắc muốn xóa khách hàng "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        variant="danger"
      />
    </div>
  );
}
