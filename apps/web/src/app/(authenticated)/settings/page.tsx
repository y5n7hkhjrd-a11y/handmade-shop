'use client';

import { useAuth } from '@/lib/auth-context';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import FlaticonIcon from '@/components/FlaticonIcon';
import { copyToClipboard } from '@/lib/clipboard';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

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
        <div className="relative px-4 py-3 sm:px-6 sm:py-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-400 via-pink-500 to-mint-500 flex items-center justify-center text-white shadow-md ring-1 ring-white/60">
                    <FlaticonIcon name="settings" size="lg" />
                  </div>
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-pink-300/30 to-mint-300/30 blur-sm -z-10" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                      Cài đặt
                    </h1>
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">Cấu hình hệ thống và hồ sơ</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-pink-200/80 to-transparent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card text-center">
            <div className="relative inline-block">
              <div className="w-16 h-16 bg-gradient-to-br from-[#7FA345] to-[#66863A] rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg mx-auto">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mt-4">{user?.name || 'User'}</h2>
            <div className="mt-2.5 flex items-center justify-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-mint-50 to-avocado-50 border border-avocado-200/70 text-[#66863A] font-semibold text-sm shadow-sm">
                <FlaticonIcon name="user" size="xs" />@{user?.username || user?.email || '—'}
              </span>
              {user?.username && (
                <button
                  onClick={() => copyToClipboard(user.username!)}
                  className="copy-btn"
                  title="Copy username"
                >
                  📋
                </button>
              )}
            </div>
            <div className="mt-2.5">
              <span className={`badge-${user?.role === 'Admin' ? 'pink' : 'blue'}`}>
                {user?.role || '—'}
              </span>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 space-y-2 text-left">
              <div className="detail-row">
                <span className="detail-label">Tên đăng nhập</span>
                <div className="flex items-center gap-1">
                  <span className="detail-value text-xs font-mono">{user?.username || '—'}</span>
                  {user?.username && (
                    <button
                      onClick={() => copyToClipboard(user.username!)}
                      className="copy-btn"
                      title="Copy username"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">User ID</span>
                <div className="flex items-center gap-1">
                  <span className="detail-value text-xs font-mono">
                    {user?.id?.slice(0, 12)}...
                  </span>
                  {user?.id && (
                    <button
                      onClick={() => copyToClipboard(user.id)}
                      className="copy-btn"
                      title="Copy user ID"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">Role</span>
                <span className="detail-value">{user?.role}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Member since</span>
                <span className="detail-value text-xs">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Demo Credentials */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-base">🔑</span> Tài khoản dùng thử
            </h2>
            <div className="space-y-2">
              <div className="p-3 bg-[#FCE7F3] rounded-lg border border-[#F9D6E5]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#66863A]">Admin</span>
                  <span className="badge-pink text-[10px]">Toàn quyền</span>
                </div>
                <p className="text-xs text-[#7FA345] font-mono">admin</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-xs text-[#66863A] font-mono">admin123</p>
                  <button
                    onClick={() => copyToClipboard('admin / admin123')}
                    className="copy-btn"
                    title="Copy credentials"
                  >
                    📋
                  </button>
                </div>
              </div>
              <div className="p-3 bg-mint-50 rounded-lg border border-mint-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-mint-700">Nhân viên</span>
                  <span className="badge-blue text-[10px]">Hạn chế</span>
                </div>
                <p className="text-xs text-mint-600 font-mono">staff</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-xs text-mint-500 font-mono">staff123</p>
                  <button
                    onClick={() => copyToClipboard('staff / staff123')}
                    className="copy-btn"
                    title="Copy credentials"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-lg">🖥️</span> Thông tin hệ thống
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📱</span>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    Ứng dụng
                  </p>
                </div>
                <p className="font-medium">Linus</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🔖</span>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    Phiên bản
                  </p>
                </div>
                <p className="font-medium">1.0.0</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🗄️</span>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    Cơ sở dữ liệu
                  </p>
                </div>
                <p className="font-medium">PostgreSQL 16</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">⚡</span>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    API
                  </p>
                </div>
                <p className="font-medium">Express • Port 4000</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                Công nghệ
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Next.js', color: 'badge-pink' },
                  { name: 'Express', color: 'badge-green' },
                  { name: 'TypeScript', color: 'badge-blue' },
                  { name: 'Prisma', color: 'badge-pink' },
                  { name: 'PostgreSQL', color: 'badge-blue' },
                  { name: 'Tailwind CSS', color: 'badge-green' },
                  { name: 'pnpm', color: 'badge-yellow' },
                  { name: 'Zod', color: 'badge-pink' },
                  { name: 'React', color: 'badge-blue' },
                  { name: 'Docker', color: 'badge-blue' },
                ].map((tech) => (
                  <span key={tech.name} className={tech.color}>
                    {tech.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* API Endpoints */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-lg">🔌</span> Danh sách API
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  method: 'POST',
                  path: '/api/auth/login',
                  desc: 'Đăng nhập',
                  color: 'text-[#66863A]',
                },
                {
                  method: 'GET',
                  path: '/api/dashboard/stats',
                  desc: 'Dashboard stats',
                  color: 'text-emerald-600',
                },
                {
                  method: 'GET',
                  path: '/api/customers',
                  desc: 'List customers',
                  color: 'text-emerald-600',
                },
                {
                  method: 'GET',
                  path: '/api/products',
                  desc: 'List products',
                  color: 'text-emerald-600',
                },
                {
                  method: 'GET',
                  path: '/api/orders',
                  desc: 'List orders',
                  color: 'text-emerald-600',
                },
                {
                  method: 'GET',
                  path: '/api/inventory',
                  desc: 'Inventory transactions',
                  color: 'text-emerald-600',
                },
                {
                  method: 'GET',
                  path: '/api/recipes',
                  desc: 'List recipes',
                  color: 'text-emerald-600',
                },
                {
                  method: 'GET',
                  path: '/api/packaging',
                  desc: 'Packaging templates',
                  color: 'text-emerald-600',
                },
                {
                  method: 'GET',
                  path: '/api/shipping',
                  desc: 'List shipments',
                  color: 'text-emerald-600',
                },
                {
                  method: 'GET',
                  path: '/api/reports/profit',
                  desc: 'Profit report',
                  color: 'text-emerald-600',
                },
                {
                  method: 'GET',
                  path: '/api/reports/top-products',
                  desc: 'Top products',
                  color: 'text-emerald-600',
                },
                {
                  method: 'GET',
                  path: '/api/reports/top-customers',
                  desc: 'Top customers',
                  color: 'text-emerald-600',
                },
              ].map((ep) => (
                <div
                  key={ep.path}
                  className="p-3 bg-gray-50 rounded-lg text-sm border border-gray-200/50 hover:border-[#F9D6E5] transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-mono font-bold text-xs ${ep.color}`}>{ep.method}</span>
                    <span className="text-gray-600 font-mono text-[11px] truncate">{ep.path}</span>
                    <button
                      onClick={() => copyToClipboard(ep.path)}
                      className="copy-btn ml-auto opacity-0 group-hover:opacity-100"
                      title="Copy path"
                    >
                      📋
                    </button>
                  </div>
                  <p className="text-gray-400 text-xs">{ep.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
