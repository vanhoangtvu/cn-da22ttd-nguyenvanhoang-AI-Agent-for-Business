'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface AIModel {
  id: string;
  name: string;
  provider: string;
  context_window: number;
}

interface ChromaStats {
  instance_path: string;
  total_collections: number;
  collections_stats: {
    [key: string]: {
      documents_count: number;
      metadata: any;
      error?: string;
    };
  };
  total_documents: number;
  timestamp: string;
}

interface ChromaData {
  instance_path: string;
  total_collections: number;
  collections: {
    [key: string]: {
      metadata: any;
      total_documents: number;
      documents: Array<{
        id: string;
        content: string;
        metadata: any;
      }>;
      error?: string;
    };
  };
  timestamp: string;
}

interface SystemData {
  totalUsers: number;
  totalCustomers: number;
  totalBusinessUsers: number;
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  deliveredOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  dailyRevenue?: number;
  totalDiscounts?: number;
  activeDiscounts?: number;
  totalDocuments?: number;
  users?: any[];
  products?: any[];
  orders?: any[];
  categories?: any[];
  businessPerformance?: any[];
  discounts?: any[];
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
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [userStr, setUserStr] = useState<string | null>(null);
  const [chromaStats, setChromaStats] = useState<ChromaStats | null>(null);
  const [chromaData, setChromaData] = useState<ChromaData | null>(null);
  const [chromaLoading, setChromaLoading] = useState(false);
  const [showChromaData, setShowChromaData] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'Groq' | 'Google'>('Groq');
  const [showChromaModal, setShowChromaModal] = useState(false);

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
    // Load ChromaDB stats on page load to check if data exists
    // Don't use localStorage - always check server
    console.log('[Init] Loading ChromaDB stats from server...');
    loadChromaStats();
  }, [router]);

  // Watch chromaStats changes
  useEffect(() => {
    console.log('[Effect] chromaStats changed:', chromaStats);
    if (chromaStats) {
      console.log('[Effect] chromaStats.total_documents:', chromaStats.total_documents);
      const needSync = chromaStats.total_documents === 0;
      console.log('[Effect] needSync:', needSync);

      // If ChromaDB has data but systemData is not loaded, load it for display
      if (chromaHasData() && !systemData) {
        console.log('[Effect] ChromaDB has data but systemData not loaded - loading systemData for display');
        loadSystemDataForDisplay();
      }
    }
  }, [chromaStats]);

  const loadSystemDataForDisplay = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      console.log('[LoadSystemDataForDisplay] Fetching system data from Spring Service...');
      const springResponse = await fetch(`${API_BASE_URL}/admin/analytics/system-data`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!springResponse.ok) {
        if (springResponse.status === 401) {
          console.error('Unauthorized - Token invalid or expired');
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          router.push('/login');
          return;
        } else {
          console.error('Failed to fetch system data for display:', springResponse.status);
          return;
        }
      }

      const data = await springResponse.json();
      console.log(`[LoadSystemDataForDisplay] Received data with ${data.products?.length || 0} products`);

      // Set system data for display only
      setSystemData(data);
      setStatistics(data);
      setInsights('');
    } catch (error) {
      console.error('[LoadSystemDataForDisplay] Error loading system data:', error);
    }
  };

  const loadSystemData = async () => {
    setSyncLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        alert('Vui lòng đăng nhập lại');
        router.push('/login');
        return;
      }

      // Bước 1: Lấy dữ liệu từ Spring Service
      console.log('[Sync] Step 1: Fetching data from Spring Service...');
      const springResponse = await fetch(`${API_BASE_URL}/admin/analytics/system-data`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!springResponse.ok) {
        if (springResponse.status === 401) {
          console.error('Unauthorized - Token invalid or expired');
          alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          router.push('/login');
          return;
        } else if (springResponse.status === 403) {
          console.error('Access denied - Insufficient permissions');
          alert('Bạn không có quyền truy cập chức năng này.');
          return;
        } else {
          throw new Error(`Failed to fetch data: ${springResponse.status}`);
        }
      }

      const data = await springResponse.json();
      console.log(`[Sync] Step 1 completed: Received data with ${data.products?.length || 0} products`);

      // Set system data for display
      setSystemData(data);
      setStatistics(data);
      setInsights('');

      // Bước 2: Đồng bộ dữ liệu vào ChromaDB
      console.log('[Sync] Step 2: Syncing data to ChromaDB...');
      const syncResponse = await fetch(`${AI_SERVICE_URL}/api/business/sync-from-spring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spring_service_url: API_BASE_URL,
          auth_token: token,
          clear_existing: true
        }),
      });

      if (syncResponse.ok) {
        const syncResult = await syncResponse.json();
        console.log('[Sync] Step 2 completed:', syncResult);

        // Hiển thị kết quả đồng bộ
        const summary = syncResult.summary;
        alert(`Đồng bộ thành công!\n\nSản phẩm: ${syncResult.products.success}/${syncResult.products.total} (${syncResult.products.with_details} có details)\nĐơn hàng: ${syncResult.orders.success}/${syncResult.orders.total}\nDanh mục: ${syncResult.categories.success}/${syncResult.categories.total}\n\nTổng: ${summary.total_success} thành công, ${summary.total_errors} lỗi`);

        console.log('[Sync] Completed successfully, reloading ChromaDB stats...');

        // Reload ChromaDB stats from server
        console.log('[Sync] Calling loadChromaStats to refresh...');
        await loadChromaStats();
        console.log('[Sync] loadChromaStats completed, chromaStats should be updated');
      } else {
        console.error('[Sync] Step 2 failed:', syncResponse.status);
        let errorMessage = 'Cảnh báo: Dữ liệu đã được tải nhưng không thể đồng bộ vào ChromaDB. Vui lòng thử lại.';

        try {
          const errorData = await syncResponse.json();
          if (errorData.detail) {
            errorMessage += `\n\nChi tiết lỗi: ${errorData.detail}`;
          }
        } catch (e) {
          const errorText = await syncResponse.text();
          if (errorText) {
            errorMessage += `\n\nChi tiết lỗi: ${errorText}`;
          }
        }

        alert(errorMessage);
      }

    } catch (error) {
      console.error('Error in sync process:', error);
      alert('Lỗi trong quá trình đồng bộ dữ liệu. Vui lòng kiểm tra kết nối và thử lại.');
      setSystemData(null);
      setStatistics(null);
    } finally {
      setSyncLoading(false);
    }
  };

  const deleteData = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu ChromaDB? Hành động này không thể hoàn tác.')) {
      return;
    }

    setDeleteLoading(true);
    try {
      console.log('[Delete] Starting ChromaDB data deletion...');
      const response = await fetch(`${AI_SERVICE_URL}/api/business/clear-chroma`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[Delete] Deletion completed:', result);

        alert(`Xóa dữ liệu thành công!\n\nĐã xóa ${result.total_cleared} collections.\n${result.total_errors > 0 ? `Có ${result.total_errors} lỗi.` : ''}`);

        // Reload ChromaDB stats
        await loadChromaStats();

        // Clear insights and system data
        setInsights('');
        setSystemData(null);
        setStatistics(null);
      } else {
        console.error('[Delete] Failed:', response.status);
        const errorData = await response.json();
        alert(`Lỗi khi xóa dữ liệu: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      alert('Lỗi trong quá trình xóa dữ liệu. Vui lòng thử lại.');
    } finally {
      setDeleteLoading(false);
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

  const loadChromaStats = async () => {
    try {
      setChromaLoading(true);
      console.log('[LoadChromaStats] Fetching stats from server...');
      const response = await fetch(`${AI_SERVICE_URL}/api/business/chroma-stats`);
      if (response.ok) {
        const data = await response.json();
        console.log('[LoadChromaStats] Stats received:', data);
        console.log('[LoadChromaStats] Total documents:', data.total_documents);
        console.log('[LoadChromaStats] Collections:', Object.keys(data.collections_stats || {}));

        console.log('[LoadChromaStats] Setting chromaStats state...');
        setChromaStats(data);
        console.log('[LoadChromaStats] chromaStats state set. Will re-render.');
      } else {
        console.error('[LoadChromaStats] Failed to load stats, status:', response.status);
      }
    } catch (error) {
      console.error('[LoadChromaStats] Error loading stats:', error);
    } finally {
      setChromaLoading(false);
    }
  };

  // Check if ChromaDB has data
  const chromaHasData = () => {
    console.log('[chromaHasData] chromaStats:', chromaStats);
    if (!chromaStats) {
      console.log('[chromaHasData] chromaStats is null/undefined - returning false (still loading)');
      return false;
    }
    console.log('[chromaHasData] total_documents:', chromaStats.total_documents, 'type:', typeof chromaStats.total_documents);

    // Handle both number and string cases
    const totalDocs = typeof chromaStats.total_documents === 'string'
      ? parseInt(chromaStats.total_documents, 10)
      : chromaStats.total_documents;

    console.log('[chromaHasData] parsed totalDocs:', totalDocs);
    const hasData = totalDocs > 0;
    console.log('[chromaHasData] hasData:', hasData, '(totalDocs > 0)');
    return hasData;
  };

  // Check if we need to sync (no data in ChromaDB)
  const needsSync = () => {
    const result = !chromaHasData();
    console.log('[needsSync] returning:', result);
    return result;
  };

  const loadChromaData = async () => {
    try {
      setChromaLoading(true);
      const response = await fetch(`${AI_SERVICE_URL}/api/business/chroma-data`);
      if (response.ok) {
        const data = await response.json();
        setChromaData(data);
        setShowChromaModal(true);
      } else {
        console.error('Failed to load ChromaDB data');
      }
    } catch (error) {
      console.error('Error loading ChromaDB data:', error);
    } finally {
      setChromaLoading(false);
    }
  };

  const generateInsights = async () => {
    try {
      setLoading(true);
      setInsights('');
      setStatistics(null);

      // Call the correct business analytics endpoint
      const response = await fetch(`${AI_SERVICE_URL}/api/business/ai-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: analysisType,  // Send analysis type: general, pricing, inventory, sales
          model: selectedModel, // Send selected AI model
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to generate insights');
      }

      const data = await response.json();
      console.log('[AI Insights] Response:', data);

      // Set insights from response
      setInsights(data.insights || '');
      setStatistics(data.statistics || null);
    } catch (error) {
      console.error('Error generating insights:', error);
      alert(`Không thể tạo phân tích AI: ${error instanceof Error ? error.message : 'Vui lòng thử lại.'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
  };

  return (
    <AdminLayout userData={userStr} currentPage="ai-insights">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1 max-h-[calc(100vh-120px)] overflow-y-auto">
            <div className="space-y-6">
              {/* Analysis Type */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Loại phân tích</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setAnalysisType('general')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${analysisType === 'general'
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
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${analysisType === 'pricing'
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
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${analysisType === 'inventory'
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
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${analysisType === 'sales'
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                    )}
                    {models.find(m => m.id === selectedModel)?.provider === 'Google' && (
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0 9c-1.657 0-3-4.03-3-9s1.343-9 3-9m0 18c1.657 0 3-4.03 3-9s-1.343-9-3-9" />
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                      Groq - Siêu nhanh
                    </span>
                  )}
                  {models.find(m => m.id === selectedModel)?.provider === 'Google' && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0 9c-1.657 0-3-4.03-3-9s1.343-9 3-9m0 18c1.657 0 3-4.03 3-9s-1.343-9-3-9" />
                      </svg>
                      Google Gemini - Thông minh
                    </span>
                  )}
                </p>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateInsights}
                disabled={loading || syncLoading || deleteLoading || !chromaHasData()}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Đang phân tích...</span>
                  </div>
                ) : !chromaHasData() ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span>{chromaStats ? 'ChromaDB trống - Cần đồng bộ' : 'Đang tải dữ liệu...'}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
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
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Sản phẩm:</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">{systemData.totalProducts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Đơn hàng:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{systemData.totalOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Khách hàng:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">{systemData.totalCustomers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Người dùng:</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400">{systemData.totalUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Doanh thu:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(systemData.totalRevenue || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Doanh thu tháng:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(systemData.monthlyRevenue || 0)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Cập nhật: {new Date().toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ChromaDB Data Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                    ChromaDB Analytics Data
                  </h3>
                  <div className="flex gap-2">
                    {/* Always show sync button */}
                    <button
                      onClick={loadSystemData}
                      disabled={syncLoading}
                      className="px-2 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 text-xs flex items-center gap-1"
                      title="Đồng bộ dữ liệu từ Spring Service vào ChromaDB"
                    >
                      {syncLoading ? (
                        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      Đồng bộ
                    </button>
                    {/* Delete data button */}
                    <button
                      onClick={deleteData}
                      disabled={deleteLoading || syncLoading}
                      className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-xs flex items-center gap-1"
                      title="Xóa tất cả dữ liệu ChromaDB"
                    >
                      {deleteLoading ? (
                        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                      Xóa
                    </button>
                  </div>
                </div>

                {chromaStats && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full">
                          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">{chromaStats.total_collections}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Collections</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
                          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">{chromaStats.total_documents}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Total Documents</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-full">
                          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{formatDateTime(chromaStats.timestamp)}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Last Updated</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={loadChromaData}
                        disabled={chromaLoading}
                        className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {chromaLoading ? (
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        Xem Chi Tiết Dữ Liệu
                      </button>
                    </div>
                  </div>
                )}

                {!chromaStats && !chromaLoading && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Chưa có dữ liệu ChromaDB. Nhấn Refresh để tải.
                  </div>
                )}
              </div>

              {/* System Data Summary */}
              {systemData && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Thống kê hệ thống</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Sản phẩm:</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">{systemData.totalProducts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Đơn hàng:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{systemData.totalOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Khách hàng:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">{systemData.totalCustomers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Người dùng:</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400">{systemData.totalUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Doanh thu:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(systemData.totalRevenue || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Doanh thu tháng:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(systemData.monthlyRevenue || 0)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Cập nhật: {new Date().toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Insights Display */}
          <div className="lg:col-span-2 max-h-[calc(100vh-120px)] overflow-y-auto">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 min-h-[600px] relative border border-white/20 dark:border-gray-700/30">
              {syncLoading && (
                <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-20 rounded-2xl">
                  <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
                      <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-blue-500 border-b-purple-500 mx-auto mb-4"></div>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">Đang đồng bộ dữ liệu...</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Đang vector hóa dữ liệu vào ChromaDB</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30 rounded-lg shadow-sm">
                    <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  AI RAG Strategic Insights
                </h3>

                {insights && (
                  <button
                    onClick={generateInsights}
                    className="text-sm px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-300 font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Phân tích lại
                  </button>
                )}
              </div>

              {!insights && !loading && (
                <div className="flex flex-col items-center justify-center h-[500px] text-center px-6">
                  {chromaHasData() ? (
                    // Có dữ liệu - hiển thị thông báo sẵn sàng phân tích
                    <>
                      <div className="mb-4 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 rounded-full blur-xl opacity-20"></div>
                        <svg className="w-16 h-16 text-purple-500 mx-auto mb-3 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm font-medium mb-3 border border-purple-200 dark:border-purple-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Data Ready
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        AI RAG Analysis
                      </h3>

                      <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md text-sm">
                        Powered by Retrieval-Augmented Generation (RAG) technology, combining Large Language Models with vector databases for intelligent business analysis and strategic insights.
                      </p>

                      <div className="flex flex-row items-center justify-center gap-8 w-full mb-4 flex-wrap">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                            <svg className="w-6 h-6 text-gray-800 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">LLM</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Large Language Models</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                            <svg className="w-6 h-6 text-gray-800 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">Vector DB</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">ChromaDB Storage</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                            <svg className="w-6 h-6 text-gray-800 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">RAG</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Retrieval-Augmented Generation</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                            <svg className="w-6 h-6 text-gray-800 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">AI Pipeline</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">End-to-End Processing</div>
                          </div>
                        </div>
                      </div>                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-500 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 px-3 py-2 rounded-lg border border-purple-100 dark:border-purple-800">
                          RAG + LLM + Vector Database - Công nghệ AI tiên tiến nhất
                        </p>
                      </div>
                    </>
                  ) : (
                    // Không có dữ liệu - hiển thị thông báo cần setup
                    <>
                      <div className="mb-4">
                        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full text-sm font-medium mb-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          Chưa có dữ liệu kinh doanh
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        AI Phân Tích Chưa Sẵn Sàng
                      </h3>

                      <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md text-sm">
                        Hệ thống cần dữ liệu kinh doanh để thực hiện phân tích AI thông minh.
                        Hãy import dữ liệu từ hệ thống quản lý để bắt đầu.
                      </p>

                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
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
                          {syncLoading ? 'Syncing...' : 'Sync Data'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center h-[500px]">
                  <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-violet-500 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-4 bg-white dark:bg-gray-800 rounded-full shadow-inner flex items-center justify-center">
                      <svg className="w-8 h-8 text-violet-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Đang Suy Luận...</h3>
                    <p className="text-gray-500 dark:text-gray-400">Đang truy xuất ngữ cảnh từ ChromaDB & phân tích số liệu</p>
                  </div>
                </div>
              )}

              {insights && !loading && (
                <div className="animate-fade-in-up">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      h1: ({ children }) => (
                        <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-6 rounded-xl shadow-lg mb-8 text-white transform -rotate-1">
                          <h1 className="text-3xl font-extrabold tracking-tight">
                            {children}
                          </h1>
                        </div>
                      ),
                      h2: ({ children }) => (
                        <div className="flex items-center gap-3 mt-10 mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
                          <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                          </div>
                          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                            {children}
                          </h2>
                        </div>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xl font-semibold text-fuchsia-600 dark:text-fuchsia-400 mb-4 mt-6 flex items-center gap-2">
                          <span className="w-2 h-6 bg-fuchsia-500 rounded-full inline-block"></span>
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed text-base">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="mb-6 space-y-3">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-6 space-y-3 text-gray-700 dark:text-gray-300">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50 hover:border-violet-200 dark:hover:border-violet-700 transition-colors">
                          <span className="mt-1 text-violet-500 flex-shrink-0">●</span>
                          <span className="text-gray-700 dark:text-gray-300">{children}</span>
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-bold text-violet-700 dark:text-violet-300">
                          {children}
                        </strong>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-gradient-to-r from-violet-600 to-fuchsia-600">
                          {children}
                        </thead>
                      ),
                      th: ({ children }) => (
                        <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                          {children}
                        </th>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {children}
                        </tbody>
                      ),
                      tr: ({ children, className }) => (
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          {children}
                        </tr>
                      ),
                      td: ({ children }) => (
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {children}
                        </td>
                      ),
                      blockquote: ({ children }) => (
                        <div className="relative p-6 my-8 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border-l-4 border-indigo-500 shadow-sm">
                          <svg className="absolute top-4 left-4 w-6 h-6 text-indigo-200 dark:text-indigo-800 transform -scale-x-100" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21L14.017 18C14.017 16.8954 13.1216 16 12.017 16H9C9.00001 15 9.00001 15 9.00001 15C9.00001 10.5817 12.5817 7 17 7V5C11.4772 5 7 9.47715 7 15C7 15 7 15 7 15C7 18.3137 9.68629 21 13 21H14.017ZM21 21L21 18C21 16.8954 20.1046 16 19 16H15.9829C15.9829 15 15.9829 15 15.9829 15C15.9829 10.5817 19.5646 7 23.9829 7V5C18.4601 5 13.9829 9.47715 13.9829 15C13.9829 15 13.9829 15 13.9829 15C13.9829 18.3137 16.6692 21 19.9829 21H21Z" />
                          </svg>
                          <div className="relative z-10 pl-6 italic text-gray-700 dark:text-gray-300">
                            {children}
                          </div>
                        </div>
                      ),
                      hr: () => (
                        <hr className="my-10 border-t-2 border-gray-100 dark:border-gray-700/50" />
                      ),
                    }}
                  >
                    {insights}
                  </ReactMarkdown>
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
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${selectedProvider === 'Groq'
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
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${selectedProvider === 'Google'
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
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedModel === model.id
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

      {/* ChromaDB Data Modal */}
      {showChromaModal && chromaData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                ChromaDB Analytics Data - Chi Tiết
              </h2>
              <button
                onClick={() => setShowChromaModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {chromaData.total_collections}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Collections</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {Object.values(chromaData.collections).reduce((sum, col: any) => sum + (col.total_documents || 0), 0)}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">Total Documents</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {new Date(chromaData.timestamp).toLocaleString('vi-VN')}
                    </div>
                    <div className="text-sm text-purple-600 dark:text-purple-400">Timestamp</div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {Object.entries(chromaData.collections).map(([collectionName, collection]: [string, any]) => (
                  <div key={collectionName} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          {collectionName}
                        </h3>
                        <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                          {collection.total_documents || 0} documents
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {collection.metadata?.description || 'No description'}
                      </p>
                    </div>

                    <div className="p-4">
                      {collection.error ? (
                        <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded">
                          Error: {collection.error}
                        </div>
                      ) : collection.documents && collection.documents.length > 0 ? (
                        <div className="space-y-3">
                          {collection.documents.map((doc: any, index: number) => (
                            <div key={doc.id || index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-gray-900 dark:text-white">Document {index + 1}</h4>
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                                  ID: {doc.id}
                                </span>
                              </div>

                              <div className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Content:</label>
                                  <div className="mt-1 bg-gray-50 dark:bg-gray-900 p-3 rounded text-sm text-gray-900 dark:text-white font-mono max-h-32 overflow-y-auto">
                                    {doc.content || 'No content'}
                                  </div>
                                </div>

                                {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Metadata:</label>
                                    <div className="mt-1 bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm">
                                      <pre className="text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                                        {JSON.stringify(doc.metadata, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          Không có documents nào trong collection này
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
