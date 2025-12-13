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

export default function AIInsightsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [analysisType, setAnalysisType] = useState<'general' | 'pricing' | 'inventory' | 'sales'>('general');
  const [insights, setInsights] = useState('');
  const [statistics, setStatistics] = useState<any>(null);
  const [userStr, setUserStr] = useState<string | null>(null);

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
  }, [router]);

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
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-600"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </option>
                ))}
              </select>
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
              disabled={loading}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:scale-100"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Đang phân tích...</span>
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

            {/* Statistics Summary */}
            {statistics && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Thống kê nhanh</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Sản phẩm:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{statistics.overview?.total_products}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Đơn hàng:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{statistics.overview?.total_orders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Doanh thu:</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(statistics.overview?.total_revenue || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Insights Display */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 min-h-[600px]">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Kết quả phân tích AI
              </h3>

              {!insights && !loading && (
                <div className="flex flex-col items-center justify-center h-[500px] text-center">
                  <svg className="w-24 h-24 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    Chọn loại phân tích và nhấn "Tạo phân tích AI" để bắt đầu
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                    AI sẽ phân tích dữ liệu kinh doanh và đưa ra các đề xuất chiến lược
                  </p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center h-[500px]">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">AI đang phân tích dữ liệu...</p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Vui lòng đợi trong giây lát</p>
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
    </AdminLayout>
  );
}
