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

// Revenue Analysis Component
function RevenueAnalysis({ userData }: { userData: any }) {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [duration, setDuration] = useState(7);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRevenueData();
  }, [period, duration, userData]);

  const loadRevenueData = async () => {
    try {
      setLoading(true);
      let data: RevenueData[] = [];
      if (userData.role === 'ADMIN') {
        if (period === 'daily') {
          data = await apiClient.getAdminDailyRevenue(duration) as RevenueData[];
        } else if (period === 'weekly') {
          data = await apiClient.getAdminWeeklyRevenue(duration) as RevenueData[];
        } else {
          data = await apiClient.getAdminMonthlyRevenue(duration) as RevenueData[];
        }
      } else {
        if (period === 'daily') {
          data = await apiClient.getDailyRevenue(duration) as RevenueData[];
        } else if (period === 'weekly') {
          data = await apiClient.getWeeklyRevenue(duration) as RevenueData[];
        } else {
          data = await apiClient.getMonthlyRevenue(duration) as RevenueData[];
        }
      }
      setRevenueData(data);
    } catch (error) {
      console.error('Failed to load revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const maxRevenue = Math.max(...revenueData.map(item => item.revenue), 0);

  return (
    <div className="mb-8">
      <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
        <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Phân tích Doanh thu Chi tiết
      </h3>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setPeriod('daily')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                period === 'daily' 
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/50' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Theo ngày
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                period === 'weekly' 
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/50' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Theo tuần
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                period === 'monthly' 
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/50' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Theo tháng
            </button>
          </div>
          <div className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-700 px-4 py-2 rounded-lg">
            <label className="text-gray-700 dark:text-gray-300 font-semibold">
              {period === 'daily' ? 'Số ngày:' : period === 'weekly' ? 'Số tuần:' : 'Số tháng:'}
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="px-4 py-2 border-2 border-purple-300 dark:border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white font-semibold"
            >
              {period === 'daily' && (
                <>
                  <option value={7}>7</option>
                  <option value={14}>14</option>
                  <option value={30}>30</option>
                </>
              )}
              {period === 'weekly' && (
                <>
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                </>
              )}
              {period === 'monthly' && (
                <>
                  <option value={3}>3</option>
                  <option value={6}>6</option>
                  <option value={12}>12</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Biểu đồ cột
            </h4>
            <div className="relative">
              <div className="h-64 flex items-end justify-around gap-2 px-2 pb-2 border-b-2 border-gray-300 dark:border-gray-600">
                {revenueData.map((item, index) => {
                  const percentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                  const heightPx = Math.max((percentage / 100) * 240, 10);
                  return (
                    <div key={index} className="flex-1 flex flex-col-reverse items-center group max-w-[60px]">
                      <div 
                        className="w-full bg-gradient-to-t from-blue-500 via-blue-600 to-purple-600 rounded-t-lg transition-all duration-1000 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 cursor-pointer shadow-lg relative overflow-hidden"
                        style={{ height: `${heightPx}px` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-white/0 via-white/10 to-white/20"></div>
                        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                            <div className="font-semibold mb-1">{item.period}</div>
                            <div className="text-yellow-400">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.revenue)}
                            </div>
                            <div className="text-green-400">{item.deliveredOrders} đơn</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-start justify-around gap-2 px-2 pt-2">
                {revenueData.map((item, index) => (
                  <div key={index} className="flex-1 max-w-[60px]">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 text-center line-clamp-1">
                      {item.period.length > 8 ? item.period.substring(0, 8) : item.period}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              </svg>
              Phân bổ doanh thu
            </h4>
            <div className="flex flex-col items-center">
              <div className="relative w-48 h-48 mb-4">
                <svg viewBox="0 0 200 200" className="transform -rotate-90">
                  {(() => {
                    let currentAngle = 0;
                    const colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1'];
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
                      const pathData = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
                      return (
                        <path
                          key={index}
                          d={pathData}
                          fill={colors[index % colors.length]}
                          className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                          style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
                        >
                          <title>{item.period}: {percentage.toFixed(1)}%</title>
                        </path>
                      );
                    });
                  })()}
                  <circle cx="100" cy="100" r="45" fill="white" className="dark:fill-gray-800" />
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-h-40 overflow-y-auto">
                {revenueData.map((item, index) => {
                  const percentage = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
                  const colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1'];
                  return (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[index % colors.length] }}></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-800 dark:text-white truncate">{item.period}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SystemReport {
  reportTime: string;
  revenueOverview: {
    totalRevenue: number;
    todayRevenue: number;
    weekRevenue: number;
    monthRevenue: number;
    growthRate: number;
    avgOrderValue: number;
  };
  productStatistics: {
    totalProducts: number;
    activeProducts: number;
    outOfStockProducts: number;
    lowStockProducts: number;
    totalInventoryValue: number;
    totalProductsSold: number;
  };
  orderStatistics: {
    totalOrders: number;
    pendingOrders: number;
    processingOrders: number;
    shippingOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    successRate: number;
    todayOrders: number;
  };
  customerStatistics: {
    totalCustomers: number;
    newCustomersThisMonth: number;
    customersWithOrders: number;
    conversionRate: number;
    avgCustomerValue: number;
  };
  businessStatistics: {
    totalBusinesses: number;
    activeBusinesses: number;
    totalBusinessProducts: number;
    topBusiness: string;
    topBusinessRevenue: number;
  };
  topSellingProducts: Array<{
    productId: number;
    productName: string;
    soldQuantity: number;
    revenue: number;
    businessName: string;
  }>;
  dailyRevenue: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
}

export default function SystemReports() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<SystemReport | null>(null);

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
    loadReport();
  }, [router]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getSystemReport();
      setReport(data as SystemReport);
    } catch (error) {
      console.error('Failed to load system report:', error);
      alert('Không thể tải báo cáo hệ thống. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !userData || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full bg-purple-400/20 blur-xl animate-pulse"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 animate-pulse">Đang tải báo cáo hệ thống...</p>
        </div>
      </div>
    );
  }

  const maxDailyRevenue = Math.max(...report.dailyRevenue.map(d => d.revenue), 0);

  return (
    <AdminLayout userData={userData} currentPage="reports">
      <main className="container mx-auto px-4 py-8">
        {/* Report Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl shadow-lg p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Báo cáo Hệ thống</h2>
              <p className="text-blue-100">Cập nhật: {new Date(report.reportTime).toLocaleString('vi-VN')}</p>
            </div>
            <button
              onClick={loadReport}
              className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Làm mới
              </div>
            </button>
          </div>
        </div>

        {/* Revenue Overview */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tổng quan Doanh thu
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-green-500 transform hover:scale-105 transition-all">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Tổng doanh thu</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(report.revenueOverview.totalRevenue)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-blue-500 transform hover:scale-105 transition-all">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Hôm nay</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(report.revenueOverview.todayRevenue)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-purple-500 transform hover:scale-105 transition-all">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Tuần này</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(report.revenueOverview.weekRevenue)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-pink-500 transform hover:scale-105 transition-all">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Tháng này</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(report.revenueOverview.monthRevenue)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-yellow-500 transform hover:scale-105 transition-all">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Tăng trưởng</p>
              <p className={`text-2xl font-bold ${report.revenueOverview.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {report.revenueOverview.growthRate.toFixed(1)}%
              </p>
              <div className="flex items-center gap-1 text-sm mt-1">
                {report.revenueOverview.growthRate >= 0 ? (
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="text-gray-600 dark:text-gray-400">so với tháng trước</span>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-indigo-500 transform hover:scale-105 transition-all">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">TB/Đơn</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(report.revenueOverview.avgOrderValue)}
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Product Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Thống kê Sản phẩm
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Tổng sản phẩm</p>
                <p className="text-3xl font-bold text-blue-600">{report.productStatistics.totalProducts}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Đang bán</p>
                <p className="text-3xl font-bold text-green-600">{report.productStatistics.activeProducts}</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Hết hàng</p>
                <p className="text-3xl font-bold text-red-600">{report.productStatistics.outOfStockProducts}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Sắp hết</p>
                <p className="text-3xl font-bold text-yellow-600">{report.productStatistics.lowStockProducts}</p>
              </div>
              <div className="col-span-2 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Giá trị tồn kho</p>
                <p className="text-2xl font-bold text-purple-600">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(report.productStatistics.totalInventoryValue)}
                </p>
              </div>
            </div>
          </div>

          {/* Order Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Thống kê Đơn hàng
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">Tổng đơn hàng</span>
                <span className="text-xl font-bold text-gray-800 dark:text-white">{report.orderStatistics.totalOrders}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Chờ xử lý</span>
                  <span className="text-lg font-bold text-blue-600">{report.orderStatistics.pendingOrders}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Đang xử lý</span>
                  <span className="text-lg font-bold text-yellow-600">{report.orderStatistics.processingOrders}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Đang giao</span>
                  <span className="text-lg font-bold text-purple-600">{report.orderStatistics.shippingOrders}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Đã giao</span>
                  <span className="text-lg font-bold text-green-600">{report.orderStatistics.deliveredOrders}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border-2 border-green-200 dark:border-green-700">
                <span className="text-gray-700 dark:text-gray-300 font-semibold">Tỷ lệ thành công</span>
                <span className="text-2xl font-bold text-green-600">{report.orderStatistics.successRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer & Business Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Customer Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Thống kê Khách hàng
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Tổng khách hàng</p>
                  <p className="text-3xl font-bold text-purple-600">{report.customerStatistics.totalCustomers}</p>
                </div>
                <svg className="w-12 h-12 text-purple-600 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Mới tháng này</p>
                  <p className="text-2xl font-bold text-blue-600">{report.customerStatistics.newCustomersThisMonth}</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Đã mua hàng</p>
                  <p className="text-2xl font-bold text-green-600">{report.customerStatistics.customersWithOrders}</p>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg border-2 border-indigo-200 dark:border-indigo-700">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Tỷ lệ chuyển đổi</p>
                <p className="text-3xl font-bold text-indigo-600">{report.customerStatistics.conversionRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Business Statistics */}
          {userData.role === 'ADMIN' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Thống kê Doanh nghiệp
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Tổng DN</p>
                    <p className="text-3xl font-bold text-cyan-600">{report.businessStatistics.totalBusinesses}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Hoạt động</p>
                    <p className="text-3xl font-bold text-green-600">{report.businessStatistics.activeBusinesses}</p>
                  </div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Tổng sản phẩm DN</p>
                  <p className="text-2xl font-bold text-purple-600">{report.businessStatistics.totalBusinessProducts}</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 dark:from-yellow-900/20 dark:via-orange-900/20 dark:to-red-900/20 rounded-lg border-2 border-yellow-300 dark:border-yellow-700">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <p className="text-gray-700 dark:text-gray-300 font-semibold">Top Seller</p>
                  </div>
                  <p className="text-lg font-bold text-gray-800 dark:text-white mb-1">{report.businessStatistics.topBusiness}</p>
                  <p className="text-xl font-bold text-orange-600">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(report.businessStatistics.topBusinessRevenue)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Revenue Analysis Section */}
        <RevenueAnalysis userData={userData} />

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Revenue Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Doanh thu 7 ngày gần nhất
            </h3>
            <div className="relative">
              <div className="h-64 flex items-end justify-around gap-2 px-2 pb-2 border-b-2 border-gray-300 dark:border-gray-600">
                {report.dailyRevenue.map((day, index) => {
                  const percentage = maxDailyRevenue > 0 ? (day.revenue / maxDailyRevenue) * 100 : 0;
                  const heightPx = Math.max((percentage / 100) * 240, 10);
                  return (
                    <div key={index} className="flex-1 flex flex-col-reverse items-center group max-w-[80px]">
                      <div 
                        className="w-full bg-gradient-to-t from-green-500 via-green-600 to-emerald-600 rounded-t-lg transition-all duration-1000 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 cursor-pointer shadow-lg hover:shadow-2xl relative overflow-hidden"
                        style={{ 
                          height: `${heightPx}px`,
                          animation: `growUp 1s ease-out ${index * 0.1}s both`
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-white/0 via-white/10 to-white/20"></div>
                        {percentage > 20 && (
                          <div className="absolute top-2 left-0 right-0 text-center">
                            <span className="text-xs font-bold text-white drop-shadow-lg">
                              {day.orders}
                            </span>
                          </div>
                        )}
                        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                            <div className="font-semibold mb-1">{new Date(day.date).toLocaleDateString('vi-VN')}</div>
                            <div className="text-yellow-400">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(day.revenue)}
                            </div>
                            <div className="text-green-400">{day.orders} đơn</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-start justify-around gap-2 px-2 pt-2">
                {report.dailyRevenue.map((day, index) => (
                  <div key={index} className="flex-1 max-w-[80px]">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 text-center line-clamp-2">
                      {new Date(day.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Top 10 Sản phẩm bán chạy
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {report.topSellingProducts.map((product, index) => (
                <div 
                  key={product.productId} 
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg hover:from-yellow-50 hover:to-orange-50 dark:hover:from-yellow-900/20 dark:hover:to-orange-900/20 transition-all group"
                  style={{ animation: `slideIn 0.5s ease-out ${index * 0.05}s both` }}
                >
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold rounded-full shadow-lg group-hover:scale-110 transition-transform">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-white truncate">{product.productName}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{product.businessName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{product.soldQuantity} SP</p>
                    <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                      {new Intl.NumberFormat('vi-VN', { notation: 'compact', compactDisplay: 'short' }).format(product.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes growUp {
          from {
            height: 0;
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
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
      `}</style>
    </AdminLayout>
  );
}
