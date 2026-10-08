'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDate } from '@handmade-shop/shared';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { SkeletonCard } from '@/components/LoadingSpinner';
import FlaticonIcon from '@/components/FlaticonIcon';

const DASHBOARD_SOCIAL_PLATFORMS: Array<{
  key: string;
  label: string;
  icon: ReactNode;
  domain: string;
  phoneBased?: boolean;
}> = [
  {
    key: 'facebook',
    label: 'Facebook',
    icon: (
      <svg viewBox="0 0 24 24" fill="#1877F2" className="w-full h-full">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    domain: 'https://facebook.com/',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    icon: (
      <svg viewBox="0 0 24 24" fill="#E4405F" className="w-full h-full">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    domain: 'https://instagram.com/',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: (
      <svg viewBox="0 0 24 24" fill="#000000" className="w-full h-full">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
    domain: 'https://tiktok.com/@',
  },
  {
    key: 'threads',
    label: 'Threads',
    icon: (
      <svg viewBox="0 0 24 24" fill="#000000" className="w-full h-full">
        <path d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z" />
      </svg>
    ),
    domain: 'https://threads.net/@',
  },
  {
    key: 'zalo',
    label: 'Zalo',
    phoneBased: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="#0068FF" className="w-full h-full">
        <path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z" />
      </svg>
    ),
    domain: 'https://zalo.me/',
  },
];

function SocialLinks({ customer, size = 'sm' }: { customer: any; size?: 'sm' | 'xs' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const hasAny =
    customer &&
    (customer.facebook ||
      customer.instagram ||
      customer.tiktok ||
      customer.threads ||
      customer.phone);
  if (!hasAny) return null;
  return (
    <div className="flex items-center gap-1">
      {DASHBOARD_SOCIAL_PLATFORMS.map((sl) => {
        let val: string | null = null;
        if (sl.phoneBased) {
          val = customer?.phone || null;
          if (!val) return null;
        } else {
          val = customer?.[sl.key] || null;
          if (!val) return null;
        }
        const cleanVal = val.startsWith('http') ? val : `${sl.domain}${val.replace(/^@/, '')}`;
        const phoneVal = sl.phoneBased ? `https://zalo.me/${val.replace(/[^0-9]/g, '')}` : cleanVal;
        return (
          <a
            key={sl.key}
            href={phoneVal}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`${sizeClass} flex items-center justify-center rounded bg-white border border-gray-200 shadow-sm hover:shadow-md hover:scale-110 transition-all duration-200`}
            title={`Mở ${sl.label}`}
          >
            {sl.icon}
          </a>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { badge: string; label: string }> = {
    Draft: { badge: 'badge-gray', label: 'Nhập đơn' },
    WaitingConfirm: { badge: 'badge-yellow', label: 'Đơn chờ làm' },
    InProgress: { badge: 'badge-blue', label: 'Đơn đã xong' },
    Packaging: { badge: 'badge-avocado', label: 'Đơn đã gói' },
    ReadyToShip: { badge: 'badge-avocado', label: 'Đã gửi' },
    Completed: { badge: 'badge-green', label: 'Hoàn thành' },
  };
  const info = statusMap[status];
  return <span className={info?.badge || 'badge-gray'}> {info?.label || status}</span>;
}

const STATUS_PIPELINE: Array<{ key: string; label: string; color: string; dot: string }> = [
  { key: 'Draft', label: 'Nhập đơn', color: 'text-gray-600', dot: 'bg-gray-300' },
  { key: 'WaitingConfirm', label: 'Chờ làm', color: 'text-amber-600', dot: 'bg-amber-400' },
  { key: 'InProgress', label: 'Đang làm', color: 'text-mint-600', dot: 'bg-mint-500' },
  { key: 'Packaging', label: 'Đã gói', color: 'text-pink-600', dot: 'bg-pink-500' },
  { key: 'ReadyToShip', label: 'Đã gửi', color: 'text-avocado-600', dot: 'bg-avocado-500' },
  { key: 'Completed', label: 'Hoàn thành', color: 'text-emerald-600', dot: 'bg-emerald-500' },
];

export default function DashboardPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<{
    totalOrders: number;
    totalRevenue: number;
    totalProfit: number;
    activeOrders: number;
    recentOrders: any[];
    deadlineOrders: any[];
    overdueCount: number;
    soonCount: number;
  } | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!token) return;
    apiClient<any>('/dashboard/stats', { token })
      .then((res) => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    apiClient<any>('/orders/counts', { token })
      .then((res) => {
        if (res.data) setStatusCounts(res.data);
      })
      .catch(() => {});
  }, [token]);

  if (loading) {
    return (
      <div className="page-enter space-y-6">
        <div className="skeleton-title mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonCard />
      </div>
    );
  }

  const totalOrders = stats?.totalOrders || 0;
  const activeOrders = stats?.activeOrders || 0;
  const completedOrders = Math.max(totalOrders - activeOrders, 0);
  const totalRevenue = stats?.totalRevenue || 0;
  const totalProfit = stats?.totalProfit || 0;
  const overdueCount = stats?.overdueCount || 0;
  const soonCount = stats?.soonCount || 0;
  const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
  const marginRate = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
  const activeRate = totalOrders > 0 ? Math.round((activeOrders / totalOrders) * 100) : 0;

  const statCards: Array<{
    title: string;
    value: string | number;
    icon: string;
    color: string;
    caption: string;
    barColor?: string;
    percent?: number;
  }> = [
    {
      title: 'Tổng đơn hàng',
      value: totalOrders,
      icon: 'clipboard',
      color: 'bg-avocado-50 text-avocado-700',
      barColor: 'bg-avocado-500',
      caption: `${completedOrders} hoàn thành · ${activeOrders} đang xử lý`,
      percent: completionRate,
    },
    {
      title: 'Doanh thu',
      value: formatCurrency(totalRevenue),
      icon: 'usd-circle',
      color: 'bg-emerald-50 text-emerald-700',
      caption: 'Tổng doanh thu đã hoàn thành',
    },
    {
      title: 'Lợi nhuận',
      value: formatCurrency(totalProfit),
      icon: 'arrow-trend-up',
      color: 'bg-pink-50 text-pink-700',
      barColor: 'bg-pink-500',
      caption: `Biên lợi nhuận ${marginRate}%`,
      percent: Math.min(marginRate, 100),
    },
    {
      title: 'Đang xử lý',
      value: activeOrders,
      icon: 'arrows-repeat',
      color: 'bg-amber-50 text-amber-700',
      barColor: 'bg-amber-500',
      caption:
        overdueCount > 0
          ? `${activeOrders} đang xử lý · ${overdueCount} quá hạn`
          : 'Đơn chưa hoàn thành',
      percent: activeRate,
    },
  ];

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
            backgroundImage: `radial-gradient(circle at 25% 25%, #cddda9 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-pink-500 flex items-center justify-center text-white shadow-md ring-1 ring-white/60">
                    <FlaticonIcon name="analyse" size="lg" />
                  </div>
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-pink-300/30 to-mint-300/30 blur-sm -z-10" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                      {user?.name ? `Chào, ${user.name.split(' ').pop()}!` : 'Tổng quan'}
                    </h1>
                    {stats && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-pink-100 text-pink-700 shadow-sm ring-1 ring-pink-200/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                        {stats.totalOrders} đơn
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5 capitalize">
                    {new Date().toLocaleDateString('vi-VN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Link href="/orders" className="btn-primary btn-sm">
                <span className="mr-1.5">+</span> Đơn hàng mới
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-pink-200/80 to-transparent" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-5">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-white border border-gray-100 rounded-xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200 group cursor-default"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center shadow-sm ring-1 ring-black/5`}
              >
                <FlaticonIcon name={card.icon} size="md" className="text-inherit" />
              </div>
              {card.percent !== undefined && (
                <span
                  className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full ${
                    overdueCount > 0
                      ? 'bg-red-50 text-red-600'
                      : soonCount > 0
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  {overdueCount > 0
                    ? `${overdueCount} quá hạn`
                    : soonCount > 0
                      ? `${soonCount} sắp tới`
                      : `${card.percent}%`}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {card.title}
            </p>
            <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1 tabular-nums truncate">
              {card.value}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate">{card.caption}</p>
            {card.percent !== undefined && card.barColor && (
              <div className="h-1.5 rounded-full bg-gray-100 mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${card.barColor} transition-all duration-700 ease-out`}
                  style={{ width: `${Math.min(Math.max(card.percent, 2), 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Status Pipeline */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3.5 sm:p-4 mb-4 sm:mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Đơn theo trạng thái</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Bấm vào để xem danh sách đơn theo trạng thái
            </p>
          </div>
          <Link
            href="/orders"
            className="btn-ghost btn-sm text-avocado-600 hover:text-avocado-700 font-medium"
          >
            Xem tất cả <span className="ml-1">→</span>
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 md:gap-3">
          {' '}
          {STATUS_PIPELINE.map((s) => {
            const count = statusCounts[s.key] || 0;
            return (
              <button
                key={s.key}
                onClick={() => router.push(`/orders?status=${s.key}`)}
                className={`relative flex flex-col items-center gap-1 rounded-xl border p-2.5 transition-all duration-200 group ${
                  count > 0
                    ? 'border-pink-200 bg-pink-50/50 hover:bg-pink-50 hover:border-pink-300 hover:shadow-sm'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${s.dot} ${count > 0 ? 'animate-pulse' : ''}`}
                />
                <span className={`text-lg sm:text-xl font-bold tabular-nums ${s.color}`}>
                  {count}
                </span>
                <span className="text-[10px] sm:text-xs font-medium text-gray-500 group-hover:text-gray-700">
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Đơn hàng gần đây</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {stats?.recentOrders?.length || 0} đơn hàng gần nhất
              </p>
            </div>
            <Link
              href="/orders"
              className="btn-ghost btn-sm text-avocado-600 hover:text-avocado-700 font-medium"
            >
              Xem tất cả <span className="ml-1">→</span>
            </Link>
          </div>
          {stats?.recentOrders && stats.recentOrders.length > 0 ? (
            <>
              {/* Mobile recent orders */}
              <div className="divide-y divide-gray-100 md:hidden">
                {stats.recentOrders.map((order: any) => (
                  <div
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/orders?id=${order.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/orders?id=${order.id}`)}
                    className="flex items-center gap-3 px-4 py-3.5 active:bg-avocado-50/60 transition-colors cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
                      {order.customer?.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-gray-900 text-sm truncate flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-avocado-500 bg-avocado-50 rounded px-1.5 py-0.5 ring-1 ring-avocado-100 flex-shrink-0">
                            {order.id}
                          </span>
                          {order.customer?.name || 'N/A'}
                          <SocialLinks customer={order.customer} size="xs" />
                        </p>
                        <span className="font-bold text-gray-900 text-sm tabular-nums flex-shrink-0">
                          {formatCurrency(Number(order.totalCost))}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={order.status} />
                        <span className="text-[10px] text-gray-400">
                          {formatDate(order.orderDate)}
                        </span>
                      </div>
                    </div>
                    <svg
                      className="w-4 h-4 text-gray-300 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
              {/* Desktop recent orders table */}
              <div className="table-wrap hidden md:block">
                <table>
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Khách hàng</th>
                      <th>Trạng thái</th>
                      <th className="text-right">Tổng</th>
                      <th>Ngày</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentOrders.map((order: any) => (
                      <tr
                        key={order.id}
                        className="cursor-pointer hover:bg-avocado-50/30 transition-colors"
                        onClick={() => router.push(`/orders?id=${order.id}`)}
                      >
                        <td>
                          <span className="text-xs font-semibold text-avocado-600 bg-avocado-50 rounded px-1.5 py-0.5 ring-1 ring-avocado-100 whitespace-nowrap">
                            {order.id}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-pink-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm flex-shrink-0">
                              {order.customer?.name?.charAt(0) || '?'}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-gray-900">
                                {order.customer?.name || 'N/A'}
                              </span>
                              <SocialLinks customer={order.customer} size="xs" />
                            </div>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={order.status} />
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
            </>
          ) : (
            <div className="empty-state">
              <FlaticonIcon name="clipboard" size="xl" className="empty-state-icon" />
              <p className="empty-state-text">Chưa có đơn hàng nào. Hãy tạo đơn hàng đầu tiên!</p>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Thao tác nhanh</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                {
                  icon: 'plus',
                  label: 'Đơn hàng mới',
                  href: '/orders',
                  color: 'bg-avocado-50 text-avocado-700',
                  desc: 'Tạo đơn mới',
                },
                {
                  icon: 'box-open',
                  label: 'Hàng hóa',
                  href: '/products',
                  color: 'bg-mint-50 text-mint-700',
                  desc: 'Quản lý sản phẩm',
                },
                {
                  icon: 'users-alt',
                  label: 'Khách hàng',
                  href: '/customers',
                  color: 'bg-emerald-50 text-emerald-700',
                  desc: 'DS khách hàng',
                },
                {
                  icon: 'receipt',
                  label: 'Công thức',
                  href: '/recipes',
                  color: 'bg-amber-50 text-amber-700',
                  desc: 'Quản lý công thức',
                },
                {
                  icon: 'warehouse-alt',
                  label: 'Kho hàng',
                  href: '/inventory',
                  color: 'bg-cyan-50 text-cyan-700',
                  desc: 'Nhập/xuất kho',
                },
                {
                  icon: 'truck-side',
                  label: 'Giao hàng',
                  href: '/shipping',
                  color: 'bg-pink-50 text-pink-700',
                  desc: 'Theo dõi vận đơn',
                },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl border border-gray-100 hover:border-pink-200 hover:bg-pink-50/30 transition-all duration-200 group text-center"
                >
                  <div
                    className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center text-base shadow-sm group-hover:scale-110 transition-transform`}
                  >
                    <FlaticonIcon name={action.icon} size="md" className="text-inherit" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 group-hover:text-avocado-700">
                    {action.label}
                  </span>
                  <span className="text-[10px] text-gray-400">{action.desc}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Deadline Alerts */}
          {stats?.deadlineOrders && stats.deadlineOrders.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">⏰ Sắp đến hạn</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                  {stats.overdueCount > 0
                    ? `${stats.overdueCount} quá hạn`
                    : `${stats.soonCount} sắp tới`}
                </span>
              </div>
              <div className="space-y-2.5">
                {stats.deadlineOrders.map((order: any) => {
                  const deadlineDate = new Date(order.deadline);
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);
                  deadlineDate.setHours(23, 59, 59, 999);
                  const diffDays = Math.ceil(
                    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                  );
                  const isOverdue = diffDays <= 0;
                  const isSoon = diffDays > 0 && diffDays <= 3;
                  return (
                    <Link
                      key={order.id}
                      href={`/orders?id=${order.id}`}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all hover:shadow-sm ${
                        isOverdue
                          ? 'bg-red-50 border-red-200 hover:border-red-300'
                          : isSoon
                            ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                            : 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                      }`}
                    >
                      <span className="text-sm">{isOverdue ? '🔴' : isSoon ? '🟡' : '🟢'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {order.customer?.name || 'N/A'}
                          </p>
                          <SocialLinks customer={order.customer} size="xs" />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {isOverdue
                            ? `Quá hạn ${Math.abs(diffDays)} ngày`
                            : `Còn ${diffDays} ngày`}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-medium tabular-nums ${
                          isOverdue
                            ? 'text-red-600'
                            : isSoon
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                        }`}
                      >
                        {formatDate(order.deadline)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Tổng quan đơn hàng</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-avocado-50 flex items-center justify-center text-sm">
                    <FlaticonIcon name="clipboard" size="sm" />
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
                    <FlaticonIcon name="arrows-repeat" size="sm" />
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
                    <FlaticonIcon name="usd-circle" size="sm" />
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
