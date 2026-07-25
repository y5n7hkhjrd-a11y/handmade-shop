'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDate } from '@handmade-shop/shared';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { SkeletonCard } from '@/components/LoadingSpinner';

const mockChartData = [35, 55, 40, 70, 60, 85, 65, 90, 75, 95, 80, 100];

function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { badge: string; label: string }> = {
    Draft: { badge: 'badge-gray', label: 'Nhập đơn' },
    WaitingConfirm: { badge: 'badge-yellow', label: 'Đơn chờ làm' },
    InProgress: { badge: 'badge-blue', label: 'Đơn đã xong' },
    Packaging: { badge: 'badge-purple', label: 'Đơn đã gói' },
    ReadyToShip: { badge: 'badge-green', label: 'Đã gửi' },
    Completed: { badge: 'badge-green', label: 'Hoàn thành' },
  };
  const info = statusMap[status];
  return <span className={info?.badge || 'badge-gray'}>{info?.label || status}</span>;
}

export default function DashboardPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<{
    totalOrders: number;
    totalRevenue: number;
    totalProfit: number;
    activeOrders: number;
    recentOrders: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      apiClient<any>('/dashboard/stats', { token })
        .then((res) => {
          setStats(res.data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [token]);

  if (loading) {
    return (
      <div className="page-enter space-y-6">
        <div className="skeleton-title mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonCard />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Tổng đơn hàng',
      value: stats?.totalOrders || 0,
      icon: '📋',
      color: 'bg-purple-50 text-purple-700',
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Doanh thu',
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: '💰',
      color: 'bg-emerald-50 text-emerald-700',
      trend: '+8%',
      trendUp: true,
    },
    {
      title: 'Lợi nhuận',
      value: formatCurrency(stats?.totalProfit || 0),
      icon: '📈',
      color: 'bg-blue-50 text-blue-700',
      trend: (stats?.totalProfit || 0) > 0 ? '+5%' : '0%',
      trendUp: (stats?.totalProfit || 0) > 0,
    },
    {
      title: 'Đang xử lý',
      value: stats?.activeOrders || 0,
      icon: '🔄',
      color: 'bg-amber-50 text-amber-700',
      trend: 'Đang xử lý',
      trendUp: true,
    },
  ];

  return (
    <div className="page-enter">
      <Toast toast={toast} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            Chào mừng trở lại! Dưới đây là tình hình hôm nay.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button className="btn-secondary btn-sm">
            <span className="mr-1.5">📅</span> Hôm nay
          </button>
          <Link href="/orders" className="btn-primary btn-sm">
            <span className="mr-1.5">+</span> Đơn hàng mới
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 group cursor-default"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center shadow-sm ring-1 ring-black/5`}
              >
                <span className="text-lg">{card.icon}</span>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${card.trendUp ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'}`}
              >
                {card.trend}
              </span>
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {card.title}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{card.value}</p>
            <div className="flex items-end gap-0.5 h-8 mt-3 border-t border-gray-50 pt-3">
              {mockChartData.slice(0, 8).map((h, i) => (
                <div
                  key={i}
                  className="w-2 rounded-t transition-all duration-300 bg-purple-400/40 group-hover:bg-purple-500/60"
                  style={{ height: `${h * 0.4}px` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Đơn hàng gần đây</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {stats?.recentOrders?.length || 0} đơn hàng gần nhất
              </p>
            </div>
            <Link
              href="/orders"
              className="btn-ghost btn-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Xem tất cả <span className="ml-1">→</span>
            </Link>
          </div>
          {stats?.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Trạng thái</th>
                    <th className="text-right">SL</th>
                    <th className="text-right">Tổng</th>
                    <th>Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order: any) => (
                    <tr
                      key={order.id}
                      className="cursor-pointer hover:bg-purple-50/30 transition-colors"
                      onClick={() => router.push(`/orders?id=${order.id}`)}
                    >
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm flex-shrink-0">
                            {order.customer?.name?.charAt(0) || '?'}
                          </div>
                          <span className="font-medium text-gray-900">
                            {order.customer?.name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="text-right text-gray-600 tabular-nums">
                        {order.items?.length || 0}
                      </td>
                      <td className="text-right font-semibold text-gray-900 tabular-nums">
                        {formatCurrency(Number(order.totalCost))}
                      </td>
                      <td className="text-gray-500 text-xs">{formatDate(order.orderDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p className="empty-state-text">Chưa có đơn hàng nào. Hãy tạo đơn hàng đầu tiên!</p>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Thao tác nhanh</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: '➕',
                  label: 'Đơn hàng mới',
                  href: '/orders',
                  color: 'bg-purple-50 text-purple-700',
                  desc: 'Tạo đơn mới',
                },
                {
                  icon: '📦',
                  label: 'Hàng hóa',
                  href: '/products',
                  color: 'bg-blue-50 text-blue-700',
                  desc: 'Quản lý sản phẩm',
                },
                {
                  icon: '👥',
                  label: 'Khách hàng',
                  href: '/customers',
                  color: 'bg-emerald-50 text-emerald-700',
                  desc: 'DS khách hàng',
                },
                {
                  icon: '📋',
                  label: 'Công thức',
                  href: '/recipes',
                  color: 'bg-amber-50 text-amber-700',
                  desc: 'Quản lý công thức',
                },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all duration-200 group text-center"
                >
                  <div
                    className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center text-base shadow-sm group-hover:scale-110 transition-transform`}
                  >
                    {action.icon}
                  </div>
                  <span className="text-xs font-semibold text-gray-700 group-hover:text-purple-700">
                    {action.label}
                  </span>
                  <span className="text-[10px] text-gray-400">{action.desc}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Tổng quan đơn hàng</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-sm">
                    📋
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tổng đơn hàng</p>
                    <p className="text-[11px] text-gray-400">Tất cả thời gian</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-gray-900 tabular-nums">
                  {stats?.totalOrders || 0}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-sm">
                    🔄
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Đang xử lý</p>
                    <p className="text-[11px] text-gray-400">Chưa hoàn thành</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-amber-600 tabular-nums">
                  {stats?.activeOrders || 0}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-sm">
                    💰
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Doanh thu</p>
                    <p className="text-[11px] text-gray-400">Tổng doanh thu</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-emerald-700 tabular-nums">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
