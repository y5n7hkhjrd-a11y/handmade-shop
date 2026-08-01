'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import FlaticonIcon from '@/components/FlaticonIcon';

const FEATURES = [
  {
    icon: 'clipboard',
    title: 'Quản lý đơn hàng',
    desc: 'Theo dõi toàn bộ quy trình từ nhập đơn đến hoàn thành',
  },
  {
    icon: 'warehouse-alt',
    title: 'Kho hàng thông minh',
    desc: 'Nhập – xuất – tồn kho, tự động cập nhật theo đơn',
  },
  {
    icon: 'stats',
    title: 'Báo cáo lợi nhuận',
    desc: 'Chi phí, doanh thu và lợi nhuận rõ ràng từng đơn',
  },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  if (isAuthenticated) {
    router.replace('/dashboard');
    return null;
  }

  function validate(): boolean {
    const errors: { username?: string; password?: string } = {};
    if (!username.trim()) errors.username = 'Vui lòng nhập tên đăng nhập';
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
      await login(username, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#FAFAFA] flex items-center justify-center py-8 px-4">
      {/* Decorative background */}
      <div className="absolute -top-32 -right-32 w-[480px] h-[480px] bg-gradient-to-br from-pink-200/40 via-purple-200/30 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-32 w-[520px] h-[520px] bg-gradient-to-tr from-purple-200/40 via-pink-200/30 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-white/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-4xl animate-[slideUp_0.4s_ease-out]">
        <div className="grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-2xl shadow-[0_20px_60px_-20px_rgba(232,141,171,0.4)] border border-pink-100/70 bg-white">
          {/* ─── Left brand panel ─── */}
          <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden bg-gradient-to-br from-[#E88DAB] via-[#D97D9E] to-purple-500 text-white">
            {/* Decorative circles */}
            <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute top-1/3 -left-20 w-40 h-40 bg-white/10 rounded-full blur-xl" />
            <div className="absolute -bottom-20 left-1/3 w-64 h-64 bg-purple-900/20 rounded-full blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '22px 22px',
              }}
            />

            <div className="relative">
              <img
                src="/logo.svg"
                alt="Linus"
                className="w-full max-w-[280px] h-auto object-contain drop-shadow-lg"
              />
              <p className="mt-3 text-xs text-white/70 font-medium tracking-wide">
                Hệ thống quản lý handmade
              </p>
            </div>

            <div className="relative space-y-5 my-10">
              <h2 className="text-2xl font-bold leading-snug">
                Quản lý cửa hàng handmade <br />
                <span className="text-white/80">từ A đến Z, chỉ trong một nơi</span>
              </h2>
              <div className="space-y-4">
                {FEATURES.map((f, i) => (
                  <div
                    key={f.title}
                    className="flex items-start gap-3.5 p-3 rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 transition-all duration-300 hover:bg-white/15 hover:translate-x-1"
                    style={{ animation: `slideUp 0.4s ease-out ${0.15 + i * 0.1}s backwards` }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <FlaticonIcon name={f.icon} size="sm" className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{f.title}</p>
                      <p className="text-xs text-white/70 mt-0.5 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex items-center gap-2 text-xs text-white/60">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
              Sẵn sàng đồng hành cùng công việc kinh doanh của bạn
            </div>
          </div>

          {/* ─── Right form panel ─── */}
          <div className="p-6 sm:p-10 flex flex-col justify-center">
            {/* Mobile brand header */}
            <div className="lg:hidden text-center mb-6">
              <img
                src="/logo.svg"
                alt="Linus"
                className="w-full max-w-[220px] h-auto object-contain mx-auto mb-3"
              />
              <h1 className="text-xl font-bold text-[#1A1A2E]">Chào mừng trở lại</h1>
              <p className="text-sm text-gray-400 mt-1">Đăng nhập vào hệ thống quản lý</p>
            </div>

            {/* Desktop heading */}
            <div className="hidden lg:block mb-8">
              <h1 className="text-2xl font-bold text-[#1A1A2E]">Chào mừng trở lại 👋</h1>
              <p className="text-sm text-gray-400 mt-1.5">
                Đăng nhập để tiếp tục quản lý cửa hàng của bạn
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5 flex items-center gap-2.5 animate-[slideDown_0.2s_ease-out]">
                <span className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <FlaticonIcon name="triangle-warning" size="xs" className="text-red-500" />
                </span>
                <span className="flex-1">{error}</span>
                <button
                  onClick={() => setError('')}
                  className="hover:opacity-70 transition-opacity text-red-400"
                  aria-label="Đóng thông báo"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Tên đăng nhập
                </label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 group-focus-within:text-pink-500 pointer-events-none">
                    <FlaticonIcon name="user" size="sm" />
                  </span>
                  <input
                    ref={usernameRef}
                    id="username"
                    type="text"
                    autoComplete="username"
                    className={`w-full bg-white border text-sm placeholder:text-gray-300 transition-all duration-150 pl-10 pr-4 py-2.5 rounded-xl ${
                      fieldErrors.username
                        ? 'border-red-300 focus:border-red-400 focus:shadow-[0_0_0_3px_#fef2f2]'
                        : 'border-[#E8E0E4] focus:border-pink-400 focus:shadow-[0_0_0_3px_rgba(232,141,171,0.15)]'
                    } focus:outline-none`}
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, username: undefined }));
                    }}
                    placeholder="admin"
                    required
                  />
                </div>
                {fieldErrors.username && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 animate-[slideDown_0.15s_ease-out]">
                    <FlaticonIcon name="circle-xmark" size="xs" className="text-red-400" />{' '}
                    {fieldErrors.username}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Mật khẩu
                </label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 group-focus-within:text-pink-500 pointer-events-none">
                    <FlaticonIcon name="lock" size="sm" />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`w-full bg-white border text-sm placeholder:text-gray-300 transition-all duration-150 pl-10 pr-11 py-2.5 rounded-xl ${
                      fieldErrors.password
                        ? 'border-red-300 focus:border-red-400 focus:shadow-[0_0_0_3px_#fef2f2]'
                        : 'border-[#E8E0E4] focus:border-pink-400 focus:shadow-[0_0_0_3px_rgba(232,141,171,0.15)]'
                    } focus:outline-none`}
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-pink-500 hover:bg-pink-50 transition-all duration-200"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    tabIndex={-1}
                  >
                    <FlaticonIcon name={showPassword ? 'crossed-eye' : 'eye'} size="sm" />
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 animate-[slideDown_0.15s_ease-out]">
                    <FlaticonIcon name="circle-xmark" size="xs" className="text-red-400" />{' '}
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm relative overflow-hidden group transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 shadow-lg shadow-pink-300/40 hover:shadow-pink-400/50 hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: 'linear-gradient(90deg, #E88DAB, #D97D9E, #A78BFA)' }}
              >
                <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200" />
                {loading ? (
                  <span className="relative flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang đăng nhập...
                  </span>
                ) : (
                  <span className="relative flex items-center justify-center gap-2">
                    Đăng nhập
                    <span className="group-hover:translate-x-1 transition-transform duration-200">
                      <FlaticonIcon name="arrow-right" size="xs" />
                    </span>
                  </span>
                )}
              </button>
            </form>

            <div className="mt-7 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Tài khoản dùng thử:{' '}
                <button
                  type="button"
                  onClick={() => {
                    setUsername('admin');
                    setPassword('admin123');
                  }}
                  className="font-mono text-pink-500 hover:text-pink-600 hover:underline transition-colors cursor-pointer"
                >
                  admin / admin123
                </button>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          © {new Date().getFullYear()} Linus · Hệ thống quản lý nội bộ
        </p>
      </div>
    </div>
  );
}
