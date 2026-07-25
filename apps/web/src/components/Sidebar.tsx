'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  { href: '/dashboard', label: 'Tổng quan', icon: '📊' },
  { href: '/orders', label: 'Đơn hàng', icon: '🛒' },
  { href: '/customers', label: 'Khách hàng', icon: '👥' },
  { href: '/products', label: 'Hàng hóa', icon: '📦' },
  { href: '/recipes', label: 'Công thức', icon: '📋' },
  { href: '/packaging', label: 'Đóng gói', icon: '🎁' },
  { href: '/cost-rules', label: 'Định giá', icon: '💰' },
  { href: '/matching-rules', label: 'Ký tự', icon: '🔤' },
  { href: '/inventory', label: 'Kho hàng', icon: '📦' },
  { href: '/shipping', label: 'Vận chuyển', icon: '🚚' },
  { href: '/reports', label: 'Báo cáo', icon: '📈' },
  { href: '/settings', label: 'Cài đặt', icon: '⚙️' },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden animate-[fadeIn_0.15s_ease-out]"
          onClick={onMobileToggle}
        />
      )}

      <aside
        className={`
          bg-white border-r border-[#F0ECEE] flex flex-col transition-all duration-300 ease-in-out

          /* Mobile: fixed overlay */
          fixed inset-y-0 left-0 z-40
          lg:sticky lg:top-0 lg:h-screen lg:min-h-screen
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${collapsed ? 'w-16' : 'w-64'}
        `}
      >
        {/* Logo */}
        <div
          className={`p-4 border-b border-[#F0ECEE] flex-shrink-0 ${collapsed ? 'text-center' : ''}`}
        >
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 group flex-1 min-w-0">
              <span className="text-2xl transition-transform duration-300 group-hover:scale-110 flex-shrink-0">
                💎
              </span>
              {!collapsed && (
                <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent whitespace-nowrap truncate">
                  Handmade
                </span>
              )}
            </Link>
            <button
              onClick={onMobileToggle}
              className="lg:hidden btn-ghost -mr-2 p-1.5 text-[#B8B0B4] hover:text-[#E88DAB]"
              aria-label="Đóng menu"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-white border border-[#F0ECEE] rounded-full items-center justify-center shadow-sm hover:shadow transition-all duration-200 hover:border-[#F0C8D4] z-10"
          aria-label={collapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          <span
            className="text-xs text-[#C8C0C4] transition-transform duration-300"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            ◀
          </span>
        </button>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-50 text-purple-700 font-semibold shadow-sm'
                    : 'text-gray-600 hover:bg-purple-50/50 hover:text-purple-600'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-purple-500 rounded-full" />
                )}

                <span
                  className={`text-base flex-shrink-0 ${isActive ? '' : 'group-hover:scale-110'} transition-transform duration-200`}
                >
                  {item.icon}
                </span>

                {!collapsed && <span className="truncate">{item.label}</span>}

                {collapsed && (
                  <span className="absolute left-full ml-2 px-2.5 py-1.5 bg-white text-[#8E8EA0] text-xs rounded-lg whitespace-nowrap z-50 shadow-lg border border-[#F0ECEE] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div
          className={`p-3 border-t border-[#F0ECEE] flex-shrink-0 ${collapsed ? 'text-center' : ''}`}
        >
          <div className={`flex items-center gap-3 mb-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="relative w-8 h-8 flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#86D492] border-2 border-white rounded-full" />
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1A1A2E] truncate">{user?.name}</p>
                <p className="text-xs text-[#8E8EA0] font-medium">
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 bg-purple-500" />
                  {user?.role}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={logout}
            className={`btn btn-sm w-full text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 ${collapsed ? 'px-0 justify-center' : ''}`}
            title="Đăng xuất"
          >
            {collapsed ? '🚪' : 'Đăng xuất'}
          </button>
        </div>
      </aside>
    </>
  );
}
