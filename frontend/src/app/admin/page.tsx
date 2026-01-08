'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient, ActivityLogDTO } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import { Sparkles, Zap } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userData, setUserData] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityLogDTO[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = apiClient.getUserData();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'BUSINESS')) {
      router.push('/');
      return;
    }

    setUserData(user);
    loadStats(user.role);
  }, [router]);

  // Separate effect for clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const loadStats = async (role: string) => {
    try {
      setLoading(true);
      console.log('[Dashboard] Loading stats for role:', role);
      console.log('[Dashboard] Token available:', apiClient.getAuthToken() ? 'yes' : 'no');
      
      // Get fresh user data
      const currentUser = apiClient.getUserData();
      console.log('[Dashboard] Current user:', currentUser);

      // Load stats based on role
      if (role === 'ADMIN') {
        console.log('[Dashboard] Calling getAdminStats()...');
        const data = await apiClient.getAdminStats();
        console.log('[Dashboard] Admin stats received:', data);
        setStats(data);
      } else if (role === 'BUSINESS') {
        console.log('[Dashboard] Calling getBusinessStats()...');
        const data = await apiClient.getBusinessStats();
        console.log('[Dashboard] Business stats received:', data);
        setStats(data);
      } else {
        console.error('[Dashboard] Invalid role:', role);
        throw new Error('Invalid user role');
      }

      // Load recent activities
      try {
        const activities = role === 'ADMIN'
          ? await apiClient.getRecentActivities(10)
          : await apiClient.getRecentActivitiesForBusiness(10);
        console.log('Recent activities received:', activities);
        setRecentActivities(activities);
      } catch (activityError) {
        console.error('Failed to load activities:', activityError);
        // Don't fail the whole dashboard if activities fail to load
        setRecentActivities([]);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      alert('Không thể tải dữ liệu dashboard: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (loading || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-900 border-t-indigo-500 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse"></div>
          </div>
          <p className="text-slate-400 animate-pulse">Đang tải dữ liệu...</p>
          <div className="mt-6 flex gap-2 justify-center">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout userData={userData} currentPage="overview">
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="relative group mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/30 via-fuchsia-600/30 to-purple-600/30 rounded-2xl blur-2xl"></div>
          <div className="relative bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 rounded-2xl shadow-2xl p-8 text-white overflow-hidden border border-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8b5cf620_1px,transparent_1px),linear-gradient(to_bottom,#8b5cf620_1px,transparent_1px)] bg-[size:32px_32px]"></div>
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-6">
                {/* Left Content */}
                <div className="flex-1">
                  <h2 className="text-4xl font-bold mb-3">
                    Chào mừng, {userData.username}! 👋
                  </h2>
                  <p className="text-white/90 text-lg font-light mb-6">
                    {userData.role === 'ADMIN'
                      ? 'Bạn có toàn quyền quản trị hệ thống. Quản lý sản phẩm, đơn hàng, người dùng và theo dõi doanh thu.'
                      : 'Quản lý cửa hàng của bạn hiệu quả với các công cụ dành cho chủ doanh nghiệp.'}
                  </p>
                  
                  {/* Status & Info Row */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                      <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Hệ thống hoạt động tốt</span>
                    </div>
                    
                    <div className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-sm font-medium">Role: {userData.role}</span>
                    </div>
                    
                    <button
                      onClick={() => loadStats(userData.role)}
                      className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all duration-200 border border-white/20 hover:border-white/40"
                      title="Làm mới dữ liệu"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-sm font-medium">Làm mới</span>
                    </button>
                  </div>
                  
                  {/* Tech Stack Info */}
                  <div className="mt-6">
                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">Powering Next-Gen Business</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { name: 'Next.js 16', icon: <svg viewBox="0 0 180 180" fill="none" className="w-full h-full text-white"><mask id="mask0_408_134" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="180" height="180"><circle cx="90" cy="90" r="90" fill="black" /></mask><g mask="url(#mask0_408_134)"><circle cx="90" cy="90" r="90" fill="black" /><path d="M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z" fill="white" /><path d="M115 54H127V125.97H115V54Z" fill="white" /></g></svg> },
                        { name: 'Spring Boot', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg' },
                        { name: 'Python AI', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' },
                        { name: 'MySQL', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg' },
                        { name: 'Redis', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg' },
                        { name: 'Docker', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg' },
                        { name: 'LLM Engine', icon: <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg shadow-purple-500/20"><Sparkles className="w-5 h-5 text-white" /></div> },
                        { name: 'RAG+CHRM', icon: <div className="p-1.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-lg shadow-orange-500/20"><Zap className="w-5 h-5 text-white" /></div> },
                      ].map((tech, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] transition-all cursor-default group hover:scale-105 hover:border-white/10">
                          {tech.logo ? (
                            <div className="w-8 h-8 flex items-center justify-center transition-transform group-hover:scale-110">
                              <img src={tech.logo} alt={tech.name} className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 flex items-center justify-center transition-transform group-hover:scale-110">
                              {tech.icon}
                            </div>
                          )}
                          <span className="text-slate-300 font-medium text-sm group-hover:text-white transition-colors">{tech.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Content - Clock */}
                <div className="hidden lg:flex flex-col items-center justify-center -ml-8">
                  <div className="text-center">
                    <div className="text-5xl font-bold mb-2 tabular-nums">
                      {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-lg opacity-75 mb-3 tabular-nums">
                      {currentTime.toLocaleTimeString('vi-VN', { second: '2-digit' }).split(':').pop()}s
                    </div>
                    <div className="text-sm opacity-70">
                      {currentTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                    <div className="mt-2 text-sm text-white/70">
                      {currentTime.toLocaleDateString('vi-VN', { weekday: 'long' })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Products Card */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-blue-500/20 hover:shadow-2xl hover:border-blue-500/40 transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">Tổng sản phẩm</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {stats?.totalProducts || 0}
                </p>
                <div className="flex items-center mt-2">
                  {stats?.productGrowthPercent !== undefined && (
                    <>
                      <span className={`text-sm font-semibold ${
                        stats.productGrowthPercent >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {stats.productGrowthPercent >= 0 ? '+' : ''}{stats.productGrowthPercent.toFixed(1)}%
                      </span>
                      <span className="text-gray-500 text-xs ml-2">vs tháng trước</span>
                    </>
                  )}
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            </div>
          </div>

          {/* Orders Card */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 to-green-500/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-emerald-500/20 hover:shadow-2xl hover:border-emerald-500/40 transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">Tổng đơn hàng</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  {stats?.totalOrders || 0}
                </p>
                <div className="flex items-center mt-2">
                  {stats?.orderGrowthPercent !== undefined && (
                    <>
                      <span className={`text-sm font-semibold ${
                        stats.orderGrowthPercent >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {stats.orderGrowthPercent >= 0 ? '+' : ''}{stats.orderGrowthPercent.toFixed(1)}%
                      </span>
                      <span className="text-gray-500 text-xs ml-2">vs tháng trước</span>
                    </>
                  )}
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            </div>
          </div>

          {/* Revenue Card */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-purple-500/20 hover:shadow-2xl hover:border-purple-500/40 transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">Tổng doanh thu</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats?.totalRevenue || 0)}
                </p>
                <div className="flex items-center mt-2">
                  {stats?.revenueGrowthPercent !== undefined && (
                    <>
                      <span className={`text-sm font-semibold ${
                        stats.revenueGrowthPercent >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {stats.revenueGrowthPercent >= 0 ? '+' : ''}{stats.revenueGrowthPercent.toFixed(1)}%
                      </span>
                      <span className="text-gray-500 text-xs ml-2">vs tháng trước</span>
                    </>
                  )}
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            </div>
          </div>

          {/* Users/Categories Card */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 to-orange-500/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-amber-500/20 hover:shadow-xl hover:border-amber-500/40 transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">
                  {userData.role === 'ADMIN' ? 'Tổng người dùng' : 'Danh mục'}
                </p>
                <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  {userData.role === 'ADMIN' ? (stats?.totalUsers || 0) : (stats?.totalCategories || 0)}
                </p>
                <div className="flex items-center mt-2">
                  {userData.role === 'ADMIN' && stats?.userGrowthPercent !== undefined && (
                    <>
                      <span className={`text-sm font-semibold ${
                        stats.userGrowthPercent >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {stats.userGrowthPercent >= 0 ? '+' : ''}{stats.userGrowthPercent.toFixed(1)}%
                      </span>
                      <span className="text-gray-500 text-xs ml-2">vs tháng trước</span>
                    </>
                  )}
                  {userData.role !== 'ADMIN' && (
                    <span className="text-slate-500 text-xs">Tổng danh mục hệ thống</span>
                  )}
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-2xl blur-xl"></div>
              <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-purple-500/20">
              <h3 className="text-xl font-bold text-slate-200 mb-6 flex items-center">
                <svg className="w-6 h-6 mr-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Thao tác nhanh
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Link
                  href="/admin/products"
                  className="group p-4 bg-gradient-to-br from-blue-900/50 to-blue-800/50 rounded-xl hover:shadow-lg hover:from-blue-800/60 hover:to-blue-700/60 transition-all duration-300 text-center transform hover:-translate-y-1 border border-blue-500/20"
                >
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-blue-300">Thêm sản phẩm</p>
                </Link>
                <Link
                  href="/admin/orders"
                  className="group p-4 bg-gradient-to-br from-green-900/50 to-green-800/50 rounded-xl hover:shadow-lg hover:from-green-800/60 hover:to-green-700/60 transition-all duration-300 text-center transform hover:-translate-y-1 border border-green-500/20"
                >
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-green-300">Quản lý đơn hàng</p>
                </Link>
                <Link
                  href="/admin/categories"
                  className="group p-4 bg-gradient-to-br from-purple-900/50 to-purple-800/50 rounded-xl hover:shadow-lg hover:from-purple-800/60 hover:to-purple-700/60 transition-all duration-300 text-center transform hover:-translate-y-1 border border-purple-500/20"
                >
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-purple-300">Quản lý danh mục</p>
                </Link>
                {userData.role === 'ADMIN' && (
                  <Link
                    href="/admin/users"
                    className="group p-4 bg-gradient-to-br from-pink-900/50 to-pink-800/50 rounded-xl hover:shadow-lg hover:from-pink-800/60 hover:to-pink-700/60 transition-all duration-300 text-center transform hover:-translate-y-1 border border-pink-500/20"
                  >
                    <div className="w-12 h-12 bg-pink-500 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-pink-300">Quản lý người dùng</p>
                  </Link>
                )}
                {userData.role === 'BUSINESS' && (
                  <Link
                    href="/admin/reports"
                    className="group p-4 bg-gradient-to-br from-pink-900/50 to-pink-800/50 rounded-xl hover:shadow-lg hover:from-pink-800/60 hover:to-pink-700/60 transition-all duration-300 text-center transform hover:-translate-y-1 border border-pink-500/20"
                  >
                    <div className="w-12 h-12 bg-pink-500 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-pink-300">Báo cáo tổng hợp</p>
                  </Link>
                )}
                <Link
                  href="/admin/ai-insights"
                  className="group p-4 bg-gradient-to-br from-indigo-900/50 to-indigo-800/50 rounded-xl hover:shadow-lg hover:from-indigo-800/60 hover:to-indigo-700/60 transition-all duration-300 text-center transform hover:-translate-y-1 border border-indigo-500/20"
                >
                  <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-indigo-300">AI Insights</p>
                </Link>
                <Link
                  href="/admin/revenue"
                  className="group p-4 bg-gradient-to-br from-yellow-900/50 to-yellow-800/50 rounded-xl hover:shadow-lg hover:from-yellow-800/60 hover:to-yellow-700/60 transition-all duration-300 text-center transform hover:-translate-y-1 border border-yellow-500/20"
                >
                  <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-yellow-300">Xem doanh thu</p>
                </Link>
              </div>
            </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl blur-xl"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-emerald-500/20">
            <h3 className="text-xl font-bold text-slate-200 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Hoạt động gần đây
            </h3>
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-slate-400">Chưa có hoạt động nào</p>
                </div>
              ) : (
                recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.iconBgColor}`}>
                      <svg className={`w-4 h-4 ${activity.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={activity.iconPath} />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-white">{activity.actionDescription}</p>
                      <p className="text-xs text-gray-500">{activity.entityInfo} - {activity.timeAgo}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
            <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Trạng thái hệ thống
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                <span className="text-sm font-medium text-green-800 dark:text-green-200">Python Service</span>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400">Online</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                <span className="text-sm font-medium text-green-800 dark:text-green-200">Spring Service</span>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400">Online</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                <span className="text-sm font-medium text-green-800 dark:text-green-200">Database</span>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400">Online</span>
            </div>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
}
