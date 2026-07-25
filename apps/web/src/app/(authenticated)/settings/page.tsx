'use client';

import { useAuth } from '@/lib/auth-context';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { copyToClipboard } from '@/lib/clipboard';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  return (
    <div className="page-enter">
      <Toast toast={toast} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Cài đặt</h1>
        <p className="text-gray-500 mt-1 text-sm">Cấu hình hệ thống và hồ sơ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card text-center">
            <div className="relative inline-block">
              <div className="w-16 h-16 bg-gradient-to-br from-[#E88DAB] to-[#D97D9E] rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg mx-auto">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mt-4">{user?.name || 'User'}</h2>
            <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
            <div className="mt-2">
              <span className={`badge-${user?.role === 'Admin' ? 'pink' : 'blue'}`}>
                {user?.role || '—'}
              </span>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 space-y-2 text-left">
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
                  <span className="text-xs font-semibold text-[#D97D9E]">Admin</span>
                  <span className="badge-pink text-[10px]">Toàn quyền</span>
                </div>
                <p className="text-xs text-[#E88DAB] font-mono">admin@handmadeshop.com</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-xs text-[#D97D9E] font-mono">admin123</p>
                  <button
                    onClick={() => copyToClipboard('admin@handmadeshop.com / admin123')}
                    className="copy-btn"
                    title="Copy credentials"
                  >
                    📋
                  </button>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-blue-700">Nhân viên</span>
                  <span className="badge-blue text-[10px]">Hạn chế</span>
                </div>
                <p className="text-xs text-blue-600 font-mono">staff@handmadeshop.com</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-xs text-blue-500 font-mono">staff123</p>
                  <button
                    onClick={() => copyToClipboard('staff@handmadeshop.com / staff123')}
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
                <p className="font-medium">Handmade Shop Management System</p>
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
                  color: 'text-[#D97D9E]',
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
