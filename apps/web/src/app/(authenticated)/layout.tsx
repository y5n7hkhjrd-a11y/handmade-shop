'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Close mobile sidebar when route changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#7FA345] border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile header bar */}
      <div className="lg:hidden relative overflow-hidden flex items-center gap-2.5 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-gradient-to-r from-white via-pink-50/30 to-avocado-50/30 border-b border-pink-100/60 sticky top-0 z-20 shadow-sm">
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-avocado-200/20 rounded-full blur-xl" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-avocado-200/15 rounded-full blur-xl" />
        <button
          onClick={toggleMobileSidebar}
          className="relative z-10 -ml-1 p-2 rounded-lg text-gray-500 hover:text-pink-600 hover:bg-pink-50 transition-all duration-200"
          aria-label={mobileSidebarOpen ? 'Đóng menu' : 'Mở menu'}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {mobileSidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        <Link href="/dashboard" className="relative z-10 flex-1 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Linus" className="h-8 w-auto max-w-[130px] object-contain" />
        </Link>
        {/* Bottom gradient line */}
        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-pink-300/30 to-transparent" />
      </div>

      <Sidebar mobileOpen={mobileSidebarOpen} onMobileToggle={toggleMobileSidebar} />
      <main className="flex-1 min-w-0 px-4 py-3 lg:p-6">
        <div key={pathname} className="page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
