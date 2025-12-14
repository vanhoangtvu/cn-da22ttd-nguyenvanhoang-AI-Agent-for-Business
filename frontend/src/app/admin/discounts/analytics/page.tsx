'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

interface DiscountAnalytics {
  totalDiscounts: number;
  activeDiscounts: number;
  totalUsage: number;
  totalSavings: number;
  topDiscounts: Array<{
    id: number;
    code: string;
    name: string;
    usedCount: number;
    totalSavings: number;
    discountType: string;
    discountValue: number;
  }>;
  usageByType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  recentUsage: Array<{
    date: string;
    usageCount: number;
    savings: number;
  }>;
}

export default function DiscountAnalyticsPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<DiscountAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = apiClient.getUserData();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'BUSINESS')) {
      router.push('/shop');
      return;
    }

    setUserData(user);
    loadAnalytics();
  }, [router]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getDiscountAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PERCENTAGE':
        return 'bg-blue-500';
      case 'FIXED_AMOUNT':
        return 'bg-green-500';
      case 'FREE_SHIPPING':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PERCENTAGE':
        return 'Phần trăm';
      case 'FIXED_AMOUNT':
        return 'Cố định';
      case 'FREE_SHIPPING':
        return 'Miễn phí ship';
      default:
        return type;
    }
  };

  if (loading || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Đang tải thống kê...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <AdminLayout userData={userData} currentPage="discounts">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Không thể tải dữ liệu thống kê</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout userData={userData} currentPage="discounts">
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
            <svg className="w-8 h-8 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Thống kê mã giảm giá
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Tổng quan hiệu quả và sử dụng mã giảm giá
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Tổng mã giảm giá</p>
                <p className="text-3xl font-bold">{analytics.totalDiscounts}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Đang hoạt động</p>
                <p className="text-3xl font-bold">{analytics.activeDiscounts}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Lượt sử dụng</p>
                <p className="text-3xl font-bold">{analytics.totalUsage}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Tổng tiết kiệm</p>
                <p className="text-2xl font-bold">{analytics.totalSavings.toLocaleString('vi-VN')}đ</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Top Performing Discounts */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Top mã giảm giá
            </h3>
            <div className="space-y-4">
              {analytics.topDiscounts.map((discount, index) => (
                <div key={discount.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-white">{discount.code}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{discount.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-purple-600">{discount.usedCount} lượt</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {discount.totalSavings.toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Usage by Type */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Sử dụng theo loại
            </h3>
            <div className="space-y-4">
              {analytics.usageByType.map((item) => (
                <div key={item.type} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {getTypeLabel(item.type)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${getTypeColor(item.type)}`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Usage Trend */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Xu hướng sử dụng gần đây
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            {analytics.recentUsage.map((day, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {new Date(day.date).toLocaleDateString('vi-VN', { 
                    weekday: 'short',
                    day: 'numeric',
                    month: 'numeric'
                  })}
                </p>
                <p className="text-2xl font-bold text-purple-600">{day.usageCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {day.savings.toLocaleString('vi-VN')}đ
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </AdminLayout>
  );
}