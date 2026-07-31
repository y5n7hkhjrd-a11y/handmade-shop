'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@handmade-shop/shared';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import FlaticonIcon from '@/components/FlaticonIcon';

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

const CHART_COLORS = [
  '#E88DAB',
  '#F9D6E5',
  '#D8F3DC',
  '#86D492',
  '#BFDBFE',
  '#FCD34D',
  '#FCA5A5',
  '#F0ECEE',
  '#D97D9E',
  '#FCE7F3',
];
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

export default function ReportsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('revenue');
  const [profitData, setProfitData] = useState<ProfitData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [showDateFilter, setShowDateFilter] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (dateRange.startDate) params.set('startDate', dateRange.startDate);
    if (dateRange.endDate) params.set('endDate', dateRange.endDate);
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
  }, [token, dateRange]);

  const tabs = [
    { id: 'revenue', label: '📊 Doanh thu & Lợi nhuận', desc: 'Hiệu suất tài chính theo kỳ' },
    {
      id: 'products',
      label: '🏆 Hàng bán chạy',
      desc: 'Sản phẩm bán chạy nhất theo số lượng và doanh thu',
    },
    { id: 'customers', label: '👥 Khách hàng thân thiết', desc: 'Khách hàng có giá trị cao nhất' },
  ];

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
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-pink-50 via-white to-purple-50/70 border border-pink-100/70 shadow-[0_2px_12px_-4px_rgba(232,141,171,0.15)] mb-4 sm:mb-6">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-gradient-to-br from-pink-200/25 to-purple-200/25 rounded-full blur-3xl" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-gradient-to-tr from-rose-200/20 to-pink-200/20 rounded-full blur-2xl" />
        <div className="absolute top-1/2 -translate-y-1/2 right-1/3 w-16 h-16 bg-purple-100/10 rounded-full blur-xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #e88dab 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }} />
        <div className="relative px-4 py-3 sm:px-6 sm:py-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-400 via-pink-500 to-purple-500 flex items-center justify-center text-white shadow-md ring-1 ring-white/60">
                    <FlaticonIcon name="analyse" size="lg" />
                  </div>
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-pink-300/30 to-purple-300/30 blur-sm -z-10" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                      Báo cáo
                    </h1>
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
                  <FlaticonIcon name="time-watch-calendar" size="sm" className="mr-1.5" />
                  {dateRange.startDate || dateRange.endDate ? 'Đã lọc' : 'Khoảng ngày'}
                </button>
                {showDateFilter && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-10 min-w-[240px] animate-[scaleIn_0.15s_ease-out]">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Start Date</label>
                        <input
                          type="date"
                          className="input text-sm"
                          value={dateRange.startDate || ''}
                          onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">End Date</label>
                        <input
                          type="date"
                          className="input text-sm"
                          value={dateRange.endDate || ''}
                          onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => { setDateRange({}); setShowDateFilter(false); }}
                          className="btn-ghost btn-xs flex-1"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => setShowDateFilter(false)}
                          className="btn-primary btn-xs flex-1"
                        >
                          Apply
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
                <FlaticonIcon name="download" size="sm" className="mr-1.5" /> Export
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-pink-200/80 to-transparent" />
      </div>

      <div className="tabs w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'tab-active' : 'tab'}
            title={tab.desc}
          >
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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Tổng doanh thu
                  </p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(totalRevenue)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Across {totalOrders} orders</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Tổng chi phí
                  </p>
                  <p className="text-2xl font-bold text-gray-700">{formatCurrency(totalCost)}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Tổng lợi nhuận
                  </p>
                  <p
                    className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-[#D97D9E]' : 'text-red-600'}`}
                  >
                    {totalProfit >= 0 ? '+' : ''}
                    {formatCurrency(totalProfit)}
                  </p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Tỉ suất lợi nhuận
                  </p>
                  <p
                    className={`text-2xl font-bold ${Number(profitMargin) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {profitMargin}%
                  </p>
                  <div className="progress-bar mt-2">
                    <div
                      className={`progress-bar-fill ${Number(profitMargin) >= 0 ? 'bg-gradient-to-r from-[#E88DAB] to-emerald-500' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
                      style={{ width: `${Math.min(Math.max(Number(profitMargin), 0), 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Revenue bar chart */}
              {profitData.length > 0 && (
                <div className="card">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Doanh thu theo kỳ</h2>
                  <div className="bar-chart" style={{ height: '200px' }}>
                    {profitData.map((d, idx) => {
                      const heightPct = (d.revenue / maxRevenue) * 100;
                      return (
                        <div key={d.period} className="bar-chart-item group relative">
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                            {formatCurrency(d.revenue)}
                          </div>
                          <div
                            className="bar-chart-bar bg-gradient-to-t from-[#E88DAB] to-[#D97D9E] group-hover:from-[#D97D9E] group-hover:to-[#E88DAB]"
                            style={{ height: `${heightPct}%` }}
                          />
                          <span className="bar-chart-label">{d.period}</span>
                        </div>
                      );
                    })}
                  </div>
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
                        <th className="text-right">Doanh thu</th>
                        <th className="text-right">Chi phí</th>
                        <th className="text-right">Lợi nhuận</th>
                        <th className="text-right">Tỉ suất</th>
                        <th className="text-right">Đơn hàng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitData.map((d) => {
                        const margin =
                          d.revenue > 0 ? ((d.profit / d.revenue) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={d.period} className="group">
                            <td className="font-medium">{d.period}</td>
                            <td className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(d.revenue / maxRevenue) * 100}%` }}
                                  />
                                </div>
                                <span className="w-28 text-right tabular-nums">
                                  {formatCurrency(d.revenue)}
                                </span>
                              </div>
                            </td>
                            <td className="text-right text-gray-600 tabular-nums">
                              {formatCurrency(d.cost)}
                            </td>
                            <td
                              className={`text-right font-semibold tabular-nums ${d.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                            >
                              <span className="mr-1">{d.profit >= 0 ? '↑' : '↓'}</span>
                              {formatCurrency(d.profit)}
                            </td>
                            <td
                              className={`text-right tabular-nums ${Number(margin) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                            >
                              {margin}%
                            </td>
                            <td className="text-right text-gray-600 tabular-nums">
                              {d.orderCount}
                            </td>
                          </tr>
                        );
                      })}
                      {profitData.length > 0 && (
                        <tr className="bg-gray-50 font-semibold">
                          <td className="text-gray-800">Total</td>
                          <td className="text-right text-emerald-700 tabular-nums">
                            {formatCurrency(totalRevenue)}
                          </td>
                          <td className="text-right tabular-nums">{formatCurrency(totalCost)}</td>
                          <td
                            className={`text-right tabular-nums ${totalProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                          >
                            {formatCurrency(totalProfit)}
                          </td>
                          <td
                            className={`text-right tabular-nums ${Number(profitMargin) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                          >
                            {profitMargin}%
                          </td>
                          <td className="text-right tabular-nums">{totalOrders}</td>
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
                    <p className="font-semibold text-gray-700 mb-1">No revenue data yet</p>
                    <p className="text-sm text-gray-500 max-w-sm">
                      Complete some orders to see revenue reports and financial insights.
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Distribution</h2>
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
                    <p className="text-sm text-gray-400 text-center py-4">No product data yet</p>
                  )}
                </div>
              </div>

              {/* Product table */}
              <div className="lg:col-span-2 card p-0 overflow-hidden">
                <div className="p-6 pb-2">
                  <h2 className="text-lg font-semibold text-gray-900">Top Selling Products</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Ranked by total units sold</p>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th>Product</th>
                        <th className="text-right">Units Sold</th>
                        <th className="text-right">Revenue</th>
                        <th className="text-right">% of Total</th>
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
                            <td className="text-right font-semibold tabular-nums">
                              {p.totalSold.toLocaleString()}
                            </td>
                            <td className="text-right font-medium text-[#D97D9E] tabular-nums">
                              {formatCurrency(p.totalRevenue)}
                            </td>
                            <td className="text-right text-gray-500 tabular-nums">{pct}%</td>
                          </tr>
                        );
                      })}
                      {topProducts.length === 0 && (
                        <tr>
                          <td colSpan={5}>
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                              <div className="empty-state-icon">🏆</div>
                              <p className="font-semibold text-gray-700 mb-1">No product data</p>
                              <p className="text-sm text-gray-500 max-w-sm">
                                Sell products to see top-selling rankings.
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
                  Customer Spend Distribution
                </h2>
                <div className="space-y-3">
                  {topCustomers.slice(0, 8).map((c, idx) => (
                    <div key={c.customerId} className="group">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 truncate flex-1">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-pink-300 to-pink-400 text-white text-[10px] font-bold mr-2">
                            {c.customerName.charAt(0)}
                          </span>
                          {c.customerName}
                        </span>
                        <span className="text-gray-500 tabular-nums ml-2">
                          {c.totalOrders} orders
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill bg-gradient-to-r from-[#E88DAB] to-[#D97D9E]"
                          style={{ width: `${(c.totalSpent / maxCustomerSpent) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {topCustomers.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No customer data yet</p>
                  )}
                </div>
              </div>

              {/* Customer table */}
              <div className="lg:col-span-2 card p-0 overflow-hidden">
                <div className="p-6 pb-2">
                  <h2 className="text-lg font-semibold text-gray-900">Top Customers</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Ranked by total order count</p>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th>Khách hàng</th>
                        <th className="text-right">Đơn hàng</th>
                        <th className="text-right">Tổng chi</th>
                        <th className="text-right">Avg. Order Value</th>
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
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-300 to-pink-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                  {c.customerName.charAt(0)}
                                </div>
                                {c.customerName}
                              </div>
                            </td>
                            <td className="text-right font-semibold tabular-nums">
                              {c.totalOrders}
                            </td>
                            <td className="text-right font-medium text-[#D97D9E] tabular-nums">
                              {formatCurrency(c.totalSpent)}
                            </td>
                            <td className="text-right text-gray-600 tabular-nums">
                              {formatCurrency(avgOrder)}
                            </td>
                          </tr>
                        );
                      })}
                      {topCustomers.length === 0 && (
                        <tr>
                          <td colSpan={5}>
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                              <FlaticonIcon name="users-alt" size="xl" className="empty-state-icon" />
                              <p className="font-semibold text-gray-700 mb-1">No customer data</p>
                              <p className="text-sm text-gray-500 max-w-sm">
                                Complete orders to see customer rankings.
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
