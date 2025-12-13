'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

// Python AI Service URL
const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://113.178.203.147:5000';

interface RAGPrompt {
  id: string;
  prompt: string;
  category: string;
  tags: string[];
  metadata: Record<string, any>;
}

interface ChatStats {
  total_messages: number;
  total_sessions: number;
  total_users: number;
  collection_name: string;
}

interface RAGStats {
  total_prompts: number;
  categories: Record<string, number>;
  collection_name: string;
}

interface ServiceHealth {
  status: string;
  message: string;
}

interface AIModel {
  id: string;
  name: string;
  description: string;
  speed: string;
  quality: string;
}

interface GeminiModel {
  name: string;
  display_name: string;
  supported_methods: string[];
}

interface AIConfig {
  default_model: string;
  allow_user_change: boolean;
  max_tokens: number;
  temperature: number;
  available_models: AIModel[];
}

interface SystemAnalyticsData {
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
  dailyRevenue: number;
  totalDocuments: number;
  users: any[];
  products: any[];
  categories: any[];
  orders: any[];
  revenueByBusiness: any[];
  businessPerformance: any[];
  topSellingProducts: any[];
  lowStockProducts: any[];
  businessDocuments: any[];
}

export default function AIServicePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'prompts' | 'history' | 'collections' | 'settings' | 'rag-data'>('overview');
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth | null>(null);
  const [ragStats, setRagStats] = useState<RAGStats | null>(null);
  const [chatStats, setChatStats] = useState<ChatStats | null>(null);
  const [prompts, setPrompts] = useState<RAGPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  // AI Config state
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  
  // Gemini models state
  const [geminiModels, setGeminiModels] = useState<GeminiModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [testingModel, setTestingModel] = useState<string | null>(null);

  // AI Provider state
  const [aiProvider, setAiProvider] = useState<'gemini' | 'groq'>('gemini');
  const [groqModels, setGroqModels] = useState<any[]>([]);
  const [selectedGroqModel, setSelectedGroqModel] = useState<string>('llama-3.3-70b-versatile');
  const [modelTestResults, setModelTestResults] = useState<Record<string, 'success' | 'error' | 'testing'>>({});

  // Form states
  const [newPrompt, setNewPrompt] = useState({ prompt: '', category: 'general', tags: '' });
  const [editingPrompt, setEditingPrompt] = useState<RAGPrompt | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Collections state
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<any | null>(null);
  const [collectionData, setCollectionData] = useState<any>(null);
  const [loadingCollectionData, setLoadingCollectionData] = useState(false);
  const [deletingCollection, setDeletingCollection] = useState<string | null>(null);

  // Chat sessions state for admin
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // System analytics state for RAG
  const [systemAnalytics, setSystemAnalytics] = useState<SystemAnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
  
  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [showSuggestedPrompts, setShowSuggestedPrompts] = useState(false);

  // Test Chat state
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [useRag, setUseRag] = useState(true);
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
  const [testChatSessionId] = useState(`test-admin-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [availableModels, setAvailableModels] = useState<GeminiModel[]>([]);
  const [loadingChatModels, setLoadingChatModels] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    loadData();
    loadAvailableModels();
    loadUserPreference(); // Load user preference from database
    
    // Cleanup function to reset modal state when component unmounts
    return () => {
      setIsMounted(false);
      setShowSuggestedPrompts(false);
    };
  }, []);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Load user's AI provider preference (simplified for new architecture)
  const loadUserPreference = async () => {
    try {
      // For now, just set defaults since ai-config endpoints don't exist
      setAiProvider('gemini');
      setSelectedModel('gemini-2.5-flash');
    } catch (error) {
      console.error('Failed to load user preference:', error);
      // Set defaults
      setAiProvider('gemini');
      setSelectedModel('gemini-2.5-flash');
    }
  };

  // Auto load analytics when switching to rag-data tab
  useEffect(() => {
    if (activeTab === 'rag-data' && !systemAnalytics && !loadingAnalytics) {
      loadSystemAnalytics();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      // Check service health
      const healthRes = await fetch(`${AI_SERVICE_URL}/health`);
      if (healthRes.ok) {
        const health = await healthRes.json();
        setServiceHealth(health);
      } else {
        setServiceHealth({ status: 'unhealthy', message: 'Service không phản hồi' });
      }

      // Load Analytics stats (replaces old RAG stats)
      const analyticsStatsRes = await fetch(`${AI_SERVICE_URL}/api/analytics/stats`);
      if (analyticsStatsRes.ok) {
        const stats = await analyticsStatsRes.json();
        setRagStats({
          total_prompts: stats.total_business_data || 0,
          categories: stats.categories || {},
          collection_name: 'analytics'
        });
      }

      // Load Chat stats (customer chat stats)
      setChatStats({
        total_messages: 0, // Will be implemented later
        total_sessions: 0,
        total_users: 0,
        collection_name: 'customer_chat'
      });

      // Load prompts (business data instead of RAG prompts)
      const businessDataRes = await fetch(`${AI_SERVICE_URL}/api/analytics/data/all?limit=50`);
      if (businessDataRes.ok) {
        const data = await businessDataRes.json();
        // Transform business data to look like prompts
        const transformedPrompts = (data.data || []).map((item: any, index: number) => ({
          id: `business_${index}`,
          prompt: item.content || item.summary || 'Business data',
          category: item.data_type || 'business',
          tags: ['business', item.data_type || 'data'],
          metadata: item.metadata || {}
        }));
        setPrompts(transformedPrompts);
      }

      // Load collections (analytics collections instead of chroma collections)
      const collectionsRes = await fetch(`${AI_SERVICE_URL}/api/analytics/stats`);
      if (collectionsRes.ok) {
        const stats = await collectionsRes.json();
        setCollections([
          { name: 'business_data', count: stats.total_business_data || 0 },
          { name: 'orders_analytics', count: stats.total_orders || 0 },
          { name: 'trends', count: stats.total_trends || 0 }
        ]);
      }

      // Load AI config (use analytics models instead)
      const configRes = await fetch(`${AI_SERVICE_URL}/api/analytics/models`);
      if (configRes.ok) {
        const modelsData = await configRes.json();
        setAiConfig({ models: modelsData.models || [] });
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Không thể kết nối đến Python AI Service');
      setServiceHealth({ status: 'error', message: 'Không thể kết nối' });
    } finally {
      setLoading(false);
    }
  };

  // Load available AI models for chat
  const loadAvailableModels = async () => {
    setLoadingChatModels(true);
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/analytics/models`);
      if (response.ok) {
        const modelsData = await response.json();
        // Transform to GeminiModel format
        const models = (modelsData.models || []).map((model: string) => ({
          name: model,
          display_name: model,
          supported_methods: ['generateContent']
        }));
        setAvailableModels(models);

        // Set default model to first available if current selection not available
        if (models.length > 0 && !models.find((m: any) => m.name === selectedModel)) {
          setSelectedModel(models[0].name);
        }
      }
    } catch (err) {
      console.error('Error loading models:', err);
      // Fallback to default models if API fails
      setAvailableModels([
        { name: 'gemini-1.5-flash', display_name: 'Gemini 1.5 Flash', supported_methods: ['generateContent'] },
        { name: 'gemini-1.5-pro', display_name: 'Gemini 1.5 Pro', supported_methods: ['generateContent'] }
      ]);
    } finally {
      setLoadingChatModels(false);
    }
  };

  // Load Groq models (from analytics models endpoint)
  const loadGroqModels = async () => {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/analytics/models`);
      if (response.ok) {
        const modelsData = await response.json();
        // Filter for Groq models (those that don't start with 'gemini')
        const groqModelsList = (modelsData.models || []).filter((model: string) =>
          !model.toLowerCase().startsWith('gemini')
        );
        // Format display names for better readability
        const formattedModels = groqModelsList.map((model: string) => ({
          name: model,
          display_name: formatModelName(model),
          id: model
        }));
        setGroqModels(formattedModels);
      }
    } catch (err) {
      console.error('Error loading Groq models:', err);
    }
  };

  // Helper function to format model names
  const formatModelName = (name: string): string => {
    // Convert model ID to readable name
    const nameMap: Record<string, string> = {
      // Llama models
      'llama-3.3-70b-versatile': 'Llama 3.3 70B Versatile',
      'llama-3.1-70b-versatile': 'Llama 3.1 70B Versatile',
      'llama-3.1-8b-instant': 'Llama 3.1 8B Instant',
      'llama3-70b-8192': 'Llama 3 70B',
      'llama3-8b-8192': 'Llama 3 8B',
      'meta-llama/llama-4-scout-17b-16e-instruct': 'Llama 4 Scout 17B',
      'meta-llama/llama-4-maverick-17b-128e-instruct': 'Llama 4 Maverick 17B',
      
      // Mixtral
      'mixtral-8x7b-32768': 'Mixtral 8x7B',
      
      // Gemma
      'gemma-7b-it': 'Gemma 7B IT',
      'gemma2-9b-it': 'Gemma 2 9B IT',
      
      // Other providers
      'openai/gpt-oss-120b': 'GPT OSS 120B',
      'openai/gpt-oss-20b': 'GPT OSS 20B',
      'moonshotai/kimi-k2-instruct-0905': 'Kimi K2 Instruct (0905)',
      'moonshotai/kimi-k2-instruct': 'Kimi K2 Instruct',
      'qwen/qwen3-32b': 'Qwen 3 32B',
      'groq/compound': 'Groq Compound',
      'groq/compound-mini': 'Groq Compound Mini',
      'allam-2-7b': 'Allam 2 7B',
    };
    
    // Return mapped name or format the original
    if (nameMap[name]) {
      return nameMap[name];
    }
    
    // Try to format unknown names
    const parts = name.split('/');
    const modelName = parts[parts.length - 1];
    
    // Capitalize and format
    return modelName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Load saved AI provider preference
  useEffect(() => {
    const savedProvider = localStorage.getItem('ai_provider') as 'gemini' | 'groq' | null;
    if (savedProvider) {
      setAiProvider(savedProvider);
    }
    
    // Load saved Groq model
    const savedGroqModel = localStorage.getItem('selected_groq_model');
    if (savedGroqModel) {
      setSelectedGroqModel(savedGroqModel);
    }
    
    if (savedProvider === 'groq') {
      loadGroqModels();
    }
  }, []);

  // Handle provider change
  const handleProviderChange = async (provider: 'gemini' | 'groq') => {
    console.log('[Admin] 🔄 Provider change requested:', provider);
    console.log('[Admin] Current state - aiProvider:', aiProvider, 'selectedGroqModel:', selectedGroqModel, 'selectedModel:', selectedModel);
    
    setAiProvider(provider);
    
    // Save to database
    const userData = apiClient.getUserData();
    const userId = userData?.userId?.toString() || 'anonymous';

    const model = provider === 'groq' ? selectedGroqModel : selectedModel;

    console.log('[Admin] 💾 Saving preference:', { userId, provider, model });

    // Note: User preference saving is not implemented in the new separated architecture
    // Preferences are stored locally for now
    console.log('[Admin] ℹ️  User preferences stored locally (not saved to server in new architecture)');
    
    if (provider === 'groq') {
      await loadGroqModels();
    }
  };

  // Handle Groq model selection
  const handleGroqModelSelect = async (modelName: string) => {
    console.log('[Admin] 🎯 Groq model selected:', modelName);
    setSelectedGroqModel(modelName);
    
    // Also update provider to groq if not already
    if (aiProvider !== 'groq') {
      console.log('[Admin] 🔄 Auto-switching provider to groq');
      setAiProvider('groq');
    }
    
    // Save to database
    const userData = apiClient.getUserData();
    const userId = userData?.userId?.toString() || 'anonymous';
    
    console.log('[Admin] 💾 Saving Groq model preference:', { userId, provider: 'groq', model: modelName });
    
    console.log('[Admin] 💾 Saving Groq model preference:', { userId, modelName });

    // Note: User preference saving is not implemented in the new separated architecture
    console.log('[Admin] ℹ️  Groq model preference stored locally (not saved to server in new architecture)');
  };

  // Add new prompt
  const handleAddPrompt = async () => {
    if (!newPrompt.prompt.trim()) {
      alert('Vui lòng nhập nội dung prompt');
      return;
    }

    try {
      // Use analytics endpoint to store business data instead of RAG prompts
      const res = await fetch(`${AI_SERVICE_URL}/api/analytics/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_id: `prompt_${Date.now()}`,
          data_content: newPrompt.prompt,
          data_type: newPrompt.category,
          metadata: {
            tags: newPrompt.tags.split(',').map(t => t.trim()).filter(t => t),
            source: 'admin_prompt'
          }
        }),
      });

      if (res.ok) {
        setNewPrompt({ prompt: '', category: 'general', tags: '' });
        setShowAddForm(false);
        loadData();
      } else {
        alert('Không thể thêm prompt');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  // Create 5 sample prompts quickly
  const handleCreateSamplePrompts = async () => {
    if (!confirm('Tạo 5 prompts mẫu để hướng dẫn AI? Các prompts cũ sẽ không bị xóa.')) {
      return;
    }

    const samplePrompts = [
      {
        prompt: `Khi người dùng hỏi về sản phẩm (ví dụ: "có sản phẩm gì", "tìm điện thoại", "giá bao nhiêu"), hãy tìm kiếm trong collection "products" của ChromaDB. 

Các thông tin sản phẩm bao gồm:
- Tên sản phẩm, mô tả
- Giá bán (đơn vị VNĐ)
- Tồn kho, số lượng đã bán
- Danh mục, người bán
- Doanh thu

Luôn trả lời bằng tiếng Việt, thân thiện và đưa ra gợi ý phù hợp. Nếu không tìm thấy, hãy đề xuất sản phẩm tương tự hoặc hỏi thêm thông tin.`,
        category: 'product_search',
        tags: ['product', 'search', 'ecommerce']
      },
      {
        prompt: `Khi người dùng hỏi về đơn hàng (ví dụ: "đơn hàng của tôi", "kiểm tra đơn", "tình trạng giao hàng"), hãy tìm trong collection "orders".

Thông tin đơn hàng gồm:
- Mã đơn hàng, trạng thái (PENDING, CONFIRMED, PROCESSING, SHIPPING, DELIVERED, CANCELLED)
- Tên khách hàng, tổng tiền
- Danh sách sản phẩm trong đơn
- Ngày đặt hàng

Giải thích trạng thái đơn hàng rõ ràng và cập nhật thời gian giao hàng dự kiến nếu có thể.`,
        category: 'order_inquiry',
        tags: ['order', 'tracking', 'support']
      },
      {
        prompt: `Khi được hỏi về thống kê doanh nghiệp (ví dụ: "doanh thu", "bán được bao nhiêu", "top sản phẩm"), hãy sử dụng collection "business" và "system_stats".

Cung cấp thông tin:
- Tổng doanh thu (theo ngày/tuần/tháng)
- Số đơn hàng, giá trị trung bình
- Top sản phẩm bán chạy
- Hiệu suất từng doanh nghiệp

Trình bày số liệu một cách trực quan, dễ hiểu.`,
        category: 'business_analytics',
        tags: ['analytics', 'business', 'statistics']
      },
      {
        prompt: `Khi khách hàng hỏi về chính sách (ví dụ: "đổi trả", "bảo hành", "thanh toán", "giao hàng"), hãy:

1. Chính sách đổi trả: 7 ngày kể từ ngày nhận hàng, sản phẩm còn nguyên vẹn, có hóa đơn
2. Thanh toán: COD (thanh toán khi nhận hàng), chuyển khoản ngân hàng
3. Giao hàng: 2-5 ngày trong nội thành, 3-7 ngày ngoại thành
4. Bảo hành: Theo chính sách nhà sản xuất (thường 12-24 tháng)

Luôn lịch sự, hỗ trợ nhiệt tình và hỏi thêm thông tin nếu cần.`,
        category: 'customer_service',
        tags: ['policy', 'support', 'service']
      },
      {
        prompt: `Bạn là AI Agent hỗ trợ khách hàng của cửa hàng thương mại điện tử. Nhiệm vụ của bạn:

1. Tư vấn sản phẩm dựa trên dữ liệu thực tế trong ChromaDB
2. Hỗ trợ tra cứu đơn hàng, theo dõi giao hàng
3. Giải đáp chính sách mua hàng, đổi trả
4. Cung cấp thống kê cho admin/business khi được yêu cầu

Luôn sử dụng dữ liệu từ ChromaDB collections (products, orders, users, categories, business, system_stats) để trả lời chính xác.
Nếu không tìm thấy thông tin, hãy thông báo rõ ràng và đề xuất cách khác.

Giọng điệu: Thân thiện, chuyên nghiệp, hữu ích.`,
        category: 'general',
        tags: ['guidance', 'role', 'instructions']
      }
    ];

    try {
      let successCount = 0;
      for (const promptData of samplePrompts) {
        const res = await fetch(`${AI_SERVICE_URL}/rag/prompts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(promptData),
        });
        if (res.ok) successCount++;
      }

      if (successCount > 0) {
        alert(`Đã tạo ${successCount}/5 prompts mẫu thành công!`);
        loadData();
      } else {
        alert('Không thể tạo prompts mẫu');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  // Update prompt
  const handleUpdatePrompt = async () => {
    if (!editingPrompt) return;

    try {
      const res = await fetch(`${AI_SERVICE_URL}/rag/prompts/${editingPrompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editingPrompt.prompt,
          category: editingPrompt.category,
          tags: editingPrompt.tags,
        }),
      });

      if (res.ok) {
        setEditingPrompt(null);
        loadData();
      } else {
        alert('Không thể cập nhật prompt');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  // Delete prompt
  const handleDeletePrompt = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa prompt này?')) return;

    try {
      const res = await fetch(`${AI_SERVICE_URL}/rag/prompts/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadData();
      } else {
        alert('Không thể xóa prompt');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  // Delete all prompts in category
  const handleDeleteCategory = async (category: string) => {
    if (!confirm(`Xóa tất cả prompts trong danh mục "${category}"?`)) return;

    try {
      const res = await fetch(`${AI_SERVICE_URL}/rag/prompts?category=${category}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadData();
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  // Update AI config (not implemented in new architecture)
  const handleUpdateConfig = async (updates: Partial<AIConfig>) => {
    setSavingConfig(true);
    try {
      // Note: Config updates are not implemented in the new separated architecture
      console.log('[Admin] ℹ️  Config updates not available in new architecture:', updates);
      alert('Cập nhật cấu hình không khả dụng trong kiến trúc mới!');
    } catch (err) {
      alert('Lỗi kết nối');
    } finally {
      setSavingConfig(false);
    }
  };

  // Load Gemini models from Google API (on-demand)
  const handleLoadGeminiModels = async () => {
    setLoadingModels(true);
    setGeminiModels([]);
    setModelTestResults({});
    
    try {
      const res = await fetch(`${AI_SERVICE_URL}/gemini/models`);
      if (res.ok) {
        const models = await res.json();
        setGeminiModels(models);
        setModelsLoaded(true);
      } else {
        alert('Không thể tải danh sách models từ Google');
      }
    } catch (err) {
      alert('Lỗi kết nối đến API');
    } finally {
      setLoadingModels(false);
    }
  };

  // Test a specific model
  const handleTestModel = async (modelName: string) => {
    setTestingModel(modelName);
    setModelTestResults(prev => ({ ...prev, [modelName]: 'testing' }));
    
    try {
      const res = await fetch(`${AI_SERVICE_URL}/gemini/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello, test connection',
          model: modelName,
        }),
      });

      if (res.ok) {
        setModelTestResults(prev => ({ ...prev, [modelName]: 'success' }));
      } else {
        setModelTestResults(prev => ({ ...prev, [modelName]: 'error' }));
      }
    } catch (err) {
      setModelTestResults(prev => ({ ...prev, [modelName]: 'error' }));
    } finally {
      setTestingModel(null);
    }
  };

  // Load all chat sessions
  const handleLoadChatSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch(`${AI_SERVICE_URL}/chat-history/all-sessions`);
      if (res.ok) {
        const data = await res.json();
        setChatSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Load session messages
  const handleViewSession = async (session: any) => {
    setSelectedSession(session);
    setLoadingMessages(true);
    try {
      const res = await fetch(`${AI_SERVICE_URL}/chat-history/sessions/${session.session_id}`);
      if (res.ok) {
        const data = await res.json();
        setSessionMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Bạn có chắc muốn xóa phiên chat này?')) return;
    
    try {
      const res = await fetch(`${AI_SERVICE_URL}/chat-history/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setChatSessions(prev => prev.filter(s => s.session_id !== sessionId));
        if (selectedSession?.session_id === sessionId) {
          setSelectedSession(null);
          setSessionMessages([]);
        }
        loadData(); // Refresh stats
      } else {
        alert('Không thể xóa phiên chat');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  // Reset AI config
  const handleResetConfig = async () => {
    if (!confirm('Đặt lại cấu hình về mặc định?')) return;
    
    setSavingConfig(true);
    try {
      // Note: Config reset is not implemented in the new separated architecture
      console.log('[Admin] ℹ️  Config reset not available in new architecture');
      alert('Đặt lại cấu hình không khả dụng trong kiến trúc mới!');
    } catch (err) {
      alert('Lỗi kết nối');
    } finally {
      setSavingConfig(false);
    }
  };

  // Load system analytics for RAG
  const loadSystemAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const token = apiClient.getAuthToken();
      const SPRING_API = process.env.NEXT_PUBLIC_API_URL || 'http://113.178.203.147:8089/api/v1';
      const res = await fetch(`${SPRING_API}/admin/analytics/system-data`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSystemAnalytics(data);
      } else {
        console.error('Failed to load analytics:', res.status);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Sync data from Spring to ChromaDB
  const handleSyncData = async () => {
    if (!systemAnalytics) {
      alert('Vui lòng tải dữ liệu analytics trước');
      return;
    }

    setSyncing(true);
    setSyncStatus('syncing');
    setSyncProgress('Đang chuẩn bị đồng bộ...');

    try {
      // Step 1: Sync Products to 'products' collection (with images)
      setSyncProgress('Đang đồng bộ sản phẩm vào collection "products"...');
      const productDocs = systemAnalytics.products?.map((p: any) => {
        const imageUrlsArray = p.imageUrls ? JSON.parse(p.imageUrls) : [];
        const firstImageUrl = imageUrlsArray[0] || '';
        return `Sản phẩm ID ${p.id}: ${p.name}. Giá: ${(p.price / 1000).toFixed(0)}K VNĐ. ${p.description}. Danh mục: ${p.categoryName}. Người bán: ${p.sellerUsername}. Tồn kho: ${p.quantity}. Đã bán: ${p.totalSold || 0}. Doanh thu: ${(p.totalRevenue / 1000000).toFixed(2)}M VNĐ. Trạng thái: ${p.status}.${firstImageUrl ? ` Hình ảnh: ${firstImageUrl}` : ''}`;
      }) || [];

      const productMetas = systemAnalytics.products?.map((p: any) => ({
        id: p.id.toString(),
        name: p.name,
        price: p.price,
        category: p.categoryName,
        seller: p.sellerUsername,
        quantity: p.quantity,
        totalSold: p.totalSold || 0,
        imageUrls: p.imageUrls || '[]',
        type: 'product'
      })) || [];

      if (productDocs.length > 0) {
        // Use new analytics endpoint instead of chroma
        for (const product of systemAnalytics.products || []) {
          await fetch(`${AI_SERVICE_URL}/api/analytics/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data_id: `product_${product.id}`,
              data_content: `Sản phẩm: ${product.name}. Giá: ${product.price} VNĐ. Danh mục: ${product.categoryName}. Người bán: ${product.sellerUsername}. Số lượng: ${product.quantity}. Đã bán: ${product.totalSold || 0}`,
              data_type: 'product',
              metadata: {
                product_id: product.id,
                name: product.name,
                price: product.price,
                category: product.categoryName,
                seller: product.sellerUsername,
                quantity: product.quantity,
                totalSold: product.totalSold || 0,
                imageUrls: product.imageUrls || '[]'
              }
            }),
          });
        }
        setSyncProgress(`✓ Đã đồng bộ ${productDocs.length} sản phẩm`);
      }

      // Step 2: Sync Orders to 'orders' collection
      setSyncProgress('Đang đồng bộ đơn hàng vào collection "orders"...');
      const orderDocs = systemAnalytics.orders?.map((o: any) => 
        `Đơn hàng #${o.id}. Khách hàng: ${o.customerName}. Trạng thái: ${o.status}. Tổng tiền: ${(o.totalAmount / 1000).toFixed(0)}K VNĐ. Số sản phẩm: ${o.totalItems}. Ngày: ${o.createdAt}. ${o.items ? 'Sản phẩm: ' + o.items.map((i: any) => `${i.productName} x${i.quantity}`).join(', ') : ''}`
      ) || [];

      const orderMetas = systemAnalytics.orders?.map((o: any) => ({
        id: o.id.toString(),
        customerName: o.customerName,
        status: o.status,
        totalAmount: o.totalAmount,
        totalItems: o.totalItems,
        type: 'order'
      })) || [];

      if (orderDocs.length > 0) {
        // Use new analytics endpoint instead of chroma
        for (const order of systemAnalytics.orders || []) {
          await fetch(`${AI_SERVICE_URL}/api/analytics/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: `order_${order.id}`,
              customer_id: order.customerId?.toString(),
              total_amount: order.totalAmount,
              products: order.items || [],
              order_date: order.createdAt,
              metadata: {
                status: order.status,
                totalItems: order.totalItems,
                customerName: order.customerName
              }
            }),
          });
        }
        setSyncProgress(`✓ Đã đồng bộ ${orderDocs.length} đơn hàng`);
      }

      // Step 3: Sync Business Performance to 'business' collection
      setSyncProgress('Đang đồng bộ doanh nghiệp vào collection "business"...');
      const businessDocs = systemAnalytics.businessPerformance?.map((b: any) => 
        `Doanh nghiệp: ${b.businessUsername}. Tổng ${b.totalProducts} sản phẩm (${b.activeProducts} hoạt động). Giá trị kho: ${(b.inventoryValue / 1000000).toFixed(2)}M VNĐ. ${b.totalOrders} đơn hàng. Doanh thu: ${(b.revenue / 1000000).toFixed(2)}M VNĐ. Trung bình/đơn: ${(b.averageOrderValue / 1000).toFixed(0)}K VNĐ.`
      ) || [];

      const businessMetas = systemAnalytics.businessPerformance?.map((b: any) => ({
        businessId: b.businessId.toString(),
        businessUsername: b.businessUsername,
        totalProducts: b.totalProducts,
        activeProducts: b.activeProducts,
        revenue: b.revenue,
        type: 'business'
      })) || [];

      if (businessDocs.length > 0) {
        // Use new analytics endpoint instead of chroma
        for (const business of systemAnalytics.businessPerformance || []) {
          await fetch(`${AI_SERVICE_URL}/api/analytics/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data_id: `business_${business.businessId}`,
              data_content: `Doanh nghiệp: ${business.businessUsername}. Tổng ${business.totalProducts} sản phẩm (${business.activeProducts} hoạt động). Giá trị kho: ${(business.inventoryValue / 1000000).toFixed(2)}M VNĐ. ${business.totalOrders} đơn hàng. Doanh thu: ${(business.revenue / 1000000).toFixed(2)}M VNĐ. Trung bình/đơn: ${(business.averageOrderValue / 1000).toFixed(0)}K VNĐ.`,
              data_type: 'business_performance',
              metadata: {
                businessId: business.businessId,
                businessUsername: business.businessUsername,
                totalProducts: business.totalProducts,
                activeProducts: business.activeProducts,
                revenue: business.revenue,
                inventoryValue: business.inventoryValue,
                totalOrders: business.totalOrders,
                averageOrderValue: business.averageOrderValue
              }
            }),
          });
        }
        setSyncProgress(`✓ Đã đồng bộ ${businessDocs.length} doanh nghiệp`);
      }

      // Step 4: Sync Users to 'users' collection
      setSyncProgress('Đang đồng bộ người dùng vào collection "users"...');
      const userDocs = systemAnalytics.users?.map((u: any) =>
        `Người dùng: ${u.username} (${u.email}). Vai trò: ${u.role}. Trạng thái: ${u.accountStatus}. Địa chỉ: ${u.address || 'Chưa có'}. SĐT: ${u.phoneNumber || 'Chưa có'}.`
      ) || [];

      const userMetas = systemAnalytics.users?.map((u: any) => ({
        userId: u.id.toString(),
        username: u.username,
        email: u.email,
        role: u.role,
        accountStatus: u.accountStatus,
        type: 'user'
      })) || [];

      if (userDocs.length > 0) {
        // Note: Users are not stored in analytics RAG in the new architecture
        // This data is available through Spring API for analytics purposes
        console.log(`ℹ️  Skipping user sync - ${userDocs.length} users available via Spring API`);
        setSyncProgress(`✓ Bỏ qua đồng bộ ${userDocs.length} người dùng (có sẵn qua Spring API)`);
      }

      // Step 5: Sync Categories to 'categories' collection
      setSyncProgress('Đang đồng bộ danh mục vào collection "categories"...');
      const categoryDocs = systemAnalytics.categories?.map((c: any) => 
        `Danh mục: ${c.name}. ${c.description}. Trạng thái: ${c.status}. Có ${c.productCount} sản phẩm.`
      ) || [];

      const categoryMetas = systemAnalytics.categories?.map((c: any) => ({
        categoryId: c.id.toString(),
        name: c.name,
        status: c.status,
        productCount: c.productCount,
        type: 'category'
      })) || [];

      if (categoryDocs.length > 0) {
        // Use new analytics endpoint instead of chroma
        for (const category of systemAnalytics.categories || []) {
          await fetch(`${AI_SERVICE_URL}/api/analytics/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data_id: `category_${category.id}`,
              data_content: `Danh mục: ${category.name}. ${category.description}. Trạng thái: ${category.status}. Có ${category.productCount} sản phẩm.`,
              data_type: 'category',
              metadata: {
                categoryId: category.id,
                name: category.name,
                status: category.status,
                productCount: category.productCount
              }
            }),
          });
        }
        setSyncProgress(`✓ Đã đồng bộ ${categoryDocs.length} danh mục`);
      }

      // Step 6: Sync System Statistics to analytics RAG
      setSyncProgress('Đang tạo thống kê tổng quan vào analytics RAG...');
      const statsDoc = `Thống kê hệ thống: Tổng ${systemAnalytics.totalUsers} người dùng (${systemAnalytics.totalCustomers} khách, ${systemAnalytics.totalBusinessUsers} doanh nghiệp). ${systemAnalytics.totalProducts} sản phẩm (${systemAnalytics.activeProducts} hoạt động). ${systemAnalytics.totalOrders} đơn hàng (${systemAnalytics.deliveredOrders} đã giao, ${systemAnalytics.pendingOrders} chờ). Tổng doanh thu: ${(systemAnalytics.totalRevenue / 1000000).toFixed(2)}M VNĐ. Tháng này: ${(systemAnalytics.monthlyRevenue / 1000000).toFixed(2)}M VNĐ. Tuần này: ${(systemAnalytics.weeklyRevenue / 1000000).toFixed(2)}M VNĐ.`;

      await fetch(`${AI_SERVICE_URL}/api/analytics/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_id: `system_stats_${new Date().getTime()}`,
          data_content: statsDoc,
          data_type: 'system_statistics',
          metadata: {
            totalUsers: systemAnalytics.totalUsers,
            totalCustomers: systemAnalytics.totalCustomers,
            totalBusinessUsers: systemAnalytics.totalBusinessUsers,
            totalProducts: systemAnalytics.totalProducts,
            activeProducts: systemAnalytics.activeProducts,
            totalOrders: systemAnalytics.totalOrders,
            deliveredOrders: systemAnalytics.deliveredOrders,
            pendingOrders: systemAnalytics.pendingOrders,
            totalRevenue: systemAnalytics.totalRevenue,
            monthlyRevenue: systemAnalytics.monthlyRevenue,
            weeklyRevenue: systemAnalytics.weeklyRevenue
          }
        }),
      });

      setSyncProgress('✓ Đã đồng bộ thống kê hệ thống');
      setSyncProgress('✅ Hoàn thành đồng bộ dữ liệu!');
      setSyncStatus('success');
      
      // Show suggested prompts modal after sync - only if component is still mounted
      if (isMounted) {
        setShowSuggestedPrompts(true);
      }
      
      // Reload data
      setTimeout(() => {
        loadData();
        setSyncStatus('idle');
      }, 2000);

    } catch (err) {
      console.error('Sync error:', err);
      setSyncProgress('Lỗi đồng bộ!');
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } finally {
      setSyncing(false);
    }
  };

  // Test Chat functions
  const handleSendTestChat = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    // Add empty assistant message immediately
    setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const endpoint = useRag 
        ? `${AI_SERVICE_URL}/gemini/chat/rag/stream`
        : `${AI_SERVICE_URL}/gemini/chat/stream`;

      console.log('Sending to:', endpoint);
      console.log('With data:', {
        message: userMessage,
        model: selectedModel,
        session_id: testChatSessionId,
        user_id: userData?.id?.toString() || 'admin-test'
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          model: selectedModel,
          session_id: testChatSessionId,
          user_id: userData?.id?.toString() || 'admin-test'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Network response was not ok: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            if (!data) continue;

            try {
              const parsed = JSON.parse(data);
              console.log('Parsed data:', parsed);
              
              // Backend returns { type: 'chunk', text: '...' }
              if (parsed.type === 'chunk' && parsed.text) {
                assistantMessage += parsed.text;
                setChatMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantMessage };
                  return updated;
                });
              } else if (parsed.type === 'error') {
                console.error('Stream error:', parsed.error);
                setChatMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: `Lỗi: ${parsed.error}` };
                  return updated;
                });
              }
            } catch (e) {
              console.error('Parse error:', e, 'Data:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Lỗi khi gửi tin nhắn. Vui lòng thử lại.' };
        return updated;
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearTestChat = () => {
    setChatMessages([]);
  };

  // Collection management functions
  const handleViewCollection = async (collectionName: string) => {
    setLoadingCollectionData(true);
    try {
      // Use analytics endpoints instead of chroma
      let response;
      if (collectionName === 'business_data') {
        response = await fetch(`${AI_SERVICE_URL}/api/analytics/data/all?limit=100`);
      } else {
        // For other collections, show empty for now
        setCollectionData({ documents: [], count: 0 });
        setLoadingCollectionData(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setCollectionData(data);
        setSelectedCollection(collectionName);
      } else {
        alert('Không thể tải dữ liệu collection');
      }
    } catch (error) {
      console.error('Error loading collection data:', error);
      alert('Lỗi khi tải dữ liệu collection');
    } finally {
      setLoadingCollectionData(false);
    }
  };

  const handleDeleteCollection = async (collectionName: string) => {
    // Note: Collection deletion is not available in the new separated architecture
    // Collections are managed automatically
    alert('Xóa collection không khả dụng trong kiến trúc mới. Collections được quản lý tự động.');
    console.log(`ℹ️  Collection deletion not available for: ${collectionName}`);
  };

  const handleCloseCollectionModal = () => {
    setSelectedCollection(null);
    setCollectionData(null);
  };

  const userData = apiClient.getUserData();

  return (
    <AdminLayout userData={userData} currentPage="ai-service">
      <div className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: 'overview', label: 'Tổng quan', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { id: 'settings', label: 'Cài đặt Model', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
              { id: 'rag-data', label: 'RAG Data', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
              { id: 'prompts', label: 'RAG Prompts', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              { id: 'history', label: 'Lịch sử Chat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
              { id: 'collections', label: 'Collections', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-b-4 border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Đang tải...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">RAG Prompts</p>
                        <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                          {ragStats?.total_prompts || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Tin nhắn Chat</p>
                        <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                          {chatStats?.total_messages || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Sessions</p>
                        <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                          {chatStats?.total_sessions || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Collections</p>
                        <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                          {collections.length}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categories & Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Categories */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Prompt theo danh mục
                    </h3>
                    {ragStats?.categories && Object.keys(ragStats.categories).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(ragStats.categories).map(([category, count]) => (
                          <div key={category} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="font-medium capitalize">{category}</span>
                            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm font-semibold">
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-8">Chưa có prompts</p>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Hành động nhanh
                    </h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => setActiveTab('prompts')}
                        className="w-full flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-colors text-left"
                      >
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">Thêm RAG Prompt</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Thêm hướng dẫn mới cho AI</p>
                        </div>
                      </button>

                      <Link
                        href="/chat"
                        className="w-full flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition-colors"
                      >
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">Mở Chat AI</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Trò chuyện với AI Agent</p>
                        </div>
                      </Link>

                      <a
                        href={`${AI_SERVICE_URL}/docs`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl transition-colors"
                      >
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">API Documentation</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Xem Swagger docs</p>
                        </div>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Service Info */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold mb-4">Thông tin Service</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">URL</p>
                      <p className="font-mono text-sm break-all">{AI_SERVICE_URL}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Trạng thái</p>
                      <p className={`font-semibold flex items-center gap-1 ${serviceHealth?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                        {serviceHealth?.status === 'healthy' ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Hoạt động
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Lỗi
                          </>
                        )}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">AI Model đang dùng</p>
                      <p className="font-semibold">{aiConfig?.default_model || 'gemini-2.0-flash'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold">Cài đặt AI Model</h2>
                    <p className="text-gray-500 dark:text-gray-400">Chọn model mặc định cho người dùng chat</p>
                  </div>
                  <button
                    onClick={handleResetConfig}
                    disabled={savingConfig}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Đặt lại mặc định
                  </button>
                </div>

                {/* AI Provider Selection */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Chọn AI Provider
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                    Chuyển đổi giữa Gemini và Groq để tránh giới hạn rate limit
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gemini Provider */}
                    <div
                      onClick={() => handleProviderChange('gemini')}
                      className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                        aiProvider === 'gemini'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-xl">Google Gemini</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Gemini AI từ Google
                          </p>
                        </div>
                        {aiProvider === 'gemini' && (
                          <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full font-semibold">
                            ĐÃ CHỌN
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded text-xs font-medium">
                          Chất lượng cao
                        </span>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded text-xs font-medium">
                          Rate limit thấp
                        </span>
                      </div>
                    </div>

                    {/* Groq Provider */}
                    <div
                      onClick={() => handleProviderChange('groq')}
                      className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                        aiProvider === 'groq'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-xl">Groq</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Llama & Mixtral siêu nhanh
                          </p>
                        </div>
                        {aiProvider === 'groq' && (
                          <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full font-semibold">
                            ĐÃ CHỌN
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-medium">
                          Cực nhanh
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium">
                          Rate limit cao
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Model Selection - Dynamic based on provider */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Chọn Model {aiProvider === 'groq' ? 'Groq' : 'Gemini'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                    {aiProvider === 'groq' 
                      ? 'Chọn model Groq để sử dụng cho chat'
                      : 'Model này sẽ được sử dụng cho tất cả người dùng khi chat với AI Agent'
                    }
                  </p>

                  {/* Show Groq Models when Groq is selected */}
                  {aiProvider === 'groq' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {groqModels.length === 0 ? (
                        <div className="col-span-2 text-center py-8 text-gray-500 dark:text-gray-400">
                          <p>Đang tải Groq models...</p>
                        </div>
                      ) : (
                        groqModels.map((model: any) => (
                          <div
                            key={model.name}
                            onClick={() => handleGroqModelSelect(model.name)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              selectedGroqModel === model.name
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-bold text-base">{model.display_name}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {model.owned_by}
                                </p>
                              </div>
                              {selectedGroqModel === model.name && (
                                <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full font-semibold">
                                  Đang dùng
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-medium">
                                {model.context_window.toLocaleString()} tokens
                              </span>
                              {model.context_window >= 131072 && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded text-xs font-medium">
                                  Long Context
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Show Gemini Models (ai-config) when Gemini is selected */}
                  {aiProvider === 'gemini' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aiConfig?.available_models?.map((model) => (
                        <div
                          key={model.id}
                          onClick={async () => {
                            if (savingConfig) return;

                            // Note: User preference saving is not implemented in the new separated architecture
                            console.log('[Admin] ℹ️  Gemini model preference stored locally:', model.id);
                            setSelectedModel(model.id);
                          }}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedModel === model.id
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-lg">{model.name}</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{model.description}</p>
                            </div>
                            {selectedModel === model.id && (
                              <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full font-semibold">
                                Đang dùng
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2 mt-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                              model.speed === 'fast' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={model.speed === 'fast' ? 'M13 10V3L4 14h7v7l9-11h-7z' : 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'} />
                              </svg>
                              {model.speed === 'fast' ? 'Nhanh' : 'Trung bình'}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                              model.quality === 'highest' 
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : model.quality === 'high'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                : model.quality === 'experimental'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                            }`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={model.quality === 'highest' ? 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' : model.quality === 'high' ? 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' : model.quality === 'experimental' ? 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' : 'M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5'} />
                              </svg>
                              {model.quality === 'highest' ? 'Cao nhất' 
                                : model.quality === 'high' ? 'Cao'
                                : model.quality === 'experimental' ? 'Thử nghiệm'
                                : 'Tốt'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gemini Models from API */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Models được Gemini hỗ trợ {modelsLoaded && `(${geminiModels.length})`}
                    </h3>
                    <button
                      onClick={handleLoadGeminiModels}
                      disabled={loadingModels}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {loadingModels ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Đang tải...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {modelsLoaded ? 'Tải lại' : 'Xem Models từ Google'}
                        </>
                      )}
                    </button>
                  </div>
                  
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                    Nhấn nút để truy vấn danh sách models trực tiếp từ Google Gemini API theo thời gian thực.
                  </p>

                  {!modelsLoaded && !loadingModels && (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">Chưa tải danh sách models</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Nhấn "Xem Models từ Google" để truy vấn</p>
                    </div>
                  )}

                  {loadingModels && (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">Đang truy vấn từ Google Gemini API...</p>
                    </div>
                  )}

                  {modelsLoaded && geminiModels.length > 0 && (
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Model Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Display Name</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trạng thái</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hành động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {geminiModels.map((model) => (
                            <tr key={model.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-4 py-3">
                                <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                  {model.name}
                                </code>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                {model.display_name}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {modelTestResults[model.name] === 'testing' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs">
                                    <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Đang test...
                                  </span>
                                ) : modelTestResults[model.name] === 'success' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Hoạt động
                                  </span>
                                ) : modelTestResults[model.name] === 'error' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Lỗi
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 rounded-full text-xs">
                                    Chưa test
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleTestModel(model.name)}
                                  disabled={testingModel === model.name}
                                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                  Test
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {modelsLoaded && geminiModels.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p>Không tìm thấy models nào</p>
                    </div>
                  )}
                </div>

                {/* Advanced Settings */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Cài đặt nâng cao
                  </h3>

                  <div className="space-y-6">
                    {/* Allow User Change */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-semibold">Cho phép người dùng đổi model</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Nếu tắt, người dùng sẽ không thể thay đổi model khi chat
                        </p>
                      </div>
                      <button
                        onClick={() => handleUpdateConfig({ allow_user_change: !aiConfig?.allow_user_change })}
                        disabled={savingConfig}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          aiConfig?.allow_user_change 
                            ? 'bg-purple-600' 
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            aiConfig?.allow_user_change ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Temperature */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold">Temperature</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Độ sáng tạo của AI (0 = chính xác, 2 = sáng tạo)
                          </p>
                        </div>
                        <span className="text-lg font-bold text-purple-600">{aiConfig?.temperature || 0.7}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={aiConfig?.temperature || 0.7}
                        onChange={(e) => handleUpdateConfig({ temperature: parseFloat(e.target.value) })}
                        disabled={savingConfig}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>

                    {/* Max Tokens */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold">Max Tokens</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Độ dài tối đa của câu trả lời
                          </p>
                        </div>
                        <span className="text-lg font-bold text-purple-600">{aiConfig?.max_tokens || 2048}</span>
                      </div>
                      <input
                        type="range"
                        min="256"
                        max="8192"
                        step="256"
                        value={aiConfig?.max_tokens || 2048}
                        onChange={(e) => handleUpdateConfig({ max_tokens: parseInt(e.target.value) })}
                        disabled={savingConfig}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex gap-3">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-blue-800 dark:text-blue-200">Lưu ý</p>
                      <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                        Cài đặt này áp dụng cho tất cả người dùng. Khi tắt "Cho phép người dùng đổi model", 
                        người dùng sẽ chỉ sử dụng model mà bạn đã chọn ở trên.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Prompts Tab */}
            {activeTab === 'prompts' && (
              <div className="space-y-6">
                {/* Add Prompt Button */}
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Quản lý RAG Prompts</h2>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateSamplePrompts}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Tạo nhanh 5 prompts mẫu
                    </button>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Thêm Prompt
                    </button>
                  </div>
                </div>

                {/* Add Form Modal */}
                {showAddForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6">
                      <h3 className="text-xl font-bold mb-4">Thêm RAG Prompt mới</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Nội dung Prompt *</label>
                          <textarea
                            value={newPrompt.prompt}
                            onChange={(e) => setNewPrompt({ ...newPrompt, prompt: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700"
                            placeholder="Nhập hướng dẫn cho AI..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Danh mục</label>
                          <select
                            value={newPrompt.category}
                            onChange={(e) => setNewPrompt({ ...newPrompt, category: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700"
                          >
                            <option value="general">Chung</option>
                            <option value="greeting">Chào hỏi</option>
                            <option value="product">Sản phẩm</option>
                            <option value="order">Đơn hàng</option>
                            <option value="support">Hỗ trợ</option>
                            <option value="policy">Chính sách</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Tags (phân cách bằng dấu phẩy)</label>
                          <input
                            type="text"
                            value={newPrompt.tags}
                            onChange={(e) => setNewPrompt({ ...newPrompt, tags: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700"
                            placeholder="vd: friendly, professional"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={() => setShowAddForm(false)}
                          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handleAddPrompt}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                        >
                          Thêm
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Form Modal */}
                {editingPrompt && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6">
                      <h3 className="text-xl font-bold mb-4">Chỉnh sửa Prompt</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Nội dung Prompt</label>
                          <textarea
                            value={editingPrompt.prompt}
                            onChange={(e) => setEditingPrompt({ ...editingPrompt, prompt: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Danh mục</label>
                          <select
                            value={editingPrompt.category}
                            onChange={(e) => setEditingPrompt({ ...editingPrompt, category: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700"
                          >
                            <option value="general">Chung</option>
                            <option value="greeting">Chào hỏi</option>
                            <option value="product">Sản phẩm</option>
                            <option value="order">Đơn hàng</option>
                            <option value="support">Hỗ trợ</option>
                            <option value="policy">Chính sách</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={() => setEditingPrompt(null)}
                          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handleUpdatePrompt}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                        >
                          Lưu
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prompts List */}
                {prompts.length > 0 ? (
                  <div className="grid gap-4">
                    {prompts.map((prompt) => (
                      <div key={prompt.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm font-semibold capitalize">
                                {prompt.category}
                              </span>
                              {prompt.tags?.map((tag, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <p className="text-gray-800 dark:text-gray-200">{prompt.prompt}</p>
                            <p className="text-xs text-gray-400 mt-2 font-mono">ID: {prompt.id}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingPrompt(prompt)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="Sửa"
                            >
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeletePrompt(prompt.id)}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Xóa"
                            >
                              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold mb-2">Chưa có RAG Prompts</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Prompts sẽ hướng dẫn AI cách sử dụng dữ liệu trong ChromaDB để trả lời chính xác</p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-center items-center max-w-md mx-auto">
                      <button
                        onClick={handleCreateSamplePrompts}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all w-full sm:w-auto"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Tạo nhanh 5 prompts mẫu
                      </button>
                      <span className="text-gray-400">hoặc</span>
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 px-6 py-3 border-2 border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400 rounded-xl font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all w-full sm:w-auto"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Tạo prompt tùy chỉnh
                      </button>
                    </div>

                    <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-left max-w-2xl mx-auto">
                      <div className="flex gap-3">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-blue-800 dark:text-blue-200">
                          <p className="font-semibold mb-1">💡 Gợi ý</p>
                          <p>Nếu bạn đã đồng bộ dữ liệu vào ChromaDB (tab RAG Data), hãy tạo prompts để AI biết cách tìm kiếm và sử dụng dữ liệu đó!</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                {/* Stats */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Thống kê Lịch sử Chat</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40 rounded-xl">
                      <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{chatStats?.total_messages || 0}</p>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">Tổng tin nhắn</p>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40 rounded-xl">
                      <p className="text-4xl font-bold text-green-600 dark:text-green-400">{chatStats?.total_sessions || 0}</p>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">Phiên hội thoại</p>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/40 rounded-xl">
                      <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">{chatStats?.total_users || 0}</p>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">Người dùng</p>
                    </div>
                  </div>
                </div>

                {/* Sessions List */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Các phiên Chat {chatSessions.length > 0 && `(${chatSessions.length})`}
                    </h3>
                    <button
                      onClick={handleLoadChatSessions}
                      disabled={loadingSessions}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {loadingSessions ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Đang tải...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Tải danh sách phiên chat
                        </>
                      )}
                    </button>
                  </div>

                  {chatSessions.length === 0 && !loadingSessions && (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">Nhấn nút để tải danh sách phiên chat</p>
                    </div>
                  )}

                  {chatSessions.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Sessions List */}
                      <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 font-semibold text-sm">
                          Danh sách phiên
                        </div>
                        <div className="max-h-96 overflow-y-auto divide-y dark:divide-gray-700">
                          {chatSessions.map((session) => (
                            <div
                              key={session.session_id}
                              className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                selectedSession?.session_id === session.session_id 
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' 
                                  : ''
                              }`}
                              onClick={() => handleViewSession(session)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    Session: {session.session_id.substring(0, 12)}...
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    User: {session.user_id || 'anonymous'}
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                                    {session.last_message || 'No messages'}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-2 ml-2">
                                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                                    {session.message_count} tin
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSession(session.session_id);
                                    }}
                                    className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                    title="Xóa phiên chat"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Message View */}
                      <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 font-semibold text-sm flex items-center justify-between">
                          <span>Nội dung tin nhắn</span>
                          {selectedSession && (
                            <span className="text-xs text-gray-500">
                              {sessionMessages.length} tin nhắn
                            </span>
                          )}
                        </div>
                        <div className="max-h-96 overflow-y-auto p-4">
                          {!selectedSession ? (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                              </svg>
                              <p>Chọn một phiên chat để xem nội dung</p>
                            </div>
                          ) : loadingMessages ? (
                            <div className="text-center py-12">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                              <p className="text-gray-500 mt-2">Đang tải tin nhắn...</p>
                            </div>
                          ) : sessionMessages.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                              <p>Không có tin nhắn</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {sessionMessages.map((msg, idx) => (
                                <div
                                  key={msg.id || idx}
                                  className={`p-3 rounded-lg ${
                                    msg.role === 'user'
                                      ? 'bg-blue-100 dark:bg-blue-900/30 ml-8'
                                      : 'bg-gray-100 dark:bg-gray-700 mr-8'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-semibold ${
                                      msg.role === 'user' 
                                        ? 'text-blue-700 dark:text-blue-400' 
                                        : 'text-green-700 dark:text-green-400'
                                    }`}>
                                      {msg.role === 'user' ? 'Người dùng' : 'AI'}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {msg.timestamp ? new Date(msg.timestamp).toLocaleString('vi-VN') : ''}
                                    </span>
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold mb-4">Lưu ý về Lịch sử Chat</h3>
                  <div className="space-y-3 text-gray-600 dark:text-gray-400">
                    <p>• Lịch sử chat được lưu trong ChromaDB collection: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{chatStats?.collection_name || 'chat_history'}</code></p>
                    <p>• AI sử dụng 10 tin nhắn gần nhất làm ngữ cảnh khi trả lời</p>
                    <p>• Mỗi session được định danh bằng session_id duy nhất</p>
                    <p>• Dữ liệu được vector hóa để hỗ trợ semantic search</p>
                  </div>
                </div>
              </div>
            )}

            {/* RAG Data Tab - System Analytics */}
            {activeTab === 'rag-data' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">System Analytics Data for RAG</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      Dữ liệu hệ thống để AI/RAG phân tích và đưa ra insights kinh doanh
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={loadSystemAnalytics}
                      disabled={loadingAnalytics || syncing}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <svg className={`w-5 h-5 ${loadingAnalytics ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {loadingAnalytics ? 'Đang làm mới...' : 'Làm mới'}
                    </button>
                    
                    {systemAnalytics && (
                      <button
                        onClick={handleSyncData}
                        disabled={syncing || loadingAnalytics}
                        className={`px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 ${
                          syncStatus === 'success' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' :
                          syncStatus === 'error' ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white' :
                          'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                        }`}
                      >
                        <svg className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {syncing ? 'Đang đồng bộ...' : 
                         syncStatus === 'success' ? '✓ Đồng bộ thành công' :
                         syncStatus === 'error' ? '✗ Đồng bộ lỗi' :
                         'Đồng bộ vào ChromaDB'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Sync Progress */}
                {syncing && syncProgress && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl shadow-lg p-6 border-2 border-purple-200 dark:border-purple-700">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-purple-900 dark:text-purple-100 mb-2">
                          Đang đồng bộ dữ liệu vào ChromaDB
                        </h3>
                        <p className="text-purple-700 dark:text-purple-300 font-medium">
                          {syncProgress}
                        </p>
                        <div className="mt-3 bg-purple-200 dark:bg-purple-800 rounded-full h-2 overflow-hidden">
                          <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-full animate-pulse" style={{ width: '100%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {loadingAnalytics && !systemAnalytics && (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">Đang tải dữ liệu analytics...</p>
                    </div>
                  </div>
                )}

                {systemAnalytics && (
                  <div className="space-y-6">
                    {/* Overview Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-blue-100 text-sm">Tổng người dùng</p>
                            <p className="text-3xl font-bold mt-1">{systemAnalytics.totalUsers}</p>
                            <p className="text-xs text-blue-100 mt-1">
                              {systemAnalytics.totalCustomers} khách | {systemAnalytics.totalBusinessUsers} doanh nghiệp
                            </p>
                          </div>
                          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-green-100 text-sm">Sản phẩm</p>
                            <p className="text-3xl font-bold mt-1">{systemAnalytics.totalProducts}</p>
                            <p className="text-xs text-green-100 mt-1">{systemAnalytics.activeProducts} đang hoạt động</p>
                          </div>
                          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-purple-100 text-sm">Đơn hàng</p>
                            <p className="text-3xl font-bold mt-1">{systemAnalytics.totalOrders}</p>
                            <p className="text-xs text-purple-100 mt-1">
                              {systemAnalytics.deliveredOrders} đã giao | {systemAnalytics.pendingOrders} chờ xử lý
                            </p>
                          </div>
                          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-orange-100 text-sm">Doanh thu</p>
                            <p className="text-2xl font-bold mt-1">
                              {(systemAnalytics.totalRevenue / 1000000).toFixed(1)}M VNĐ
                            </p>
                            <p className="text-xs text-orange-100 mt-1">
                              Tháng này: {(systemAnalytics.monthlyRevenue / 1000000).toFixed(1)}M
                            </p>
                          </div>
                          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Business Performance */}
                    {systemAnalytics.businessPerformance && systemAnalytics.businessPerformance.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-xl font-bold mb-4">Hiệu suất doanh nghiệp</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b dark:border-gray-700">
                                <th className="text-left py-3 px-4">Doanh nghiệp</th>
                                <th className="text-right py-3 px-4">Sản phẩm</th>
                                <th className="text-right py-3 px-4">Đơn hàng</th>
                                <th className="text-right py-3 px-4">Doanh thu</th>
                                <th className="text-right py-3 px-4">TB/Đơn</th>
                              </tr>
                            </thead>
                            <tbody>
                              {systemAnalytics.businessPerformance.map((biz: any, idx: number) => (
                                <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                  <td className="py-3 px-4 font-medium">{biz.businessUsername}</td>
                                  <td className="text-right py-3 px-4">
                                    {biz.activeProducts}/{biz.totalProducts}
                                  </td>
                                  <td className="text-right py-3 px-4">{biz.totalOrders}</td>
                                  <td className="text-right py-3 px-4 text-green-600 font-semibold">
                                    {(biz.revenue / 1000000).toFixed(2)}M
                                  </td>
                                  <td className="text-right py-3 px-4">
                                    {(biz.averageOrderValue / 1000).toFixed(0)}K
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Top Selling Products */}
                    {systemAnalytics.topSellingProducts && systemAnalytics.topSellingProducts.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-xl font-bold mb-4">Sản phẩm bán chạy</h3>
                        <div className="space-y-3">
                          {systemAnalytics.topSellingProducts.slice(0, 5).map((product: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-full font-bold text-sm">
                                  {idx + 1}
                                </span>
                                <div>
                                  <p className="font-medium">{product.productName}</p>
                                  <p className="text-sm text-gray-500">Đã bán: {product.totalSold}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-green-600">
                                  {(product.totalRevenue / 1000000).toFixed(2)}M VNĐ
                                </p>
                                <p className="text-sm text-gray-500">Tồn kho: {product.quantityInStock}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Categories */}
                    {systemAnalytics.categories && systemAnalytics.categories.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-xl font-bold mb-4">Danh mục sản phẩm</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {systemAnalytics.categories.map((cat: any, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSelectedCategory(cat);
                                const products = systemAnalytics.products?.filter((p: any) => p.categoryName === cat.name) || [];
                                setCategoryProducts(products);
                              }}
                              className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-lg hover:shadow-lg transition-all cursor-pointer text-left"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-lg">{cat.name}</h4>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  cat.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {cat.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{cat.description}</p>
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold">
                                  {cat.productCount} sản phẩm
                                </p>
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Category Products Modal/Detail */}
                    {selectedCategory && (
                      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCategory(null)}>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-6 flex items-center justify-between">
                            <div>
                              <h3 className="text-2xl font-bold">{selectedCategory.name}</h3>
                              <p className="text-gray-600 dark:text-gray-400">{selectedCategory.description}</p>
                              <p className="text-sm text-blue-600 mt-1">{categoryProducts.length} sản phẩm</p>
                            </div>
                            <button
                              onClick={() => setSelectedCategory(null)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          
                          <div className="p-6">
                            {categoryProducts.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {categoryProducts.map((product: any, idx: number) => (
                                  <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex-1">
                                        <h4 className="font-bold text-lg mb-1">{product.name}</h4>
                                        <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
                                      </div>
                                      <span className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ml-2 ${
                                        product.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                      }`}>
                                        {product.status}
                                      </span>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Giá:</span>
                                        <span className="font-bold text-green-600">
                                          {(product.price / 1000).toFixed(0)}K VNĐ
                                        </span>
                                      </div>
                                      
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Tồn kho:</span>
                                        <span className={`font-semibold ${product.quantity < 10 ? 'text-red-600' : 'text-blue-600'}`}>
                                          {product.quantity}
                                        </span>
                                      </div>
                                      
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Đã bán:</span>
                                        <span className="font-semibold text-purple-600">{product.totalSold || 0}</span>
                                      </div>
                                      
                                      <div className="flex items-center justify-between pt-2 border-t dark:border-gray-600">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Người bán:</span>
                                        <span className="text-sm font-medium">{product.sellerUsername}</span>
                                      </div>
                                      
                                      {product.totalRevenue > 0 && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm text-gray-600 dark:text-gray-400">Doanh thu:</span>
                                          <span className="text-sm font-bold text-green-600">
                                            {(product.totalRevenue / 1000000).toFixed(2)}M
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-12">
                                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                                <p className="text-gray-500 dark:text-gray-400">Không có sản phẩm nào trong danh mục này</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Low Stock Products */}
                    {systemAnalytics.lowStockProducts && systemAnalytics.lowStockProducts.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Sản phẩm sắp hết hàng
                        </h3>
                        <div className="space-y-3">
                          {systemAnalytics.lowStockProducts.map((product: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                              <div>
                                <p className="font-medium">{product.productName}</p>
                                <p className="text-sm text-gray-500">
                                  {product.categoryName} - {product.sellerUsername}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-red-600">
                                  {product.quantityInStock}
                                </p>
                                <p className="text-xs text-gray-500">Còn lại</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Users Summary */}
                    {systemAnalytics.users && systemAnalytics.users.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-xl font-bold mb-4">Người dùng hệ thống</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b dark:border-gray-700">
                                <th className="text-left py-3 px-4">Tên người dùng</th>
                                <th className="text-left py-3 px-4">Email</th>
                                <th className="text-left py-3 px-4">Vai trò</th>
                                <th className="text-left py-3 px-4">Trạng thái</th>
                                <th className="text-left py-3 px-4">Địa chỉ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {systemAnalytics.users.slice(0, 10).map((user: any, idx: number) => (
                                <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                  <td className="py-3 px-4 font-medium">{user.username}</td>
                                  <td className="py-3 px-4 text-sm">{user.email}</td>
                                  <td className="py-3 px-4">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                      user.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                                      user.role === 'BUSINESS' ? 'bg-blue-100 text-blue-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>
                                      {user.role}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                      user.accountStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {user.accountStatus}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-sm">{user.address || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Recent Orders */}
                    {systemAnalytics.orders && systemAnalytics.orders.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-xl font-bold mb-4">Đơn hàng gần đây</h3>
                        <div className="space-y-4">
                          {systemAnalytics.orders.slice(0, 5).map((order: any, idx: number) => (
                            <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <p className="font-semibold">Đơn hàng #{order.id}</p>
                                  <p className="text-sm text-gray-500">{order.customerName}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-green-600">
                                    {(order.totalAmount / 1000).toFixed(0)}K VNĐ
                                  </p>
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                    order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {order.status}
                                  </span>
                                </div>
                              </div>
                              {order.items && order.items.length > 0 && (
                                <div className="mt-2 pt-2 border-t dark:border-gray-600">
                                  <p className="text-xs text-gray-500 mb-1">Sản phẩm:</p>
                                  {order.items.map((item: any, itemIdx: number) => (
                                    <div key={itemIdx} className="flex justify-between text-sm">
                                      <span>{item.productName} x{item.quantity}</span>
                                      <span className="text-gray-600">{(item.subtotal / 1000).toFixed(0)}K</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs text-gray-400 mt-2">{order.createdAt}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Revenue by Business */}
                    {systemAnalytics.revenueByBusiness && systemAnalytics.revenueByBusiness.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-xl font-bold mb-4">Doanh thu theo doanh nghiệp</h3>
                        <div className="space-y-3">
                          {systemAnalytics.revenueByBusiness.map((biz: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 rounded-lg">
                              <div>
                                <p className="font-bold text-lg">{biz.businessUsername}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {biz.totalOrders} đơn hàng - {biz.productsSold} sản phẩm đã bán
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-green-600">
                                  {(biz.totalRevenue / 1000000).toFixed(2)}M
                                </p>
                                <p className="text-xs text-gray-500">VNĐ</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Business Documents */}
                    {systemAnalytics.businessDocuments && systemAnalytics.businessDocuments.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <svg className="w-6 h-6 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
                          </svg>
                          Tài liệu RAG ({systemAnalytics.totalDocuments})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {systemAnalytics.businessDocuments.slice(0, 6).map((doc: any, idx: number) => (
                            <div key={idx} className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-lg">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/>
                                    <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold truncate">{doc.fileName}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                                    {doc.businessUsername}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {doc.fileType} - {(doc.fileSize / 1024).toFixed(1)} KB
                                  </p>
                                  {doc.description && (
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{doc.description}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* Collections Tab */}
            {activeTab === 'collections' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">ChromaDB Collections</h2>
                  <button
                    onClick={loadData}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Làm mới
                  </button>
                </div>
                
                {collections.length > 0 ? (
                  <div className="grid gap-4">
                    {collections.map((col, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-bold text-lg">{col.name}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{col.count} documents</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-2xl font-bold">
                              {col.count}
                            </span>
                            <button
                              onClick={() => handleViewCollection(col.name)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Xem
                            </button>
                            <button
                              onClick={() => handleDeleteCollection(col.name)}
                              disabled={deletingCollection === col.name}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                              {deletingCollection === col.name ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                              Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
                    <p className="text-gray-500 dark:text-gray-400">Không có collections</p>
                  </div>
                )}

                {/* Collection Detail Modal */}
                {selectedCollection && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                      <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-white">Collection: {selectedCollection}</h3>
                          <p className="text-orange-100">
                            {collectionData ? `${collectionData.count} documents` : 'Đang tải...'}
                          </p>
                        </div>
                        <button
                          onClick={handleCloseCollectionModal}
                          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-6">
                        {loadingCollectionData ? (
                          <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
                          </div>
                        ) : collectionData ? (
                          <div className="space-y-4">
                            {collectionData.documents.map((doc: string, idx: number) => (
                              <div key={idx} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-start justify-between mb-2">
                                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                    ID: {collectionData.ids[idx]}
                                  </span>
                                  <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-2 py-1 rounded">
                                    #{idx + 1}
                                  </span>
                                </div>
                                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap mb-3">
                                  {doc}
                                </p>
                                {collectionData.metadatas && collectionData.metadatas[idx] && (
                                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Metadata:</p>
                                    <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                                      {JSON.stringify(collectionData.metadatas[idx], null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-gray-400">Không có dữ liệu</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Suggested Prompts Modal - Hiển thị sau khi đồng bộ dữ liệu */}
      {isMounted && showSuggestedPrompts && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">✅ Đồng bộ dữ liệu thành công!</h2>
                  <p className="text-purple-100 mt-1">Bây giờ hãy tạo RAG Prompts để hướng dẫn AI sử dụng dữ liệu</p>
                </div>
                <button
                  onClick={() => setShowSuggestedPrompts(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex gap-3">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-blue-800 dark:text-blue-200">Prompts mẫu gợi ý - Bạn cần tự tạo qua tab RAG Prompts</p>
                    <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                      Dưới đây là các prompts đề xuất. Bạn có thể sao chép và chỉnh sửa theo doanh nghiệp của mình.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-lg">📝 5 Prompts mẫu được đề xuất:</h3>
                
                {/* Prompt 1: Product Search */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-purple-600 text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm">1</div>
                    <div className="font-bold text-purple-900 dark:text-purple-200">Tìm kiếm sản phẩm</div>
                    <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">product_search</span>
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-800 rounded p-3 font-mono">
                    Khi người dùng hỏi về sản phẩm (ví dụ: &quot;có sản phẩm gì&quot;, &quot;tìm điện thoại&quot;, &quot;giá bao nhiêu&quot;), hãy tìm kiếm trong collection &quot;products&quot; của ChromaDB. Luôn trả lời bằng tiếng Việt, thân thiện và đưa ra gợi ý phù hợp.
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Tags: product, search, ecommerce</div>
                </div>

                {/* Prompt 2: Order Inquiry */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-600 text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm">2</div>
                    <div className="font-bold text-blue-900 dark:text-blue-200">Tra cứu đơn hàng</div>
                    <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">order_inquiry</span>
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-800 rounded p-3 font-mono">
                    Khi người dùng hỏi về đơn hàng (ví dụ: &quot;đơn hàng của tôi&quot;, &quot;kiểm tra đơn&quot;), hãy tìm trong collection &quot;orders&quot;. Giải thích trạng thái đơn hàng rõ ràng (PENDING, CONFIRMED, PROCESSING, SHIPPING, DELIVERED, CANCELLED).
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Tags: order, tracking, support</div>
                </div>

                {/* Prompt 3: Business Analytics */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-green-600 text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm">3</div>
                    <div className="font-bold text-green-900 dark:text-green-200">Thống kê doanh nghiệp</div>
                    <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">business_analytics</span>
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-800 rounded p-3 font-mono">
                    Khi được hỏi về thống kê (ví dụ: &quot;doanh thu&quot;, &quot;bán được bao nhiêu&quot;), hãy sử dụng collection &quot;business&quot; và &quot;system_stats&quot;. Cung cấp tổng doanh thu, số đơn hàng, top sản phẩm bán chạy.
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Tags: analytics, business, statistics</div>
                </div>

                {/* Prompt 4: Customer Service */}
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-orange-600 text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm">4</div>
                    <div className="font-bold text-orange-900 dark:text-orange-200">Chính sách hỗ trợ</div>
                    <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded-full">customer_service</span>
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-800 rounded p-3 font-mono">
                    Khi hỏi về chính sách (đổi trả, thanh toán, giao hàng, bảo hành), hãy trả lời theo chính sách công ty. Ví dụ: Đổi trả 7 ngày, COD và chuyển khoản, giao hàng 2-5 ngày, bảo hành 12-24 tháng.
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Tags: policy, support, service</div>
                </div>

                {/* Prompt 5: General */}
                <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-gray-600 text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm">5</div>
                    <div className="font-bold text-gray-900 dark:text-gray-200">Hướng dẫn chung cho AI</div>
                    <span className="px-2 py-1 bg-gray-600 text-white text-xs rounded-full">general</span>
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-800 rounded p-3 font-mono">
                    Bạn là AI Agent hỗ trợ khách hàng. Nhiệm vụ: Tư vấn sản phẩm, tra đơn hàng, giải đáp chính sách. Luôn sử dụng dữ liệu từ ChromaDB (products, orders, users, categories, business, system_stats) để trả lời chính xác. Giọng điệu: Thân thiện, chuyên nghiệp.
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Tags: guidance, role, instructions</div>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <div className="flex gap-3">
                  <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-yellow-800 dark:text-yellow-200">Lưu ý quan trọng</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      Những prompts trên chỉ là MẪU GỢI Ý. Bạn cần vào tab &quot;RAG Prompts&quot; để TỰ TẠO prompts phù hợp với doanh nghiệp của bạn. 
                      Có thể chỉnh sửa nội dung, category, tags theo ý muốn.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowSuggestedPrompts(false);
                    setActiveTab('prompts');
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Đi tới tạo RAG Prompts
                </button>
                <button
                  onClick={() => setShowSuggestedPrompts(false)}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Để sau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
