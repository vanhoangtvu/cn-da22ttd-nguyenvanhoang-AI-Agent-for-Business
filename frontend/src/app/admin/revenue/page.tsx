'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

interface RevenueData {
  period: string;
  totalOrders: number;
  deliveredOrders: number;
  revenue: number;
  productsSold: number;
}

export default function RevenueManagement() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [duration, setDuration] = useState(7);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [stats, setStats] = useState<any>(null);

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
    loadData(user);
  }, [router, period, duration]);

  const loadData = async (user: any) => {
    try {
      setLoading(true);

      // Load stats
      const statsData = user.role === 'ADMIN'
        ? await apiClient.getAdminStats()
        : await apiClient.getBusinessStats();
      setStats(statsData);

      // Load revenue data based on period
      let data: RevenueData[] = [];
      if (user.role === 'ADMIN') {
        if (period === 'daily') {
          data = (await apiClient.getAdminDailyRevenue(duration)) as RevenueData[];
        } else if (period === 'weekly') {
          data = (await apiClient.getAdminWeeklyRevenue(duration)) as RevenueData[];
        } else {
          data = (await apiClient.getAdminMonthlyRevenue(duration)) as RevenueData[];
        }
      } else {
        if (period === 'daily') {
          data = (await apiClient.getDailyRevenue(duration)) as RevenueData[];
        } else if (period === 'weekly') {
          data = (await apiClient.getWeeklyRevenue(duration)) as RevenueData[];
        } else {
          data = (await apiClient.getMonthlyRevenue(duration)) as RevenueData[];
        }
      }

      setRevenueData(data);
    } catch (error) {
      console.error('Failed to load revenue data:', error);
      alert('Không thể tải dữ liệu doanh thu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalOrders = revenueData.reduce((sum, item) => sum + item.totalOrders, 0);
  const totalDelivered = revenueData.reduce((sum, item) => sum + item.deliveredOrders, 0);
  const avgRevenue = revenueData.length > 0 ? totalRevenue / revenueData.length : 0;
  const maxRevenue = Math.max(...revenueData.map(item => item.revenue), 0);

  if (loading || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full bg-purple-400/20 blur-xl animate-pulse"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 animate-pulse">Đang tải dữ liệu doanh thu...</p>
          <div className="mt-6 flex gap-2 justify-center">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout userData={userData} currentPage="revenue">
      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 animate-fade-in border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setPeriod('daily')}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${period === 'daily'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 hover:shadow-md'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Theo ngày
                </div>
              </button>
              <button
                onClick={() => setPeriod('weekly')}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${period === 'weekly'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 hover:shadow-md'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Theo tuần
                </div>
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${period === 'monthly'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 hover:shadow-md'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Theo tháng
                </div>
              </button>
            </div>
            <div className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-700 px-4 py-2 rounded-lg">
              <label className="text-gray-700 dark:text-gray-300 font-semibold flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {period === 'daily' ? 'Số ngày:' : period === 'weekly' ? 'Số tuần:' : 'Số tháng:'}
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="px-4 py-2 border-2 border-purple-300 dark:border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white font-semibold transition-all hover:border-purple-400 cursor-pointer"
              >
                {period === 'daily' && (
                  <>
                    <option value={7}>7</option>
                    <option value={14}>14</option>
                    <option value={30}>30</option>
                    <option value={60}>60</option>
                    <option value={90}>90</option>
                  </>
                )}
                {period === 'weekly' && (
                  <>
                    <option value={4}>4</option>
                    <option value={8}>8</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                  </>
                )}
                {period === 'monthly' && (
                  <>
                    <option value={3}>3</option>
                    <option value={6}>6</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-blue-500 transform hover:scale-105 transition-transform duration-300">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Tổng doanh thu</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-orange-500 transform hover:scale-105 transition-transform duration-300">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Tổng đơn hàng</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{totalOrders}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-green-500 transform hover:scale-105 transition-transform duration-300">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Đơn đã giao</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{totalDelivered}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalOrders > 0 ? ((totalDelivered / totalOrders) * 100).toFixed(1) : 0}% hoàn thành
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-purple-500 transform hover:scale-105 transition-transform duration-300">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Doanh thu TB</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(avgRevenue)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-yellow-500 transform hover:scale-105 transition-transform duration-300">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Cao nhất</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(maxRevenue)}
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Column Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Biểu đồ cột doanh thu
            </h2>
            <div className="relative">
              {/* Chart Area */}
              <div className="h-80 flex items-end justify-around gap-2 px-4 pb-2 border-b-2 border-gray-300 dark:border-gray-600">
                {revenueData.map((item, index) => {
                  const percentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                  // Ensure minimum height of 5% for visibility
                  const heightPercentage = Math.max(percentage, 5);
                  const heightPx = (heightPercentage / 100) * 300; // 300px = h-80 - padding
                  return (
                    <div key={index} className="flex-1 flex flex-col-reverse items-center group max-w-[80px]">
                      {/* Column */}
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 via-blue-600 to-purple-600 rounded-t-lg transition-all duration-1000 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 cursor-pointer shadow-lg hover:shadow-2xl relative overflow-hidden"
                        style={{
                          height: `${heightPx}px`,
                          animation: `growUp 1s ease-out ${index * 0.1}s both`
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-white/0 via-white/10 to-white/20 animate-shimmer"></div>
                        {/* Value Label */}
                        {heightPercentage > 20 && (
                          <div className="absolute top-2 left-0 right-0 text-center">
                            <span className="text-xs font-bold text-white drop-shadow-lg">
                              {new Intl.NumberFormat('vi-VN', { notation: 'compact', compactDisplay: 'short' }).format(item.revenue)}
                            </span>
                          </div>
                        )}
                        {/* Tooltip */}
                        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                            <div className="font-semibold mb-1">{item.period}</div>
                            <div className="text-yellow-400">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.revenue)}
                            </div>
                            <div className="text-green-400">{item.deliveredOrders} đơn</div>
                            <div className="text-blue-400">{item.productsSold} SP</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Labels */}
              <div className="flex items-start justify-around gap-2 px-4 pt-2">
                {revenueData.map((item, index) => (
                  <div key={index} className="flex-1 max-w-[80px]">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 text-center hover:text-purple-600 dark:hover:text-purple-400 transition-colors line-clamp-2">
                      {item.period.length > 10 ? item.period.substring(0, 10) + '...' : item.period}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {revenueData.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">Không có dữ liệu</p>
              </div>
            )}
          </div>

          {/* Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              Phân bổ doanh thu
            </h2>
            <div className="flex flex-col items-center">
              {/* Pie Chart SVG */}
              <div className="relative w-64 h-64 mb-6">
                <svg viewBox="0 0 200 200" className="transform -rotate-90">
                  {(() => {
                    let currentAngle = 0;
                    const colors = [
                      '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B',
                      '#EF4444', '#06B6D4', '#6366F1', '#F97316', '#14B8A6'
                    ];
                    return revenueData.map((item, index) => {
                      const percentage = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
                      const angle = (percentage / 100) * 360;
                      const startAngle = currentAngle;
                      currentAngle += angle;

                      const startRad = (startAngle * Math.PI) / 180;
                      const endRad = (currentAngle * Math.PI) / 180;

                      const x1 = 100 + 80 * Math.cos(startRad);
                      const y1 = 100 + 80 * Math.sin(startRad);
                      const x2 = 100 + 80 * Math.cos(endRad);
                      const y2 = 100 + 80 * Math.sin(endRad);

                      const largeArc = angle > 180 ? 1 : 0;

                      const pathData = [
                        `M 100 100`,
                        `L ${x1} ${y1}`,
                        `A 80 80 0 ${largeArc} 1 ${x2} ${y2}`,
                        `Z`
                      ].join(' ');

                      return (
                        <g key={index}>
                          <path
                            d={pathData}
                            fill={colors[index % colors.length]}
                            className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                            style={{
                              animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
                              filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
                            }}
                          >
                            <title>{item.period}: {percentage.toFixed(1)}%</title>
                          </path>
                        </g>
                      );
                    });
                  })()}
                  {/* Center Circle */}
                  <circle cx="100" cy="100" r="50" fill="white" className="dark:fill-gray-800" />
                  <text x="100" y="95" textAnchor="middle" className="text-sm font-bold fill-gray-800 dark:fill-white transform rotate-90" style={{ transformOrigin: '100px 100px' }}>
                    Tổng
                  </text>
                  <text x="100" y="110" textAnchor="middle" className="text-xs fill-gray-600 dark:fill-gray-400 transform rotate-90" style={{ transformOrigin: '100px 100px' }}>
                    {new Intl.NumberFormat('vi-VN', { notation: 'compact', compactDisplay: 'short' }).format(totalRevenue)}
                  </text>
                </svg>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-3 w-full max-h-48 overflow-y-auto">
                {revenueData.map((item, index) => {
                  const percentage = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
                  const colors = [
                    '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B',
                    '#EF4444', '#06B6D4', '#6366F1', '#F97316', '#14B8A6'
                  ];
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      style={{ animation: `slideIn 0.5s ease-out ${index * 0.1}s both` }}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 shadow-md"
                        style={{ backgroundColor: colors[index % colors.length] }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-800 dark:text-white truncate">
                          {item.period}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {revenueData.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">Không có dữ liệu</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Revenue Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 animate-fade-in">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Biểu đồ thanh doanh thu
          </h2>
          <div className="space-y-4">
            {revenueData.map((item, index) => {
              const percentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
              const deliveryRate = item.totalOrders > 0 ? (item.deliveredOrders / item.totalOrders) * 100 : 0;
              return (
                <div
                  key={index}
                  className="space-y-2 group hover:bg-gray-50 dark:hover:bg-gray-700/50 p-3 rounded-lg transition-all duration-300"
                  style={{
                    animation: `slideIn 0.5s ease-out ${index * 0.1}s both`
                  }}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></span>
                      {item.period}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-green-600 dark:text-green-400 font-semibold">{item.deliveredOrders}</span>
                        <span>/</span>
                        <span>{item.totalOrders}</span>
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">{item.productsSold}</span>
                      </span>
                      <span className="font-bold text-purple-600 dark:text-purple-400 min-w-[120px] text-right">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.revenue)}
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="w-full bg-gradient-to-r from-gray-200 via-gray-200 to-gray-300 dark:from-gray-700 dark:via-gray-700 dark:to-gray-600 rounded-full h-5 overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-purple-600 to-pink-600 rounded-full transition-all duration-1000 flex items-center justify-between px-3 relative overflow-hidden group-hover:shadow-lg"
                        style={{
                          width: `${percentage}%`,
                          animation: `expandWidth 1s ease-out ${index * 0.1}s both`
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer"></div>
                        {percentage > 15 && (
                          <div className="flex items-center gap-2 relative z-10">
                            <span className="text-xs font-bold text-white drop-shadow-lg">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {percentage > 30 && (
                          <div className="flex items-center gap-1 text-xs text-white/90 relative z-10">
                            <span className="font-semibold">{deliveryRate.toFixed(0)}%</span>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {revenueData.length === 0 && (
            <div className="text-center py-12 animate-fade-in">
              <div className="relative inline-block">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-bounce-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div className="absolute inset-0 bg-gray-400/20 blur-xl animate-pulse"></div>
              </div>
              <p className="text-gray-500 dark:text-gray-400">Không có dữ liệu doanh thu</p>
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes expandWidth {
            from {
              width: 0;
            }
          }
          @keyframes growUp {
            from {
              height: 0;
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes bounce-slow {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }
          .animate-shimmer {
            animation: shimmer 2s infinite;
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-out;
          }
          .animate-bounce-slow {
            animation: bounce-slow 2s ease-in-out infinite;
          }
        `}</style>

        {/* Revenue Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-800">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Chi tiết doanh thu
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-200 uppercase tracking-wider">Kỳ</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-200 uppercase tracking-wider">Tổng đơn</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-200 uppercase tracking-wider">Đã giao</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-200 uppercase tracking-wider">SP đã bán</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-200 uppercase tracking-wider">Doanh thu</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-200 uppercase tracking-wider">TB/đơn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {revenueData.map((item, index) => {
                  const deliveryRate = item.totalOrders > 0 ? (item.deliveredOrders / item.totalOrders) * 100 : 0;
                  return (
                    <tr
                      key={index}
                      className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-gray-700 dark:hover:to-gray-700 transition-all duration-300 group"
                      style={{
                        animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`
                      }}
                    >
                      <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                        {item.period}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700 dark:text-gray-300 font-semibold">{item.totalOrders}</span>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 dark:text-green-400 font-bold">{item.deliveredOrders}</span>
                          <div className="flex-1 max-w-[60px]">
                            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-1000"
                                style={{ width: `${deliveryRate}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{deliveryRate.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <span className="text-blue-600 dark:text-blue-400 font-bold">{item.productsSold}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-bold text-purple-600 dark:text-purple-400 text-lg">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.revenue)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-semibold">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                          item.deliveredOrders > 0 ? item.revenue / item.deliveredOrders : 0
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </main>
    </AdminLayout>
  );
}
