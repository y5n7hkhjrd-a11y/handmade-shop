'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  if (isAuthenticated) {
    router.replace('/dashboard');
    return null;
  }

  function validate(): boolean {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = 'Vui lòng nhập email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Email không đúng định dạng';
    if (!password) errors.password = 'Vui lòng nhập mật khẩu';
    else if (password.length < 6) errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);

    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] relative">
      <div className="max-w-md w-full mx-4 relative animate-[fadeInUp_0.4s_ease-out]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#E88DAB] shadow-sm mb-4">
            <span className="text-3xl">💎</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Handmade Shop</h1>
          <p className="text-gray-500 mt-1.5 text-sm">Đăng nhập vào hệ thống quản lý</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#F0ECEE] p-8">
          <h2 className="text-lg font-semibold text-[#1A1A2E] mb-1">Chào mừng trở lại</h2>
          <p className="text-sm text-[#8E8EA0] mb-6">Vui lòng đăng nhập để tiếp tục</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4 flex items-center gap-2 animate-[slideDown_0.2s_ease-out]">
              <span>❌</span>
              <span className="flex-1">{error}</span>
              <button
                onClick={() => setError('')}
                className="hover:opacity-70 transition-opacity"
                aria-label="Đóng thông báo"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="label">
                Địa chỉ email
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                  📧
                </span>
                <input
                  ref={emailRef}
                  id="email"
                  type="email"
                  className={`input pl-9 ${fieldErrors.email ? 'input-error' : ''}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="admin@handmadeshop.com"
                  autoComplete="email"
                  required
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600 animate-[slideDown_0.15s_ease-out]">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">
                Mật khẩu
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                  🔒
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`input pl-9 pr-10 ${fieldErrors.password ? 'input-error' : ''}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600 animate-[slideDown_0.15s_ease-out]">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 relative overflow-hidden group"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang đăng nhập...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Đăng nhập
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Tài khoản dùng thử:{' '}
              <span className="font-mono text-gray-600">admin@handmadeshop.com</span> /{' '}
              <span className="font-mono text-gray-600">admin123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
