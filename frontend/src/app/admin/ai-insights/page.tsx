'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://14.183.200.75:5000';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  context_window: number;
}

interface SystemData {
  timestamp: string;
  data_source: string;
  overview: {
    total_products: number;
    total_orders: number;
    total_customers: number;
    total_users: number;
    total_revenue: number;
    monthly_revenue: number;
    weekly_revenue: number;
    daily_revenue: number;
    last_updated: string;
  };
  products: any;
  orders: any;
  customers: any;
  revenue: any;
  business_performance: any[];
  business_documents: any;
  metadata: any;
}

export default function AIInsightsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [analysisType, setAnalysisType] = useState<'general' | 'pricing' | 'inventory' | 'sales'>('general');
  const [insights, setInsights] = useState('');
  const [statistics, setStatistics] = useState<any>(null);
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [userStr, setUserStr] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'Groq' | 'Google'>('Groq');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const userData = typeof window !== 'undefined' ? localStorage.getItem('userData') : null;
    setUserStr(userData);
    
    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      const user = JSON.parse(userData);
      if (!user || (user.role !== 'ADMIN' && user.role !== 'BUSINESS')) {
        router.push('/admin');
        return;
      }
    }

    loadModels();
    // Don't auto-load system data, let user trigger it manually
  }, [router]);

  const loadSystemData = async () => {
    setSyncLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${AI_SERVICE_URL}/admin/analytics/system-data`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSystemData(data);
        // Set statistics from system data for backward compatibility
        setStatistics({
          overview: data.overview
        });
        // Clear previous insights when new data is loaded
        setInsights('');
      } else {
        console.error('Failed to load system data');
        setSystemData(null);
        setStatistics(null);
      }
    } catch (error) {
      console.error('Error loading system data:', error);
      setSystemData(null);
      setStatistics(null);
    } finally {
      setSyncLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/analytics/models`);
      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const generateInsights = async () => {
    try {
      setLoading(true);
      setInsights('');
      setStatistics(null);

      const response = await fetch(`${AI_SERVICE_URL}/api/analytics/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `Analyze ${analysisType} data and provide insights`,
          model_id: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      const data = await response.json();
      setInsights(data.analysis || data.insights || '');
      setStatistics(data.insights || null);
    } catch (error) {
      console.error('Error generating insights:', error);
      alert('Không thể tạo phân tích AI. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <AdminLayout userData={userStr} currentPage="ai-insights">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Analysis Type */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Loại phân tích</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setAnalysisType('general')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    analysisType === 'general'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Tổng quan
                  </div>
                  <div className="text-xs opacity-80">Phân tích toàn diện và đề xuất chung</div>
                </button>
                <button
                  onClick={() => setAnalysisType('pricing')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    analysisType === 'pricing'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Chiến lược giá
                  </div>
                  <div className="text-xs opacity-80">Tối ưu hóa giá bán và khuyến mãi</div>
                </button>
                <button
                  onClick={() => setAnalysisType('inventory')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    analysisType === 'inventory'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Quản lý kho
                  </div>
                  <div className="text-xs opacity-80">Tối ưu tồn kho và nhập hàng</div>
                </button>
                <button
                  onClick={() => setAnalysisType('sales')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    analysisType === 'sales'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Tăng trưởng bán hàng
                  </div>
                  <div className="text-xs opacity-80">Marketing và tăng doanh số</div>
                </button>
              </div>
            </div>

            {/* AI Model Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Chọn AI Model</h3>
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {models.find(m => m.id === selectedModel)?.provider === 'Groq' && (
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  {models.find(m => m.id === selectedModel)?.provider === 'Google' && (
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  )}
                  <div className="text-left">
                    <div className="font-medium">{models.find(m => m.id === selectedModel)?.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {models.find(m => m.id === selectedModel)?.provider}
                    </div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {models.find(m => m.id === selectedModel)?.provider === 'Groq' && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Groq - Siêu nhanh
                  </span>
                )}
                {models.find(m => m.id === selectedModel)?.provider === 'Google' && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Google Gemini - Thông minh
                  </span>
                )}
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateInsights}
              disabled={loading || syncLoading || !systemData}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Đang phân tích...</span>
                </div>
              ) : !systemData ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span>Cần đồng bộ dữ liệu trước</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Tạo phân tích AI</span>
                </div>
              )}
            </button>

            {/* System Data Summary */}
            {systemData && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Thống kê hệ thống</h3>
                  <button
                    onClick={loadSystemData}
                    disabled={syncLoading}
                    className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
                    title="Làm mới dữ liệu"
                  >
                    {syncLoading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Sản phẩm:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{systemData.overview.total_products}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Đơn hàng:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{systemData.overview.total_orders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Khách hàng:</span>
                    <span className="font-bold text-green-600 dark:text-green-400">{systemData.overview.total_customers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Người dùng:</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">{systemData.overview.total_users}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Doanh thu:</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(systemData.overview.total_revenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Doanh thu tháng:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(systemData.overview.monthly_revenue || 0)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Cập nhật: {new Date(systemData.metadata?.cache_timestamp || systemData.timestamp).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Insights Display */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 min-h-[600px] relative">
              {syncLoading && (
                <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center z-10 rounded-xl">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Đang đồng bộ dữ liệu từ hệ thống...</p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Vui lòng đợi trong giây lát</p>
                  </div>
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Kết quả phân tích AI
              </h3>

              {!insights && !loading && (
                <div className="flex flex-col items-center justify-center h-[500px] text-center px-8">
                  {systemData && systemData.overview && (systemData.overview.total_products > 0 || systemData.overview.total_orders > 0) ? (
                    // Có dữ liệu - hiển thị thông báo sẵn sàng phân tích
                    <>
                      <div className="mb-6">
                        <svg className="w-20 h-20 text-purple-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium mb-4">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Dữ liệu đã sẵn sàng
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                        AI Phân Tích Sẵn Sàng
                      </h3>

                      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                        Hệ thống đã có dữ liệu kinh doanh. Chọn loại phân tích và nhấn nút để bắt đầu phân tích AI thông minh.
                      </p>

                      <div className="grid grid-cols-4 gap-3 w-full max-w-lg mb-6">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {systemData.overview.total_products || 0}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Sản phẩm</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {systemData.overview.total_orders || 0}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Đơn hàng</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-green-600 dark:text-green-400">
                            {systemData.overview.total_customers || 0}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Khách hàng</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                            {formatCurrency(systemData.overview.total_revenue || 0)}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Doanh thu</div>
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                          AI sẽ phân tích dữ liệu và đưa ra insights chiến lược
                        </p>
                      </div>
                    </>
                  ) : (
                    // Không có dữ liệu - hiển thị thông báo cần setup
                    <>
                      <div className="mb-6">
                        <svg className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full text-sm font-medium mb-4">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          Chưa có dữ liệu kinh doanh
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                        AI Phân Tích Chưa Sẵn Sàng
                      </h3>

                      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                        Hệ thống cần dữ liệu kinh doanh để thực hiện phân tích AI thông minh.
                        Hãy import dữ liệu từ hệ thống quản lý để bắt đầu.
                      </p>

                      <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                          Liên hệ đội ngũ kỹ thuật để thiết lập dữ liệu kinh doanh
                        </p>
                        <button
                          onClick={loadSystemData}
                          disabled={syncLoading}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          {syncLoading ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          )}
                          {syncLoading ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center h-[500px]">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">AI đang phân tích dữ liệu...</p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Vui lòng đợi trong giây lát</p>
                </div>
              )}

              {!insights && !loading && systemData && (
                <div className="flex flex-col items-center justify-center h-[400px] text-center px-8">
                  <div className="mb-6">
                    <svg className="w-16 h-16 text-purple-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium mb-4">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Dữ liệu đã sẵn sàng
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    Sẵn sàng tạo phân tích AI
                  </h3>

                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                    Dữ liệu hệ thống đã được đồng bộ. Chọn loại phân tích và mô hình AI để bắt đầu phân tích thông minh.
                  </p>

                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      AI sẽ phân tích dữ liệu và đưa ra insights chiến lược
                    </p>
                  </div>
                </div>
              )}

              {insights && !loading && (
                <div className="prose prose-purple dark:prose-invert max-w-none">
                  <div 
                    className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ 
                      __html: (insights || '')
                        .replace(/\*\*(.+?)\*\*/g, '<strong class="text-purple-600 dark:text-purple-400">$1</strong>')
                        .replace(/### (.+?)(\n|$)/g, '<h3 class="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3">$1</h3>')
                        .replace(/## (.+?)(\n|$)/g, '<h2 class="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">$2</h2>')
                        .replace(/# (.+?)(\n|$)/g, '<h1 class="text-3xl font-bold text-gray-900 dark:text-white mt-8 mb-4">$1</h1>')
                        .replace(/\n- /g, '\n• ')
                        .replace(/\n\n/g, '<br/><br/>')
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Model Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chọn AI Model</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Provider Tabs */}
              <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button
                  onClick={() => setSelectedProvider('Groq')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    selectedProvider === 'Groq'
                      ? 'bg-white dark:bg-gray-600 text-orange-600 dark:text-orange-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Groq
                </button>
                <button
                  onClick={() => setSelectedProvider('Google')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    selectedProvider === 'Google'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Google Gemini
                </button>
              </div>

              {/* Models List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {models
                  .filter(model => model.provider === selectedProvider)
                  .map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setIsModalOpen(false);
                      }}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        selectedModel === model.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {model.provider === 'Groq' && (
                              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            )}
                            {model.provider === 'Google' && (
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                            )}
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">{model.name}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{model.provider}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                              </svg>
                              Context: {model.context_window.toLocaleString()} tokens
                            </span>
                          </div>
                        </div>
                        {selectedModel === model.id && (
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
              </div>

              {models.filter(model => model.provider === selectedProvider).length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Không có model nào cho provider này
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
