'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Handle scroll to hide/show mobile header
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY <= 15) {
            setHeaderVisible(true);
          } else if (currentScrollY > lastScrollY.current + 6) {
            // Scrolling down -> hide header
            setHeaderVisible(false);
          } else if (currentScrollY < lastScrollY.current - 6) {
            // Scrolling up -> show header
            setHeaderVisible(true);
          }
          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile sidebar and restore header when route changes
  useEffect(() => {
    setMobileSidebarOpen(false);
    setHeaderVisible(true);
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
      <div
        className={`lg:hidden relative overflow-hidden flex items-center justify-between px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-gradient-to-r from-white via-pink-50/30 to-avocado-50/30 border-b border-pink-100/60 sticky top-0 z-20 shadow-sm min-h-[3.25rem] transition-transform duration-300 ease-in-out ${
          headerVisible || mobileSidebarOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-avocado-200/20 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-avocado-200/15 rounded-full blur-xl pointer-events-none" />
        <button
          onClick={toggleMobileSidebar}
          className="relative z-10 -ml-1 p-2 rounded-lg text-gray-500 hover:text-pink-600 hover:bg-pink-50 transition-all duration-200 flex-shrink-0"
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
        <Link
          href="/dashboard"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Linus" className="h-7 w-auto max-w-[120px] object-contain" />
        </Link>
        {/* Placeholder spacer on right to keep flex balance */}
        <div className="w-9 h-9 flex-shrink-0" aria-hidden="true" />
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
