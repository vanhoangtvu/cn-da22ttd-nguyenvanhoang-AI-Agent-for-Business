'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

interface AnalyticsData {
  overview: {
    total_products: number;
    total_orders: number;
    total_categories: number;
    total_revenue: number;
    avg_order_value: number;
  };
  revenue_by_status: Array<{ status: string; revenue: number }>;
  orders_by_status: Array<{ status: string; count: number }>;
  top_products: any[];
  low_stock_products: any[];
  category_stats: any;
  revenue_by_day: any;
  orders_by_day: any;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'products' | 'business'>('overview');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const userData = apiClient.getUserData();
    setUser(userData);
    if (!userData || userData.role !== 'ADMIN') {
      router.push('/admin');
      return;
    }

    loadAnalyticsData();
  }, [router]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getSystemAnalytics();
      
      // Transform Spring service data to match expected structure
      const transformedData: AnalyticsData = {
        overview: {
          total_products: data.totalProducts || 0,
          total_orders: data.totalOrders || 0,
          total_categories: data.categories?.length || 0,
          total_revenue: data.totalRevenue || 0,
          avg_order_value: data.totalOrders > 0 ? (data.totalRevenue / data.totalOrders) : 0
        },
        revenue_by_status: [],
        orders_by_status: [],
        top_products: data.topSellingProducts || [],
        low_stock_products: data.lowStockProducts || [],
        category_stats: {},
        revenue_by_day: {},
        orders_by_day: {}
      };
      
      setAnalyticsData(transformedData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      alert('Không thể tải dữ liệu phân tích');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Đang tải dữ liệu phân tích...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Không có dữ liệu</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout userData={user} currentPage="analytics">
      <div className="container mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Tổng sản phẩm</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{analyticsData.overview.total_products}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Danh mục: {analyticsData.overview.total_categories}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Tổng đơn hàng</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{analyticsData.overview.total_orders}</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Tổng doanh thu</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(analyticsData.overview.total_revenue)}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Giá trị TB/Đơn</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(analyticsData.overview.avg_order_value)}
                </p>
              </div>
            </div>

            {/* Revenue by Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Doanh thu theo trạng thái</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analyticsData.revenue_by_status.map((item: any, index: number) => (
                  <div key={index} className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg">
                    <p className="text-blue-800 dark:text-blue-200 text-sm font-semibold mb-2">{item.status}</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {formatCurrency(item.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Revenue Tab */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Đơn hàng theo trạng thái</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {analyticsData.orders_by_status.map((item: any, index: number) => (
                  <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{item.status}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{item.count}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Top Selling Products */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Sản phẩm bán chạy</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analyticsData.top_products.slice(0, 6).map((product: any, index: number) => (
                  <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                        {product.name}
                      </h4>
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{product.categoryName}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Đã bán</p>
                        <p className="font-bold text-gray-900 dark:text-white">{product.total_sold || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Tồn kho</p>
                        <p className="font-bold text-gray-900 dark:text-white">{product.stock || product.quantity || 0}</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-2">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Stock Products */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Cảnh báo tồn kho thấp
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sản phẩm</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tồn kho</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Đã bán</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Giá</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {analyticsData.low_stock_products.map((product: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{product.categoryName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
                            {product.stock || product.quantity || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{product.total_sold || 0}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{formatCurrency(product.price || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Business Tab */}
        {activeTab === 'business' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Phân tích theo danh mục</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(analyticsData.category_stats).map(([category, stats]: [string, any], index: number) => (
                  <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{category}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Số sản phẩm:</span>
                        <span className="font-bold text-gray-900 dark:text-white">{stats.product_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tổng tồn kho:</span>
                        <span className="font-bold text-gray-900 dark:text-white">{stats.total_stock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Giá TB:</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          {formatCurrency(stats.avg_price)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
