'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import FlaticonIcon from '@/components/FlaticonIcon';

const navGroups = [
  {
    label: 'Quản lý',
    items: [
      { href: '/orders', label: 'Đơn hàng', icon: 'clipboard' },
      { href: '/customers', label: 'Khách hàng', icon: 'users-alt' },
      { href: '/products', label: 'Hàng hóa', icon: 'box-open' },
      { href: '/recipes', label: 'Công thức', icon: 'receipt' },
      { href: '/packaging', label: 'Đóng gói', icon: 'gift' },
      { href: '/matching-rules', label: 'Ký tự', icon: 'text' },
    ],
  },
  {
    label: 'Vận hành',
    items: [
      { href: '/inventory', label: 'Kho hàng', icon: 'warehouse-alt' },
      { href: '/shipping', label: 'Vận chuyển', icon: 'truck-side' },
    ],
  },
  {
    label: 'Phân tích',
    items: [
      { href: '/dashboard', label: 'Tổng quan', icon: 'analyse' },
      { href: '/reports', label: 'Báo cáo', icon: 'stats' },
      { href: '/settings', label: 'Cài đặt', icon: 'settings' },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden animate-[fadeIn_0.2s_ease-out]"
          onClick={onMobileToggle}
        />
      )}

      <aside
        className={`
          bg-white flex flex-col transition-all duration-300 ease-in-out

          /* Mobile: fixed overlay */
          fixed inset-y-0 left-0 z-40
          lg:sticky lg:top-0 lg:h-screen lg:min-h-screen
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${collapsed ? 'w-16' : 'w-64'}
        `}
      >
        {/* Decorative gradient line on the right edge */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-avocado-300/40 via-mint-300/20 to-transparent" />

        {/* Logo */}
        <div
          className={`p-4 border-b border-gray-100 flex-shrink-0 ${collapsed ? 'text-center' : ''}`}
        >
          <div className="flex items-center justify-center relative">
            <Link href="/dashboard" className="flex items-center justify-center group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="Linus Logo"
                className="h-16 w-auto max-w-[180px] transition-all duration-300 group-hover:scale-105 object-contain"
              />
            </Link>
            <button
              onClick={onMobileToggle}
              className="lg:hidden btn-ghost absolute right-0 p-1.5 text-gray-400 hover:text-avocado-500 transition-colors"
              aria-label="Đóng menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-16 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 hover:border-avocado-300 z-10 group"
          aria-label={collapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          <span
            className="text-xs text-gray-400 group-hover:text-avocado-500 transition-all duration-300"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            ◀
          </span>
        </button>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-3 overflow-y-auto overflow-x-hidden">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'bg-gradient-to-r from-pink-50 to-mint-50 text-avocado-700 font-semibold shadow-sm'
                          : 'text-gray-500 hover:bg-gradient-to-r hover:from-gray-50 hover:to-pink-50/40 hover:text-avocado-600'
                      }`}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-pink-400 to-mint-500 rounded-full animate-[fadeIn_0.2s_ease-out]" />
                      )}

                      {/* Icon */}
                      <span
                        className={`relative flex-shrink-0 w-5 h-5 flex items-center justify-center transition-all duration-200 ${
                          active ? 'text-avocado-600' : 'text-gray-400 group-hover:scale-110'
                        }`}
                      >
                        <FlaticonIcon name={item.icon} size="sm" />
                        {active && (
                          <span className="absolute inset-0 rounded-full bg-avocado-100/50 animate-[fadeIn_0.2s_ease-out]" />
                        )}
                      </span>

                      {!collapsed && <span className="truncate">{item.label}</span>}

                      {collapsed && (
                        <span className="absolute left-full ml-2 px-2.5 py-1.5 bg-white text-gray-600 text-xs rounded-lg whitespace-nowrap z-50 shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div
          className={`p-3 border-t border-gray-100 flex-shrink-0 bg-gradient-to-t from-gray-50/80 to-transparent ${collapsed ? 'text-center' : ''}`}
        >
          <div className={`flex items-center gap-3 mb-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="relative w-8 h-8 flex-shrink-0">
              <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full shadow-sm" />
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink-400" />
                  {user?.role}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={logout}
            className={`flex items-center gap-2 text-xs font-medium rounded-lg transition-all duration-200 ${
              collapsed
                ? 'w-full justify-center p-2 text-gray-400 hover:text-red-500 hover:bg-red-50'
                : 'w-full px-3 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50/80'
            }`}
            title="Đăng xuất"
          >
            <FlaticonIcon name="up-from-bracket" size="sm" className="text-gray-400" />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
