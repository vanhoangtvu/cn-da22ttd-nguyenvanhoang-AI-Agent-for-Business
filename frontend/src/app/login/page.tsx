'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { Mail, Lock, CheckCircle, ArrowRight, Sparkles, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.login({
        username: formData.username,
        password: formData.password,
      });

      console.log('Login successful, role:', response.role);

      if (response.role === 'ADMIN' || response.role === 'BUSINESS') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/30 rounded-full blur-[100px] animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] bg-purple-400/30 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-indigo-400/30 rounded-full blur-[100px] animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-5xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden flex z-10 animate-fade-in border border-white/20 dark:border-gray-700/30">
        {/* Left Side - Branding (Hidden on mobile) */}
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 relative flex-col justify-between p-12 text-white">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2629&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-400/30 rounded-full blur-3xl"></div>
            <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-indigo-400/30 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10">
            <Link href="/" className="flex items-center gap-2 text-white/90 hover:text-white transition-colors w-fit">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">BizAI Agent</span>
            </Link>
          </div>

          <div className="relative z-10 space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              Kinh doanh thông minh hơn với AI
            </h2>
            <p className="text-blue-100 text-lg leading-relaxed">
              Tối ưu hóa quy trình, tăng cường tương tác khách hàng và đẩy mạnh doanh số với nền tảng quản trị thông minh.
            </p>

            <div className="space-y-4 pt-4">
              {[
                'Phân tích dữ liệu thời gian thực',
                'Trợ lý ảo AI hỗ trợ 24/7',
                'Quản lý đơn hàng tự động'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-blue-50 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 text-sm text-blue-200">
            © 2024 AI Agent for Business. All rights reserved.
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white/50 dark:bg-transparent">
          <div className="max-w-md mx-auto w-full space-y-8 animate-slide-up">
            <div className="text-center lg:text-left space-y-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chào mừng trở lại!</h1>
              <p className="text-gray-500 dark:text-gray-400">
                Nhập thông tin đăng nhập của bạn để tiếp tục
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-slide-in-right">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-lg">!</span>
                </div>
                <span className="font-medium text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                    Tên đăng nhập / Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      placeholder="business@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Mật khẩu
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center ml-1">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                  Ghi nhớ đăng nhập
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-blue-500/30 transform hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Đăng nhập
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-gray-800/50 text-gray-500 backdrop-blur-sm rounded-full">
                  Hoặc
                </span>
              </div>
            </div>

            <div className="text-center space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Chưa có tài khoản?{' '}
                <Link href="/register" className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline">
                  Đăng ký miễn phí
                </Link>
              </p>

              <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
                Quay lại trang chủ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
