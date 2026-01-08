'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { Trash2, RefreshCw, MessageSquare, Users, MessageCircle, Database, FileText, Layers, Settings, Plus, Search, Eye, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

interface ChatSession {
  session_id: string;
  user_id: string;
  message_count: number;
  created_at: string;
  last_activity: string;
}

interface UserChatHistory {
  user_id: string;
  total_sessions: number;
  total_messages: number;
  sessions: ChatSession[];
}

interface ChatStats {
  total_users: number;
  total_sessions: number;
  total_messages: number;
  active_sessions: number;
}

interface ChromaCollection {
  collection_name: string;
  document_count: number;
  status: string;
}

interface CollectionDocument {
  id: string;
  document: string;
  metadata: any;
}

interface ModalConfig {
  modal_name: string;
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  timestamp: string;
  is_active: boolean;
}

interface SyncConfig {
  enabled: boolean;
  fields: string[];
  last_sync: string | null;
  sync_count: number;
}

interface SyncStats {
  total_syncs: number;
  last_webhook: string | null;
  tables: Record<string, {
    count: number;
    last_sync: string | null;
  }>;
}

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:5000';

export default function AIAgentChatManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserChatHistory[]>([]);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'redis' | 'chroma' | 'modal-config' | 'sync'>('redis');
  const [chromaCollections, setChromaCollections] = useState<ChromaCollection[]>([]);
  const [syncConfigs, setSyncConfigs] = useState<Record<string, SyncConfig>>({});
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [loadingSync, setLoadingSync] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'session' | 'user' | 'all', userId?: string, sessionId?: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [collectionDocuments, setCollectionDocuments] = useState<CollectionDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [modalConfigs, setModalConfigs] = useState<ModalConfig[]>([]);
  const [loadingModalConfigs, setLoadingModalConfigs] = useState(false);
  const [showModalConfigForm, setShowModalConfigForm] = useState(false);
  const [selectedModalConfig, setSelectedModalConfig] = useState<ModalConfig | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [autoSyncCountdown, setAutoSyncCountdown] = useState<number>(0);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const { showToast } = useToast();
  const checkAuth = async () => {
    try {
      const userDataStr = typeof window !== 'undefined' ? localStorage.getItem('userData') : null;
      if (!userDataStr) {
        router.push('/login');
        return;
      }
      const user = JSON.parse(userDataStr);
      setUserData(user);
      if (user.role !== 'ADMIN') {
        router.push('/');
        return;
      }
      setIsAuthorized(true);
      loadChatStats();
      loadAllUsers();
      loadChromaCollections();
      loadModalConfigs();
      loadAvailableModels();
      loadSyncConfigs();
      loadSyncStats();
    } catch (error) {
      console.error('Error checking auth:', error);
      router.push('/login');
    }
  };

  useEffect(() => {
    checkAuth();
  }, [router]);

  const loadChatStats = async () => {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/admin/chat-stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${AI_SERVICE_URL}/api/admin/users-chat-history`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChatStats();
    await loadAllUsers();
    await loadChromaCollections();
    await loadSyncConfigs();
    await loadSyncStats();
    setRefreshing(false);
  };

  const loadSyncConfigs = async () => {
    try {
      setLoadingSync(true);
      const response = await fetch(`${AI_SERVICE_URL}/api/sync/configs`);
      if (response.ok) {
        const data = await response.json();
        setSyncConfigs(data);
      }
    } catch (error) {
      console.error('Error loading sync configs:', error);
    } finally {
      setLoadingSync(false);
    }
  };

  const loadSyncStats = async () => {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/sync/stats`);
      if (response.ok) {
        const data = await response.json();
        setSyncStats(data);
      }
    } catch (error) {
      console.error('Error loading sync stats:', error);
    }
  };

  const updateSyncConfig = async (table: string, config: Partial<SyncConfig>) => {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/sync/configs/${table}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (response.ok) {
        showToast(`Đã cập nhật cấu hình cho ${table}`, 'success');
        loadSyncConfigs();
      } else {
        showToast('Lỗi khi cập nhật cấu hình', 'error');
      }
    } catch (error) {
      console.error('Error updating sync config:', error);
      showToast('Lỗi kết nối', 'error');
    }
  };

  const handleManualSync = async (table: string) => {
    try {
      showToast(`Đang bắt đầu đồng bộ thủ công cho ${table}...`, 'info');
      const response = await fetch(`${AI_SERVICE_URL}/api/sync/manual-sync/${table}`, {
        method: 'POST'
      });
      if (response.ok) {
        showToast(`Đồng bộ thành công cho ${table}`, 'success');
        loadSyncStats();
        loadSyncConfigs();
      } else {
        showToast('Lỗi khi đồng bộ thủ công', 'error');
      }
    } catch (error) {
      console.error('Error manual syncing:', error);
      showToast('Lỗi kết nối', 'error');
    }
  };

  const handleDeleteSession = async (userId: string, sessionId: string) => {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/admin/user/${userId}/session/${sessionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUsers(prev => prev.map(u =>
          u.user_id === userId
            ? {
              ...u,
              sessions: u.sessions.filter(s => s.session_id !== sessionId),
              total_sessions: u.total_sessions - 1,
              total_messages: u.total_messages - (u.sessions.find(s => s.session_id === sessionId)?.message_count || 0)
            }
            : u
        ));
        setShowDeleteConfirm(null);
        loadChatStats();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const handleClearAllData = async () => {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/admin/clear-all-chat-data`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUsers([]);
        setShowDeleteConfirm(null);
        loadChatStats();
        showToast('Đã xóa toàn bộ dữ liệu chat', 'success');
      } else {
        showToast('Lỗi khi xóa dữ liệu', 'error');
      }
    } catch (error) {
      console.error('Error clearing all data:', error);
      showToast('Lỗi kết nối khi xóa dữ liệu', 'error');
    }
  };

  const handleDeleteUserData = async (userId: string) => {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/admin/user/${userId}/sessions`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUsers(prev => prev.filter(u => u.user_id !== userId));
        setShowDeleteConfirm(null);
        loadChatStats();
      }
    } catch (error) {
      console.error('Error deleting user data:', error);
    }
  };

  const handleDeleteModalConfig = async (modalName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa modal config "${modalName}"?`)) return;

    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/admin/modal-config/${modalName}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadModalConfigs();
        showToast('Modal config đã được xóa thành công!', 'success');
      } else {
        showToast('Lỗi khi xóa modal config', 'error');
      }
    } catch (error) {
      console.error('Error deleting modal config:', error);
      showToast('Lỗi khi xóa modal config', 'error');
    }
  };

  const loadChromaCollections = async () => {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/admin/chroma-collections`);
      if (response.ok) {
        const data = await response.json();
        setChromaCollections(data.collections || []);
      }
    } catch (error) {
      console.error('Error loading Chroma collections:', error);
    }
  };

  const loadModalConfigs = async () => {
    console.log('Loading modal configs...');
    setLoadingModalConfigs(true);
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/admin/modal-config/all`);
      console.log('Load configs response status:', response.status);
      const data = await response.json();
      console.log('Load configs data:', data);
      setModalConfigs(data.data || []);
    } catch (error) {
      console.error('Error loading modal configs:', error);
    } finally {
      setLoadingModalConfigs(false);
    }
  };

  // Auto Sync Toggle - Continuous sync every 30s
  const toggleAutoSync = () => {
    setIsAutoSyncing(!isAutoSyncing);
    if (!isAutoSyncing) {
      setAutoSyncCountdown(30);
      showToast("Tự động đồng bộ mỗi 30 giây", "success");
    } else {
      setAutoSyncCountdown(0);
      showToast('Đã dừng tự động đồng bộ', 'info');
    }
  };

  // Continuous sync effect
  useEffect(() => {
    if (!isAutoSyncing) return;

    const intervalId = setInterval(async () => {
      setAutoSyncCountdown(prev => {
        if (prev <= 1) {
          (async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
              showToast('Không tìm thấy token admin', 'error');
              setIsAutoSyncing(false);
              return;
            }

            try {
              const res = await fetch(`${AI_SERVICE_URL}/api/admin/sync-system-data?authorization=${encodeURIComponent(token)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              if (res.ok) {
                const data = await res.json();
                showToast(`Đồng bộ tự động: Sync thành công ${data.total_documents || 0} documents`, 'success');
                loadChromaCollections();
              }
            } catch (e) {
              console.error(e);
            }
          })();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isAutoSyncing]);


  const loadAvailableModels = async () => {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/admin/modal-config/models`);
      if (response.ok) {
        const data = await response.json();
        setAvailableModels(data.models || []);
      }
    } catch (error) {
      console.error('Error loading available models:', error);
    }
  };



  const handleClearChromaCollection = async (collectionName: string) => {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/admin/chroma/collection/${collectionName}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadChromaCollections();
        if (selectedCollection === collectionName) {
          setSelectedCollection(null);
          setCollectionDocuments([]);
        }
      }
    } catch (error) {
      console.error('Error clearing collection:', error);
    }
  };

  const handleViewCollectionDetails = async (collectionName: string) => {
    try {
      setLoadingDocuments(true);
      setSelectedCollection(collectionName);

      const response = await fetch(`${AI_SERVICE_URL}/api/admin/chroma/collection/${collectionName}/details?limit=100`);

      if (response.ok) {
        const data = await response.json();
        setCollectionDocuments(data.documents || []);
      } else {
        console.error('Error loading collection details');
        setCollectionDocuments([]);
      }
    } catch (error) {
      console.error('Error viewing collection:', error);
      setCollectionDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handlePopulateTestData = async () => {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/admin/test-data/populate`, {
        method: 'POST'
      });

      if (response.ok) {
        loadAllUsers();
        loadChatStats();
      }
    } catch (error) {
      console.error('Error populating test data:', error);
    }
  };

  const handlePopulateChromaTestData = async () => {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/admin/test-data/populate-chroma`, {
        method: 'POST'
      });

      if (response.ok) {
        loadChromaCollections();
      }
    } catch (error) {
      console.error('Error populating Chroma test data:', error);
    }
  };

  const handleSyncSystemData = async () => {
    try {
      setRefreshing(true);

      // Lấy token từ localStorage (key là 'authToken' không phải 'token')
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) {
        showToast('Vui lòng đăng nhập lại', 'error');
        router.push('/login');
        return;
      }

      const response = await fetch(`${AI_SERVICE_URL}/api/admin/sync-system-data?authorization=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        showToast(`Đồng bộ thành công! Dữ liệu: ${result.synced_data?.users || 0} users, ${result.synced_data?.products || 0} products, ${result.synced_data?.categories || 0} categories, ${result.synced_data?.discounts || 0} discounts. Tổng: ${result.total_documents || 0} documents`, 'success');
        loadChromaCollections();
      } else {
        const error = await response.json();
        showToast(error.message || 'Lỗi đồng bộ không xác định', 'error');
        if (response.status === 401) {
          router.push('/login');
        }
      }
    } catch (error) {
      console.error('Error syncing system data:', error);
      showToast(error instanceof Error ? error.message : 'Lỗi kết nối không xác định', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Bạn không có quyền truy cập trang này</p>
      </div>
    );
  }

  return (
    <AdminLayout userData={userData} currentPage="ai-agent-chat">
      <main className="container mx-auto px-4 py-8">
        {/* Header with refresh button */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Quản Lý Chat Agent</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>

        {/* Stats Cards - Enhanced */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users Card */}
          <div className="group relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Users size={24} className="text-white" />
                </div>
                <div className="text-white/80 text-sm font-medium">+12%</div>
              </div>
              <div>
                <p className="text-white/90 text-sm font-medium mb-1">Tổng người dùng</p>
                <p className="text-4xl font-bold text-white">{stats?.total_users || 0}</p>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 opacity-10">
              <Users size={120} className="text-white" />
            </div>
          </div>

          {/* Total Sessions Card */}
          <div className="group relative bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <MessageCircle size={24} className="text-white" />
                </div>
                <div className="text-white/80 text-sm font-medium">+8%</div>
              </div>
              <div>
                <p className="text-white/90 text-sm font-medium mb-1">Tổng phiên làm việc</p>
                <p className="text-4xl font-bold text-white">{stats?.total_sessions || 0}</p>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 opacity-10">
              <MessageCircle size={120} className="text-white" />
            </div>
          </div>

          {/* Total Messages Card */}
          <div className="group relative bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <MessageSquare size={24} className="text-white" />
                </div>
                <div className="text-white/80 text-sm font-medium">+24%</div>
              </div>
              <div>
                <p className="text-white/90 text-sm font-medium mb-1">Tổng tin nhắn</p>
                <p className="text-4xl font-bold text-white">{stats?.total_messages || 0}</p>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 opacity-10">
              <MessageSquare size={120} className="text-white" />
            </div>
          </div>

          {/* Active Sessions Card */}
          <div className="group relative bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Database size={24} className="text-white" />
                </div>
                <div className="text-white/80 text-sm font-medium">Live</div>
              </div>
              <div>
                <p className="text-white/90 text-sm font-medium mb-1">Phiên hoạt động</p>
                <p className="text-4xl font-bold text-white">{stats?.active_sessions || 0}</p>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 opacity-10">
              <Database size={120} className="text-white" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('redis')}
              className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'redis'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
                }`}
            >
              <MessageCircle size={18} className="inline-block mr-2" />
              Lịch Sử Chat (Redis)
            </button>
            <button
              onClick={() => setActiveTab('chroma')}
              className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'chroma'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
                }`}
            >
              <Layers size={18} className="inline-block mr-2" />
              Chroma Collections
            </button>
            <button
              onClick={() => setActiveTab('modal-config')}
              className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'modal-config'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
                }`}
            >
              <Settings size={18} className="inline-block mr-2" />
              Cấu Hình Modal AI
            </button>
            <button
              onClick={() => setActiveTab('sync')}
              className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'sync'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
                }`}
            >
              <RefreshCw size={18} className="inline-block mr-2" />
              MySQL Sync (Real-time)
            </button>
          </div>
        </div>

        {/* Redis Tab */}
        {activeTab === 'redis' && (
          <div className="space-y-6">
            {/* Search and Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo ID người dùng..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <button
                  onClick={handlePopulateTestData}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  <Plus size={18} className="mr-2" />
                  Tạo dữ liệu test
                </button>
                <button
                  onClick={() => setShowDeleteConfirm({ type: 'all' })}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  <Trash2 size={18} className="mr-2" />
                  Xóa tất cả
                </button>
              </div>
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Tìm thấy <span className="font-semibold text-blue-600">{filteredUsers.length}</span> người dùng
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID Người Dùng</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phiên</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tin Nhắn</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers.map((user) => (
                      <tr key={user.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{user.user_id}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{user.total_sessions}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{user.total_messages}</td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => setSelectedUser(selectedUser === user.user_id ? null : user.user_id)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium mr-4"
                          >
                            {selectedUser === user.user_id ? '▼' : '▶'} Chi tiết
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm({ type: 'user', userId: user.user_id })}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                          >
                            <Trash2 size={16} className="inline-block mr-1" />
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && (
                <div className="px-6 py-16 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center">
                      <MessageSquare size={40} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Chưa có dữ liệu chat
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                      Hệ thống chưa có lịch sử chat nào. Hãy tạo dữ liệu test để bắt đầu khám phá tính năng quản lý chat.
                    </p>
                    <button
                      onClick={handlePopulateTestData}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Tạo dữ liệu test ngay
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sessions Detail */}
            {selectedUser && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  Phiên làm việc của {selectedUser}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {users.find(u => u.user_id === selectedUser)?.sessions.map((session) => (
                    <div key={session.session_id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">{session.session_id}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{session.message_count} tin nhắn</p>
                        </div>
                        <button
                          onClick={() => setShowDeleteConfirm({ type: 'session', userId: selectedUser, sessionId: session.session_id })}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chroma Tab */}
        {activeTab === 'chroma' && (
          <div className="space-y-6">
            {/* Search and Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <button
                  onClick={() => loadChromaCollections()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Làm mới
                </button>
                <button
                  onClick={handleSyncSystemData}
                  disabled={refreshing || isAutoSyncing}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Đồng bộ dữ liệu hệ thống
                </button>
                <button
                  onClick={toggleAutoSync}
                  disabled={refreshing}
                  className={`px-4 py-2 ${isAutoSyncing ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'} text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center shadow-md hover:shadow-lg transition-all`}
                >
                  {isAutoSyncing ? (
                    <>
                      <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="font-mono font-bold">{autoSyncCountdown}s</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Auto Sync (30s)
                    </>
                  )}
                </button>
                <button
                  onClick={handlePopulateChromaTestData}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium inline-flex items-center"
                >
                  <Plus size={16} className="mr-2" />
                  Thêm dữ liệu test
                </button>
              </div>
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Tổng <span className="font-semibold text-blue-600">{chromaCollections.length}</span> collections
              </div>
            </div>

            {/* Collections Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tên Collection</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tài Liệu</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Trạng Thái</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {chromaCollections.map((collection) => (
                      <tr key={collection.collection_name} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{collection.collection_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{collection.document_count}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded-full text-xs font-semibold">
                            {collection.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleViewCollectionDetails(collection.collection_name)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium mr-4"
                          >
                            <Eye size={16} className="inline-block mr-1" />
                            Xem
                          </button>
                          <button
                            onClick={() => handleClearChromaCollection(collection.collection_name)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                          >
                            <Trash2 size={16} className="inline-block mr-1" />
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {chromaCollections.length === 0 && (
                <div className="px-6 py-16 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-full flex items-center justify-center">
                      <Database size={40} className="text-purple-500 dark:text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Chưa có Chroma Collections
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                      Vector database chưa có collections nào. Đồng bộ dữ liệu từ hệ thống để tạo collections cho AI Agent.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSyncSystemData}
                        disabled={refreshing || isAutoSyncing}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {refreshing ? (
                          <>
                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Đang đồng bộ...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Đồng bộ dữ liệu ngay
                          </>
                        )}
                      </button>

                      {/* Auto Sync Button with 30s countdown */}
                      <button
                        onClick={toggleAutoSync}
                        disabled={isAutoSyncing || refreshing}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAutoSyncing ? (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" strokeWidth={2} className="opacity-25" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                            </svg>
                            <span className="font-mono font-bold">{autoSyncCountdown}s</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Auto Sync (30s)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Collection Details Panel */}
            {selectedCollection && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Chi tiết Collection: <span className="text-blue-600">{selectedCollection}</span>
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedCollection(null);
                      setCollectionDocuments([]);
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕ Đóng
                  </button>
                </div>

                {loadingDocuments ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Đang tải...</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {collectionDocuments.length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        Collection trống
                      </p>
                    ) : (
                      collectionDocuments.map((doc, index) => (
                        <div key={doc.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {doc.id}
                            </span>
                            <span className="text-xs text-gray-400">#{index + 1}</span>
                          </div>
                          <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
                            {doc.document}
                          </div>
                          {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-semibold">Metadata:</span>
                              <pre className="mt-1 bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                                {JSON.stringify(doc.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
                  Tổng: <span className="font-semibold text-blue-600">{collectionDocuments.length}</span> documents
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Config Tab */}
        {activeTab === 'modal-config' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Cấu Hình Modal AI</h2>
                <button
                  onClick={() => {
                    setSelectedModalConfig(null);
                    setShowModalConfigForm(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  ➕ Thêm Modal
                </button>
              </div>

              {loadingModalConfigs ? (
                <div className="text-center py-8">
                  <RefreshCw className="animate-spin h-8 w-8 mx-auto text-blue-600" />
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Đang tải...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {modalConfigs.map((config) => (
                    <div key={config.modal_name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-white">{config.modal_name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Cập nhật: {new Date(config.timestamp).toLocaleString('vi-VN')}
                          </p>
                          {config.is_active && (
                            <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Đang hoạt động
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedModalConfig(config);
                              setShowModalConfigForm(true);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            Chỉnh sửa
                          </button>
                          <button
                            onClick={() => handleDeleteModalConfig(config.modal_name)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="text-sm">
                          <span className="font-medium text-gray-600 dark:text-gray-400">Model:</span>
                          <span className="ml-2 text-gray-800 dark:text-white">{config.model || 'N/A'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-gray-600 dark:text-gray-400">Temperature:</span>
                          <span className="ml-2 text-gray-800 dark:text-white">{config.temperature || 'N/A'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-gray-600 dark:text-gray-400">Max Tokens:</span>
                          <span className="ml-2 text-gray-800 dark:text-white">{config.max_tokens || 'N/A'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-gray-600 dark:text-gray-400">System Prompt:</span>
                          <p className="ml-2 mt-1 text-gray-700 dark:text-gray-300 text-xs italic">
                            {config.system_prompt ? `${config.system_prompt.substring(0, 100)}...` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {modalConfigs.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Chưa có modal nào được cấu hình
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sync Management Tab */}
        {activeTab === 'sync' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">Real-time MySQL Synchronization</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Quản lý đồng bộ dữ liệu tức thời từ MySQL sang ChromaDB (Chat AI)</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { loadSyncConfigs(); loadSyncStats(); }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    <RefreshCw size={18} className="mr-2" />
                    Làm mới
                  </button>
                </div>
              </div>

              {/* Sync Stats Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                  <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Tổng lượt Sync</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{syncStats?.total_syncs || 0}</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                  <p className="text-sm text-green-600 dark:text-green-400 mb-1">Webhook cuối cùng</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">
                    {syncStats?.last_webhook ? new Date(syncStats.last_webhook).toLocaleString('vi-VN') : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                  <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Trạng thái Webhook</p>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-lg font-bold text-gray-800 dark:text-white">Đang chờ...</p>
                  </div>
                </div>
              </div>

              {/* Sync Table List */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tên Bảng</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Trạng Thái</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Lần cuối</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {Object.entries(syncConfigs).map(([table, config]) => (
                      <tr key={table} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-800 dark:text-white uppercase">{table}</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {config.fields.map(field => (
                              <span key={field} className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1 rounded">
                                {field}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.enabled}
                              onChange={(e) => updateSyncConfig(table, { enabled: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                              {config.enabled ? 'Đang bật' : 'Đã tắt'}
                            </span>
                          </label>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {config.last_sync ? new Date(config.last_sync).toLocaleString('vi-VN') : 'Chưa đồng bộ'}
                          <div className="text-xs text-blue-600 font-medium">Count: {config.sync_count}</div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleManualSync(table)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
                          >
                            <RefreshCw size={14} />
                            Sync ngay
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}



        {/* Modal Config Form */}
        {showModalConfigForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                {selectedModalConfig ? 'Chỉnh sửa Modal Config' : 'Thêm Modal Config'}
              </h3>

              <ModalConfigForm
                initialData={selectedModalConfig}
                availableModels={availableModels}
                onSave={async (data) => {
                  try {
                    console.log('Saving modal config:', data);
                    const response = await fetch(`${AI_SERVICE_URL}/api/admin/modal-config`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(data),
                    });

                    console.log('Save response status:', response.status);
                    const responseData = await response.json();
                    console.log('Save response data:', responseData);

                    if (response.ok) {
                      console.log('Save successful, reloading configs...');
                      await loadModalConfigs();
                      setShowModalConfigForm(false);
                      showToast('Modal config đã được lưu thành công!', 'success');
                    } else {
                      console.error('Save failed:', responseData);
                      showToast('Lỗi khi lưu modal config: ' + (responseData.message || 'Unknown error'), 'error');
                    }
                  } catch (error) {
                    console.error('Error saving modal config:', error);
                    showToast('Lỗi khi lưu modal config: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
                  }
                }}
                onCancel={() => setShowModalConfigForm(false)}
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm mx-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                {showDeleteConfirm.type === 'all' && 'Xóa tất cả dữ liệu?'}
                {showDeleteConfirm.type === 'user' && `Xóa tất cả dữ liệu của ${showDeleteConfirm.userId}?`}
                {showDeleteConfirm.type === 'session' && `Xóa phiên ${showDeleteConfirm.sessionId}?`}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {showDeleteConfirm.type === 'all' && (
                  <div className="flex items-start gap-2">
                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <span>Hành động này không thể hoàn tác. Tất cả dữ liệu chat sẽ bị xóa vĩnh viễn.</span>
                  </div>
                )}
                {showDeleteConfirm.type === 'user' && 'Tất cả tin nhắn và phiên của người dùng này sẽ bị xóa.'}
                {showDeleteConfirm.type === 'session' && 'Tất cả tin nhắn trong phiên này sẽ bị xóa.'}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (showDeleteConfirm.type === 'all') {
                      handleClearAllData();
                    } else if (showDeleteConfirm.type === 'user' && showDeleteConfirm.userId) {
                      handleDeleteUserData(showDeleteConfirm.userId);
                    } else if (showDeleteConfirm.type === 'session' && showDeleteConfirm.userId && showDeleteConfirm.sessionId) {
                      handleDeleteSession(showDeleteConfirm.userId, showDeleteConfirm.sessionId);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}

interface ModalConfigFormProps {
  initialData: ModalConfig | null;
  availableModels: string[];
  onSave: (data: { modal_name: string; modal_config: any }) => void;
  onCancel: () => void;
}

function ModalConfigForm({ initialData, availableModels, onSave, onCancel }: ModalConfigFormProps) {
  const [modalName, setModalName] = useState(initialData?.modal_name || '');
  const [selectedModel, setSelectedModel] = useState(initialData?.config?.model || '');
  const [temperature, setTemperature] = useState(initialData?.config?.temperature || 0.7);
  const [maxTokens, setMaxTokens] = useState(initialData?.config?.max_tokens || 1000);
  const [systemPrompt, setSystemPrompt] = useState(
    initialData?.config?.system_prompt ||
    "Bạn là trợ lý AI hữu ích cho một trang web thương mại điện tử. Hãy trả lời một cách thân thiện, chuyên nghiệp và hữu ích."
  );
  const [isActive, setIsActive] = useState(initialData?.is_active || false);

  const handleSave = () => {
    const config = {
      model: selectedModel,
      temperature: temperature,
      max_tokens: maxTokens,
      system_prompt: systemPrompt,
      is_active: isActive
    };

    onSave({
      modal_name: modalName,
      modal_config: config
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tên Cấu Hình Modal
        </label>
        <input
          type="text"
          value={modalName}
          onChange={(e) => setModalName(e.target.value)}
          placeholder="Ví dụ: GPT-4 Standard, Claude Fast, etc."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Chọn Model AI
        </label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">-- Chọn model --</option>
          {availableModels.map((model) => (
            <option key={model} value={model}>
              {model.split('/')[1] || model}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Temperature (0.0 - 2.0)
          </label>
          <input
            type="number"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Max Tokens
          </label>
          <input
            type="number"
            min="1"
            max="4000"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          System Prompt
        </label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="Nhập system prompt để hướng dẫn AI..."
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Đặt làm modal hoạt động (chỉ có 1 modal active tại 1 thời điểm)
        </label>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 font-medium"
        >
          Hủy
        </button>
        <button
          onClick={handleSave}
          disabled={!modalName.trim() || !selectedModel}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          Lưu
        </button>
      </div>
    </div>
  );
}
