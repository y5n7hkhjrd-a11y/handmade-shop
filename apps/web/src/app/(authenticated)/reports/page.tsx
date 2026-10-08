'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@handmade-shop/shared';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import FlaticonIcon from '@/components/FlaticonIcon';
import CustomDate from '@/components/CustomDate';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface ProfitData {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
  orderCount: number;
}
interface TopProduct {
  productId: string;
  productName: string;
  totalSold: number;
  totalRevenue: number;
}
interface TopCustomer {
  customerId: string;
  customerName: string;
  totalOrders: number;
  totalSpent: number;
}

const PRODUCT_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
];

/** Compact currency for axis labels: 1.5M, 800K, 12K */
function compactAmount(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const v = n / 1_000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}K`;
  }
  return String(Math.round(n));
}

/** Format period key (YYYY-MM-DD | YYYY-Wxx | YYYY-MM | YYYY) into a short label */
function periodShort(period: string, groupBy: string): string {
  if (groupBy === 'week') {
    const [, week] = period.split('-');
    return week.replace('W', '');
  }
  const parts = period.split('-');
  if (groupBy === 'day' && parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  if (groupBy === 'month' && parts.length >= 2) {
    return `${parts[1]}/${parts[0].slice(2)}`;
  }
  return period;
}

/** Format period key into a human label (DD/MM/YYYY, Tuần Wxx, Tháng MM/YYYY, Năm) */
function periodFull(period: string, groupBy: string): string {
  if (groupBy === 'week') {
    const [year, week] = period.split('-');
    return `Tuần ${week.replace('W', '')}/${year}`;
  }
  const parts = period.split('-').map(Number);
  if (groupBy === 'day' && parts.length === 3) {
    return `${String(parts[2]).padStart(2, '0')}/${String(parts[1]).padStart(2, '0')}/${parts[0]}`;
  }
  if (groupBy === 'month' && parts.length >= 2) {
    return `Tháng ${parts[1]}/${parts[0]}`;
  }
  return `Năm ${period}`;
}

/** Margin (%) for one period */
function marginOf(d: ProfitData): number {
  return d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0;
}

/** Line chart drawn with Chart.js — two scales (money left, margin % right). */
function RevenueChart({ data, groupBy }: { data: ProfitData[]; groupBy: string }) {
  const labels = data.map((d) => periodShort(d.period, groupBy));
  const margins = data.map(marginOf);

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'Doanh thu',
          data: data.map((d) => d.revenue),
          borderColor: '#7FA345',
          backgroundColor: 'rgba(127, 163, 69, 0.10)',
          borderWidth: 2.5,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#7FA345',
          pointBorderWidth: 2,
          pointRadius: 3.5,
          pointHoverRadius: 5,
          tension: 0.35,
          fill: true,
          yAxisID: 'y',
        },
        {
          label: 'Chi phí',
          data: data.map((d) => d.cost),
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.08)',
          borderWidth: 2,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#f43f5e',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.35,
          yAxisID: 'y',
        },
        {
          label: 'Lợi nhuận',
          data: data.map((d) => d.profit),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.08)',
          borderWidth: 2,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#8b5cf6',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.35,
          yAxisID: 'y',
        },
        {
          label: 'Tỉ suất (%)',
          data: margins,
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          pointBackgroundColor: '#fff',
          pointBorderColor: '#f59e0b',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.35,
          yAxisID: 'y1',
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, groupBy],
  );

  const options: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          align: 'center',
          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            boxWidth: 18,
            boxHeight: 2,
            padding: 14,
            color: '#4b5563',
            font: { size: 11.5, weight: 500 },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleColor: '#f9fafb',
          bodyColor: '#e5e7eb',
          padding: 10,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            title: (items) => periodFull(data[items[0]!.dataIndex]!.period, groupBy),
            label: (item) => {
              const value = Number(item.parsed.y);
              if (item.dataset.label === 'Tỉ suất (%)') {
                return `Tỉ suất: ${value.toFixed(1)}%`;
              }
              return `${item.dataset.label}: ${formatCurrency(value)}`;
            },
            afterBody: (items) => {
              const d = data[items[0]?.dataIndex ?? 0];
              return d ? [`Đơn hàng: ${d.orderCount}`] : [];
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#9ca3af',
            font: { size: 10.5 },
            maxRotation: groupBy === 'day' ? 45 : 0,
            autoSkip: true,
            maxTicksLimit: 16,
          },
          border: { display: false },
        },
        y: {
          position: 'left',
          beginAtZero: true,
          grid: { color: '#eef1e6', drawTicks: false },
          ticks: {
            color: '#9ca3af',
            font: { size: 10.5 },
            callback: (value) => compactAmount(Number(value)),
          },
          border: { display: false },
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: {
            color: '#d9970b',
            font: { size: 10.5 },
            callback: (value) => `${value}%`,
          },
          border: { display: false },
        },
      },
    }),
    [data, groupBy],
  );

  return (
    <div className="relative h-[300px]">
      <Line data={chartData} options={options} />
    </div>
  );
}

const tabs = [
  {
    id: 'revenue',
    label: 'Doanh thu & Lợi nhuận',
    icon: 'analyse',
    desc: 'Hiệu suất tài chính theo kỳ',
  },
  {
    id: 'products',
    label: 'Hàng bán chạy',
    icon: 'trophy',
    desc: 'Sản phẩm bán chạy nhất theo số lượng và doanh thu',
  },
  {
    id: 'customers',
    label: 'Khách hàng thân thiết',
    icon: 'users-alt',
    desc: 'Khách hàng có giá trị cao nhất',
  },
];

export default function ReportsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('revenue');
  const [profitData, setProfitData] = useState<ProfitData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [showDateFilter, setShowDateFilter] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (dateRange.startDate) params.set('startDate', dateRange.startDate);
    if (dateRange.endDate) params.set('endDate', dateRange.endDate);
    params.set('groupBy', groupBy);
    const query = params.toString() ? `?${params.toString()}` : '';

    Promise.all([
      apiClient<any>(`/reports/profit${query}`, { token }),
      apiClient<any>(`/reports/top-products?limit=10${query}`, { token }),
      apiClient<any>(`/reports/top-customers?limit=10${query}`, { token }),
    ])
      .then(([profitRes, productsRes, customersRes]) => {
        setProfitData(profitRes.data || []);
        setTopProducts(productsRes.data || []);
        setTopCustomers(customersRes.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token, dateRange, groupBy]);

  // Table shows newest period first; the chart keeps chronological order
  const profitTableData = [...profitData].sort((a, b) => b.period.localeCompare(a.period));
  const maxRevenue = profitData.length > 0 ? Math.max(...profitData.map((x) => x.revenue), 1) : 1;
  const totalRevenue = profitData.reduce((s, d) => s + d.revenue, 0);
  const totalCost = profitData.reduce((s, d) => s + d.cost, 0);
  const totalProfit = profitData.reduce((s, d) => s + d.profit, 0);
  const totalOrders = profitData.reduce((s, d) => s + d.orderCount, 0);
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  const maxProductRevenue =
    topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.totalRevenue), 1) : 1;
  const maxCustomerSpent =
    topCustomers.length > 0 ? Math.max(...topCustomers.map((c) => c.totalSpent), 1) : 1;

  function exportToCSV() {
    const rows = [['Period', 'Revenue', 'Cost', 'Profit', 'Orders']];
    profitData.forEach((d) =>
      rows.push([
        d.period,
        String(d.revenue),
        String(d.cost),
        String(d.profit),
        String(d.orderCount),
      ]),
    );
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-enter space-y-6">
      {/* ─── Header ─── */}
      <div className="relative rounded-xl bg-gradient-to-br from-pink-50 via-white to-avocado-50/70 border border-pink-100/70 shadow-[0_2px_12px_-4px_rgba(127,163,69,0.15)] mb-4 sm:mb-6">
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
        <div className="relative px-4 py-3 sm:px-6 sm:py-5">
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
                      Báo cáo
                    </h1>
                    {totalOrders > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-pink-100 text-pink-700 shadow-sm ring-1 ring-pink-200/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                        {totalOrders} đơn
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">Phân tích và thống kê kinh doanh</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowDateFilter(!showDateFilter)}
                  className="btn-secondary btn-sm"
                >
                  <FlaticonIcon name="calendar" size="sm" className="mr-1.5" />
                  {dateRange.startDate || dateRange.endDate ? 'Đã lọc ngày' : 'Khoảng ngày'}
                </button>
                {showDateFilter && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-10 min-w-[240px] animate-[scaleIn_0.15s_ease-out]">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          Từ ngày
                        </label>
                        <CustomDate
                          value={dateRange.startDate || ''}
                          onChange={(startDate) => setDateRange((prev) => ({ ...prev, startDate }))}
                          placeholder="Chọn ngày bắt đầu"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          Đến ngày
                        </label>
                        <CustomDate
                          value={dateRange.endDate || ''}
                          onChange={(endDate) => setDateRange((prev) => ({ ...prev, endDate }))}
                          placeholder="Chọn ngày kết thúc"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            setDateRange({});
                            setShowDateFilter(false);
                          }}
                          className="btn-ghost btn-xs flex-1"
                        >
                          Xóa bộ lọc
                        </button>
                        <button
                          onClick={() => setShowDateFilter(false)}
                          className="btn-primary btn-xs flex-1"
                        >
                          Áp dụng
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={exportToCSV}
                className="btn-secondary btn-sm"
                disabled={profitData.length === 0}
              >
                <FlaticonIcon name="file-export" size="sm" className="mr-1.5" /> Xuất CSV
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-pink-200/80 to-transparent" />
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex gap-1.5 p-1 bg-white border border-gray-200/80 rounded-xl shadow-sm w-fit max-w-full overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.desc}
            className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-pink-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <FlaticonIcon name={tab.icon} size="sm" className="text-inherit" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner size="lg" />
      ) : (
        <>
          {activeTab === 'revenue' && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white border border-gray-100 rounded-xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-avocado-50 text-avocado-700 flex items-center justify-center shadow-sm ring-1 ring-black/5">
                      <FlaticonIcon name="usd-circle" size="md" className="text-inherit" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-avocado-50 text-avocado-700">
                      {totalOrders} đơn
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng doanh thu
                  </p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1 tabular-nums truncate">
                    {formatCurrency(totalRevenue)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate">
                    Trên {totalOrders} đơn hàng
                  </p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shadow-sm ring-1 ring-black/5">
                      <FlaticonIcon name="wallet" size="md" className="text-inherit" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-50 text-rose-500">
                      Chi phí
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng chi phí
                  </p>
                  <p className="text-xl md:text-2xl font-bold text-gray-700 mt-1 tabular-nums truncate">
                    {formatCurrency(totalCost)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate">
                    Nguyên vật liệu &amp; đóng gói
                  </p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shadow-sm ring-1 ring-black/5">
                      <FlaticonIcon name="arrow-trend-up" size="md" className="text-inherit" />
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full ${
                        totalProfit >= 0
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {totalProfit >= 0 ? 'Lời' : 'Lỗ'}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng lợi nhuận
                  </p>
                  <p
                    className={`text-xl md:text-2xl font-bold mt-1 tabular-nums truncate ${
                      totalProfit >= 0 ? 'text-[#66863A]' : 'text-red-600'
                    }`}
                  >
                    {totalProfit >= 0 ? '+' : ''}
                    {formatCurrency(totalProfit)}
                  </p>
                  <div className="h-1.5 rounded-full bg-gray-100 mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        totalProfit >= 0
                          ? 'bg-gradient-to-r from-[#8b5cf6] to-[#c4b5fd]'
                          : 'bg-gradient-to-r from-red-500 to-red-400'
                      }`}
                      style={{ width: `${Math.min(Math.max(Number(profitMargin), 0), 100)}%` }}
                    />
                  </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm ring-1 ring-black/5">
                      <FlaticonIcon name="chart-pie" size="md" className="text-inherit" />
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full ${
                        Number(profitMargin) >= 0
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {Number(profitMargin) >= 0 ? 'Tốt' : 'Cần xem'}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tỉ suất lợi nhuận
                  </p>
                  <p
                    className={`text-xl md:text-2xl font-bold mt-1 tabular-nums ${
                      Number(profitMargin) >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {profitMargin}%
                  </p>
                  <div className="h-1.5 rounded-full bg-gray-100 mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        Number(profitMargin) >= 0
                          ? 'bg-gradient-to-r from-[#f59e0b] to-[#fcd34d]'
                          : 'bg-gradient-to-r from-red-500 to-red-400'
                      }`}
                      style={{ width: `${Math.min(Math.max(Number(profitMargin), 0), 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Revenue bar chart */}
              {profitData.length > 0 && (
                <div className="card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Doanh thu theo kỳ</h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Tổng doanh thu theo{' '}
                        {groupBy === 'day'
                          ? 'ngày'
                          : groupBy === 'week'
                            ? 'tuần'
                            : groupBy === 'month'
                              ? 'tháng'
                              : 'năm'}{' '}
                        trong khoảng thời gian đã chọn
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
                        {(
                          [
                            { id: 'day', label: 'Ngày' },
                            { id: 'week', label: 'Tuần' },
                            { id: 'month', label: 'Tháng' },
                            { id: 'year', label: 'Năm' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setGroupBy(opt.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                              groupBy === opt.id
                                ? 'bg-white text-[#66863A] shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <RevenueChart data={profitData} groupBy={groupBy} />
                </div>
              )}

              {/* Revenue table */}
              <div className="card p-0 overflow-hidden">
                <div className="p-6 pb-2 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Chi tiết theo kỳ</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Hiệu suất tài chính theo từng kỳ</p>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Kỳ</th>
                        <th className="text-left">Doanh thu</th>
                        <th className="text-left">Chi phí</th>
                        <th className="text-left">Lợi nhuận</th>
                        <th className="text-left">Tỉ suất</th>
                        <th className="text-left">Đơn hàng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitTableData.map((d) => {
                        const margin =
                          d.revenue > 0 ? ((d.profit / d.revenue) * 100).toFixed(1) : '0.0';
                        return (
                          <tr
                            key={d.period}
                            className="group hover:bg-mint-50/40 transition-colors duration-150"
                          >
                            {/* Kỳ */}
                            <td>
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gray-50 ring-1 ring-gray-200 flex items-center justify-center flex-shrink-0">
                                  <FlaticonIcon
                                    name={groupBy === 'year' ? 'calendar' : 'clock'}
                                    size="xs"
                                    className="text-gray-400"
                                  />
                                </div>
                                <span className="font-medium text-gray-900 whitespace-nowrap">
                                  {periodFull(d.period, groupBy)}
                                </span>
                              </div>
                            </td>
                            {/* Doanh thu */}
                            <td className="text-left">
                              <span className="inline-flex items-center gap-1.5 font-semibold text-[#66863A] tabular-nums">
                                <FlaticonIcon
                                  name="usd-circle"
                                  size="xs"
                                  className="text-[#7FA345]"
                                />
                                {formatCurrency(d.revenue)}
                              </span>
                            </td>
                            {/* Chi phí */}
                            <td className="text-left">
                              <span className="inline-flex items-center gap-1.5 font-medium text-rose-500 tabular-nums">
                                <FlaticonIcon name="wallet" size="xs" className="text-rose-400" />
                                {formatCurrency(d.cost)}
                              </span>
                            </td>
                            {/* Lợi nhuận */}
                            <td className="text-left">
                              <span
                                className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${
                                  d.profit >= 0 ? 'text-violet-600' : 'text-red-600'
                                }`}
                              >
                                <FlaticonIcon
                                  name={d.profit >= 0 ? 'arrow-trend-up' : 'arrow-trend-down'}
                                  size="xs"
                                  className="text-inherit"
                                />
                                {d.profit >= 0 ? '+' : ''}
                                {formatCurrency(d.profit)}
                              </span>
                            </td>
                            {/* Tỉ suất */}
                            <td className="text-left">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
                                  Number(margin) >= 0
                                    ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-200'
                                    : 'bg-red-50 text-red-600 ring-1 ring-red-200'
                                }`}
                              >
                                {margin}%
                              </span>
                            </td>
                            {/* Đơn hàng */}
                            <td className="text-left">
                              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 tabular-nums">
                                <FlaticonIcon
                                  name="clipboard"
                                  size="xs"
                                  className="text-gray-400"
                                />
                                {d.orderCount}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {profitData.length > 0 && (
                        <tr className="bg-avocado-50/50 font-semibold">
                          <td className="text-gray-800">Tổng</td>
                          <td className="text-left text-[#66863A] tabular-nums">
                            <span className="inline-flex items-center gap-1.5">
                              <FlaticonIcon
                                name="usd-circle"
                                size="xs"
                                className="text-[#7FA345]"
                              />
                              {formatCurrency(totalRevenue)}
                            </span>
                          </td>
                          <td className="text-left text-rose-600 tabular-nums">
                            <span className="inline-flex items-center gap-1.5">
                              <FlaticonIcon name="wallet" size="xs" className="text-rose-400" />
                              {formatCurrency(totalCost)}
                            </span>
                          </td>
                          <td
                            className={`text-left tabular-nums ${totalProfit >= 0 ? 'text-violet-600' : 'text-red-600'}`}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <FlaticonIcon
                                name={totalProfit >= 0 ? 'arrow-trend-up' : 'arrow-trend-down'}
                                size="xs"
                                className="text-inherit"
                              />
                              {totalProfit >= 0 ? '+' : ''}
                              {formatCurrency(totalProfit)}
                            </span>
                          </td>
                          <td className="text-left">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
                                Number(profitMargin) >= 0
                                  ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-200'
                                  : 'bg-red-50 text-red-600 ring-1 ring-red-200'
                              }`}
                            >
                              {profitMargin}%
                            </span>
                          </td>
                          <td className="text-left text-gray-700 tabular-nums">
                            <span className="inline-flex items-center gap-1.5">
                              <FlaticonIcon name="clipboard" size="xs" className="text-gray-400" />
                              {totalOrders}
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {profitData.length === 0 && !loading && (
                <div className="card">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FlaticonIcon name="analyse" size="xl" className="empty-state-icon" />
                    <p className="font-semibold text-gray-700 mb-1">Chưa có dữ liệu doanh thu</p>
                    <p className="text-sm text-gray-500 max-w-sm">
                      Hoàn thành một số đơn hàng để xem báo cáo doanh thu và phân tích tài chính.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'products' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Product bar chart */}
              <div className="lg:col-span-1 card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Phân bố doanh thu</h2>
                <div className="space-y-3">
                  {topProducts.slice(0, 8).map((p, idx) => (
                    <div key={p.productId} className="group">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 truncate flex-1">{p.productName}</span>
                        <span className="text-gray-500 tabular-nums ml-2">
                          {formatCurrency(p.totalRevenue)}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${(p.totalRevenue / maxProductRevenue) * 100}%`,
                            backgroundColor: PRODUCT_COLORS[idx % PRODUCT_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {topProducts.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Chưa có dữ liệu sản phẩm
                    </p>
                  )}
                </div>
              </div>

              {/* Product table */}
              <div className="lg:col-span-2 card p-0 overflow-hidden">
                <div className="p-6 pb-2">
                  <h2 className="text-lg font-semibold text-gray-900">Hàng bán chạy</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Xếp hạng theo tổng số lượng đã bán</p>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th>Sản phẩm</th>
                        <th className="text-left">Đã bán</th>
                        <th className="text-left">Doanh thu</th>
                        <th className="text-left">% Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((p, idx) => {
                        const pct =
                          maxProductRevenue > 0
                            ? ((p.totalRevenue / maxProductRevenue) * 100).toFixed(1)
                            : '0.0';
                        return (
                          <tr key={p.productId} className="group">
                            <td className="text-left">
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                  idx === 0
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : idx === 1
                                      ? 'bg-gray-100 text-gray-600'
                                      : idx === 2
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'text-gray-400'
                                }`}
                              >
                                {idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                              </span>
                            </td>
                            <td className="font-medium">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{
                                    backgroundColor: PRODUCT_COLORS[idx % PRODUCT_COLORS.length],
                                  }}
                                />
                                {p.productName}
                              </div>
                            </td>
                            <td className="text-left font-semibold tabular-nums">
                              {p.totalSold.toLocaleString()}
                            </td>
                            <td className="text-left font-medium text-[#66863A] tabular-nums">
                              {formatCurrency(p.totalRevenue)}
                            </td>
                            <td className="text-left text-gray-500 tabular-nums">{pct}%</td>
                          </tr>
                        );
                      })}
                      {topProducts.length === 0 && (
                        <tr>
                          <td colSpan={5}>
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                              <FlaticonIcon name="trophy" size="xl" className="empty-state-icon" />
                              <p className="font-semibold text-gray-700 mb-1">
                                Chưa có dữ liệu sản phẩm
                              </p>
                              <p className="text-sm text-gray-500 max-w-sm">
                                Bán sản phẩm để xem bảng xếp hạng sản phẩm bán chạy.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Customer visualization */}
              <div className="lg:col-span-1 card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Phân bố chi tiêu khách hàng
                </h2>
                <div className="space-y-3">
                  {topCustomers.slice(0, 8).map((c, idx) => (
                    <div key={c.customerId} className="group">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 truncate flex-1">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-mint-400 text-white text-[10px] font-bold mr-2">
                            {c.customerName.charAt(0)}
                          </span>
                          {c.customerName}
                        </span>
                        <span className="text-gray-500 tabular-nums ml-2">{c.totalOrders} đơn</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill bg-gradient-to-r from-[#7FA345] to-[#66863A]"
                          style={{ width: `${(c.totalSpent / maxCustomerSpent) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {topCustomers.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Chưa có dữ liệu khách hàng
                    </p>
                  )}
                </div>
              </div>

              {/* Customer table */}
              <div className="lg:col-span-2 card p-0 overflow-hidden">
                <div className="p-6 pb-2">
                  <h2 className="text-lg font-semibold text-gray-900">Khách hàng thân thiết</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Xếp hạng theo tổng số đơn hàng</p>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th>Khách hàng</th>
                        <th className="text-left">Đơn hàng</th>
                        <th className="text-left">Tổng chi</th>
                        <th className="text-left">TB / đơn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCustomers.map((c, idx) => {
                        const avgOrder = c.totalOrders > 0 ? c.totalSpent / c.totalOrders : 0;
                        return (
                          <tr key={c.customerId} className="group">
                            <td className="text-left text-gray-400">
                              {idx === 0
                                ? '🥇'
                                : idx === 1
                                  ? '🥈'
                                  : idx === 2
                                    ? '🥉'
                                    : `#${idx + 1}`}
                            </td>
                            <td className="font-medium">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-mint-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                  {c.customerName.charAt(0)}
                                </div>
                                {c.customerName}
                              </div>
                            </td>
                            <td className="text-left font-semibold tabular-nums">
                              {c.totalOrders}
                            </td>
                            <td className="text-left font-medium text-[#66863A] tabular-nums">
                              {formatCurrency(c.totalSpent)}
                            </td>
                            <td className="text-left text-gray-600 tabular-nums">
                              {formatCurrency(avgOrder)}
                            </td>
                          </tr>
                        );
                      })}
                      {topCustomers.length === 0 && (
                        <tr>
                          <td colSpan={5}>
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                              <FlaticonIcon
                                name="users-alt"
                                size="xl"
                                className="empty-state-icon"
                              />
                              <p className="font-semibold text-gray-700 mb-1">
                                Chưa có dữ liệu khách hàng
                              </p>
                              <p className="text-sm text-gray-500 max-w-sm">
                                Hoàn thành đơn hàng để xem bảng xếp hạng khách hàng.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
