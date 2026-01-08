'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Bot, Trash2, MessageSquare, User, Send, ClipboardList, ArrowLeft, ShoppingCart } from 'lucide-react';
import { API_CONFIG, getGroqChatUrl } from '@/config/api.config';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Inter, Poppins } from 'next/font/google';
import OrderDetailPanel from '@/components/OrderDetailPanel';

// Google Fonts
const inter = Inter({ subsets: ['latin'] });
const poppins = Poppins({ weight: ['400', '600', '700'], subsets: ['latin'] });

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model: string;
  timestamp: string;
  user_id?: string;
  products?: Array<{
    id: number;
    name: string;
    price: number;
    img_url?: string;
    stock?: number;
    category?: string;
  }>;
  orders?: Array<{
    id: number;
    status: string;
    totalAmount: number;
    createdAt: string;
  }>;
}


interface Session {
  session_id: string;
  message_count: number;
  messages: Message[];
}

interface UserHistory {
  user_id: string;
  sessions: Session[];
  total_sessions: number;
  total_messages: number;
}

interface LoginResponse {
  token: string;
  userId: number;
  username: string;
  email: string;
  role: 'ADMIN' | 'BUSINESS' | 'CUSTOMER';
}

// Typing indicator component
const TypingIndicator = () => (
  <div className="flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-300">
    <div className="max-w-2xl rounded-2xl p-5 shadow-lg bg-gradient-to-r from-slate-700 to-slate-800 text-slate-100 rounded-bl-none border border-slate-600/50">
      <div className="text-xs font-bold mb-2 opacity-75 uppercase tracking-wide flex items-center gap-1">
        <Bot className="w-3 h-3" /> Agent
      </div>
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <span className="text-sm text-slate-300">Agent đang suy nghĩ...</span>
      </div>
    </div>
  </div>
);

// Inline Product Card component
interface InlineProduct {
  id: number;
  name: string;
  price: number;
  img_url?: string;
  stock?: number;
  category?: string;
}

interface ProductCardProps {
  product: InlineProduct;
  onAddToCart: (productId: number, productName: string) => void;
  onViewDetail: (productId: number) => void;
}

const ProductCard = ({ product, onAddToCart, onViewDetail }: ProductCardProps) => (
  <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4 hover:bg-slate-800/60 hover:border-blue-500/30 hover:shadow-blue-500/10 hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

    {product.img_url && (
      <div className="relative shrink-0 overflow-hidden rounded-xl border border-slate-700/50 shadow-sm">
        <img
          src={product.img_url}
          alt={product.name}
          className="w-16 h-16 object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
    )}
    <div className="flex-1 min-w-0 z-10">
      <p className={`font-semibold text-slate-100 text-sm truncate mb-1 ${poppins.className}`}>{product.name}</p>
      <div className="flex items-center gap-2">
        <span className="text-emerald-400 font-bold text-base">{product.price?.toLocaleString('vi-VN')}đ</span>
        {product.stock !== undefined && product.stock > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/50">
            Kho: {product.stock}
          </span>
        )}
      </div>
    </div>
    <div className="flex flex-col gap-2 shrink-0 z-10">
      <button
        onClick={() => onAddToCart(product.id, product.name)}
        className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
      >
        <ShoppingCart className="w-3.5 h-3.5" />
        Thêm
      </button>
      <button
        onClick={() => onViewDetail(product.id)}
        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg border border-slate-600 hover:border-slate-500 active:scale-95 transition-all flex items-center justify-center gap-1.5"
      >
        <Bot className="w-3.5 h-3.5" />
        Chi tiết
      </button>
    </div>
  </div>
);

// OrderCard Component for displaying orders with view detail button
interface OrderCardProps {
  order: { id: number; status: string; totalAmount: number; createdAt: string };
  onViewDetail: (orderId: number) => void;
}

const OrderCard = ({ order, onViewDetail }: OrderCardProps) => {
  const statusColors: Record<string, string> = {
    'PENDING': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'PROCESSING': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'CONFIRMED': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'SHIPPING': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'DELIVERED': 'bg-green-500/10 text-green-400 border-green-500/20',
    'CANCELLED': 'bg-red-500/10 text-red-400 border-red-500/20'
  };

  const statusTexts: Record<string, string> = {
    'PENDING': 'Chờ xử lý',
    'PROCESSING': 'Đang xử lý',
    'CONFIRMED': 'Đã xác nhận',
    'SHIPPING': 'Đang giao hàng',
    'DELIVERED': 'Giao thành công',
    'CANCELLED': 'Đã hủy'
  };

  return (
    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 hover:bg-slate-800/60 hover:border-slate-600 transition-all duration-300 hover:shadow-xl group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/0 via-slate-700/10 to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <span className={`text-lg font-bold text-slate-100 ${poppins.className}`}>#{order.id}</span>
            <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${statusColors[order.status] || 'bg-slate-700 text-slate-400'}`}>
              {statusTexts[order.status] || order.status}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-slate-400 text-xs">Tổng tiền:</span>
            <span className="text-emerald-400 font-bold text-lg">{order.totalAmount.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {new Date(order.createdAt).toLocaleString('vi-VN')}
          </div>
        </div>
        <button
          onClick={() => onViewDetail(order.id)}
          className="px-4 py-2 bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        >
          <ClipboardList className="w-4 h-4" />
          Chi tiết
        </button>
      </div>
    </div>
  );
};

export default function AIChatPage() {
  const router = useRouter();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [userHistory, setUserHistory] = useState<UserHistory | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('openai/gpt-oss-20b');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showNewChat, setShowNewChat] = useState<boolean>(false);
  const [activeModalConfig, setActiveModalConfig] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [showOrderConfirm, setShowOrderConfirm] = useState<boolean>(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [shippingAddress, setShippingAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('COD');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [cartCount, setCartCount] = useState<number>(0);
  const [showCartPreview, setShowCartPreview] = useState<boolean>(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [qrOrderData, setQrOrderData] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { showToast } = useToast();

  // Validate discount code when orderDetails changes
  useEffect(() => {
    if (orderDetails?.discountCode && orderDetails?.totalAmount) {
      validateDiscountCode(orderDetails.discountCode, orderDetails.totalAmount);
    } else {
      setDiscountAmount(0);
    }
  }, [orderDetails?.discountCode, orderDetails?.totalAmount]);

  // Function to validate discount code
  const validateDiscountCode = async (code: string, total: number) => {
    try {
      const result = await apiClient.applyDiscount(code, total) as any;
      if (result.valid && result.discountAmount) {
        setDiscountAmount(result.discountAmount);
      } else {
        setDiscountAmount(0);
      }
    } catch (error) {
      console.error('Failed to validate discount:', error);
      setDiscountAmount(0);
    }
  };

  // Scroll to bottom khi có message mới
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch cart count
  const fetchCartCount = async () => {
    try {
      if (!apiClient.isAuthenticated()) return;
      const cart: any = await apiClient.getCart();

      if (cart && cart.items) {
        const items = cart.items.map((item: any) => ({
          ...item,
          product: {
            name: item.productName,
            price: item.productPrice,
            imageUrl: item.productImageUrl
          }
        }));
        setCartItems(items);
        const count = items.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0);
        setCartCount(count);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  // Fetch cart on mount
  useEffect(() => {
    fetchCartCount();

    // Restore actions from localStorage
    try {
      const savedActions = localStorage.getItem('chatActions');
      if (savedActions) {
        const parsedActions = JSON.parse(savedActions);
        if (Array.isArray(parsedActions) && parsedActions.length > 0) {
          setActions(parsedActions);
        }
      }
    } catch (err) {
      console.error('Failed to restore actions:', err);
    }
  }, []);

  // Save actions to localStorage whenever they change
  useEffect(() => {
    if (actions.length > 0) {
      localStorage.setItem('chatActions', JSON.stringify(actions));
    } else {
      localStorage.removeItem('chatActions');
    }
  }, [actions]);

  // Khởi tạo - Lấy user từ token, tạo session cho user đó
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Lấy user data từ localStorage (được set khi login)
        const userDataStr = typeof window !== 'undefined' ? localStorage.getItem('userData') : null;

        if (!userDataStr) {
          // Không có user đăng nhập, redirect về login
          router.push('/login');
          return;
        }

        const userData: LoginResponse = JSON.parse(userDataStr);
        const authenticatedUserId = `user_${userData.userId}`;  // Use underscore to match ChromaDB format

        // Kiểm tra xem session_id của user hiện tại có trong sessionStorage không
        const savedSessionId = sessionStorage.getItem('current_session_id');
        const savedUserId = sessionStorage.getItem('user_id');

        // Nếu user khác từ lần trước, clear sessionStorage
        if (savedUserId && savedUserId !== authenticatedUserId) {
          sessionStorage.clear();
        }

        // Set user từ token
        setUserId(authenticatedUserId);
        sessionStorage.setItem('user_id', authenticatedUserId);

        // Nếu có session_id cũ, dùng lại; nếu không thì tạo mới
        if (savedSessionId && savedUserId === authenticatedUserId) {
          // User cũ + session cũ → load tin nhắn cũ
          setSessionId(savedSessionId);
          loadSessionMessages(savedSessionId);
        } else {
          // User mới hoặc chưa có session → tạo session mới + load history
          // loadUserHistoryAndSetSession sẽ xử lý lúc userId thay đổi
        }

        fetchAvailableModels();
        fetchActiveModalConfig();
      } catch (error) {
        console.error('Error initializing chat:', error);
        router.push('/login');
      }
    };

    initializeChat();
  }, [router]);

  // Khi userId được set, load history và tạo/load session
  useEffect(() => {
    if (userId) {
      loadUserHistoryAndSetSession();
    }
  }, [userId]);

  // Lấy danh sách models từ API
  const fetchAvailableModels = async () => {
    try {
      const response = await fetch(getGroqChatUrl('/models'));
      const data = await response.json();
      setAvailableModels(data.models || []);
      if (data.default_model) {
        setSelectedModel(data.default_model);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  // Lấy modal config từ admin
  const fetchActiveModalConfig = async () => {
    try {
      const response = await fetch(`${API_CONFIG.AI_SERVICE_URL}/api/admin/modal-config/active`);
      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setActiveModalConfig(data.data);
          // Set model từ config admin
          if (data.data.model) {
            setSelectedModel(data.data.model);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching active modal config:', error);
    }
  };

  // Tạo session mới (gắn user_id vào session_id để đảm bảo không share giữa users)
  const createNewSession = (uid: string) => {
    // Session ID must include user_id to prevent sharing between users
    const newSessionId = `${uid}-session-${Date.now()}`;
    setSessionId(newSessionId);
    setMessages([]);
    sessionStorage.setItem('current_session_id', newSessionId);
    setShowNewChat(false);
  };

  // Load messages của session
  const loadSessionMessages = async (sid: string) => {
    if (!userId) return;

    // Validate: session_id phải chứa user_id (để không load session của user khác)
    if (!sid.startsWith(userId)) {
      console.warn('Session ID does not match current user - creating new session');
      createNewSession(userId);
      return;
    }

    try {
      // NEW: Use user-specific endpoint: /user/{user_id}/history/{session_id}
      const response = await fetch(
        getGroqChatUrl(`/user/${userId}/history/${sid}?auth_user_id=${userId}`)
      );

      // Check for auth errors
      if (response.status === 401 || response.status === 403) {
        console.warn('Authorization failed - clearing messages');
        setMessages([]);
        createNewSession(userId);
        return;
      }

      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
      }
      setSessionId(sid);
      sessionStorage.setItem('current_session_id', sid);
    } catch (error) {
      console.error('Error loading session:', error);
      setMessages([]);
      createNewSession(userId);
    }
  };

  // Lấy toàn bộ lịch sử của user
  const loadUserHistory = async () => {
    if (!userId) return;
    try {
      const response = await fetch(getGroqChatUrl(`/user/${userId}/history?auth_user_id=${userId}`));

      // Kiểm tra nếu lỗi 401 hoặc 403 - xóa lịch sử cũ
      if (response.status === 401 || response.status === 403) {
        console.warn('Authorization failed - clearing history');
        setMessages([]);
        setUserHistory(null);
        return;
      }

      const data: UserHistory = await response.json();
      // Verify response trả về của user này, không phải user khác
      if (data.user_id && data.user_id !== userId) {
        console.error('Security: User mismatch - clearing history');
        setMessages([]);
        setUserHistory(null);
        return;
      }

      setUserHistory(data);
      setShowHistory(true);
    } catch (error) {
      console.error('Error loading user history:', error);
      // Nếu có lỗi, xóa history để an toàn
      setMessages([]);
      setUserHistory(null);
    }
  };

  // Load history và set session gần nhất (được gọi khi userId thay đổi)
  // LUÔN auto-load session gần nhất, không cần bấm nút
  const loadUserHistoryAndSetSession = async () => {
    if (!userId) return;

    const savedSessionId = sessionStorage.getItem('current_session_id');

    // Nếu đã có session_id lưu, load messages của session đó
    if (savedSessionId) {
      loadSessionMessages(savedSessionId);
      // Vẫn load history để hiển thị danh sách
      try {
        const response = await fetch(getGroqChatUrl(`/user/${userId}/history?auth_user_id=${userId}`));
        if (response.ok) {
          const data: UserHistory = await response.json();
          if (data.user_id === userId) {
            setUserHistory(data);
          }
        }
      } catch (error) {
        console.error('Error loading history:', error);
      }
      return;
    }

    // Không có session_id → load history, tìm session gần nhất + tự động load
    try {
      const response = await fetch(getGroqChatUrl(`/user/${userId}/history?auth_user_id=${userId}`));

      if (response.status === 401 || response.status === 403) {
        console.warn('Authorization failed - creating new session');
        createNewSession(userId);
        return;
      }

      const data: UserHistory = await response.json();

      if (data.user_id && data.user_id !== userId) {
        console.error('Security: User mismatch');
        createNewSession(userId);
        return;
      }

      setUserHistory(data);

      // Nếu có sessions cũ, LUÔN tự động load session gần nhất
      if (data.sessions && data.sessions.length > 0) {
        const latestSession = data.sessions[0];
        const sessionId = latestSession.session_id;

        setSessionId(sessionId);
        sessionStorage.setItem('current_session_id', sessionId);

        // Tự động load messages của session này
        loadSessionMessages(sessionId);
      } else {
        // Không có session cũ, tạo mới
        createNewSession(userId);
      }
    } catch (error) {
      console.error('Error loading user history and setting session:', error);
      createNewSession(userId);
    }
  };

  // Gửi message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const messageContent = inputValue; // Store before clearing

    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      model: activeModalConfig?.model || selectedModel,
      timestamp: new Date().toISOString(),
      user_id: userId,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      // Get auth token from localStorage
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

      const response = await fetch(getGroqChatUrl('/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          message: messageContent,
          session_id: sessionId,
          user_id: userId,
        }),
      });

      const data = await response.json();
      const aiMessage: Message = {
        role: 'assistant',
        content: data.message,
        model: data.model,
        timestamp: data.timestamp,
        user_id: userId,
        products: data.products || undefined,
        orders: data.orders || undefined, // Add orders mapping
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Save suggestions for quick replies
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      } else {
        setSuggestions([]);
      }

      // Save actions for action buttons
      if (data.actions && Array.isArray(data.actions)) {
        setActions(data.actions);
      } else {
        setActions([]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.',
        model: activeModalConfig?.model || selectedModel,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Xóa toàn bộ lịch sử của user
  const handleClearAllHistory = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử chat?')) return;

    try {
      await fetch(getGroqChatUrl(`/user/${userId}/history?auth_user_id=${userId}`), {
        method: 'DELETE',
      });
      setMessages([]);
      createNewSession(userId);
      setShowHistory(false);
      showToast('Lịch sử đã được xóa', 'success');
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  // Helper function to restore cart backup (shared across multiple functions)
  const restoreCartBackup = async (token: string, immediate: boolean = false) => {
    try {
      const backupStr = sessionStorage.getItem('cartBackup');
      if (!backupStr) {
        console.log('[RESTORE] No cart backup found');
        return;
      }

      const backupItems = JSON.parse(backupStr);
      if (!backupItems || backupItems.length === 0) {
        console.log('[RESTORE] Backup is empty');
        sessionStorage.removeItem('cartBackup');
        return;
      }

      if (!immediate) {
        console.log(`[RESTORE] Waiting for order completion and cart clear...`);
        // Wait 2 seconds for Spring Service to clear cart after order creation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify cart is empty before restoring
        const checkCartResponse = await fetch(`${API_CONFIG.AI_SERVICE_URL}/api/agent/cart`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const checkCartData = await checkCartResponse.json();
        
        if (checkCartData.success && checkCartData.cart?.items?.length > 0) {
          console.log('[RESTORE] Cart not empty yet, skipping restore to avoid duplicates');
          sessionStorage.removeItem('cartBackup');
          return;
        }
      }

      console.log(`[RESTORE] Restoring ${backupItems.length} backup items`);

      // Add each item back to cart
      for (const item of backupItems) {
        try {
          await fetch(`${API_CONFIG.AI_SERVICE_URL}/api/agent/cart/add`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              productId: item.productId || item.product?.id,
              quantity: item.quantity || 1
            })
          });
        } catch (err) {
          console.error(`[RESTORE] Failed to restore item:`, err);
        }
      }

      // Clear backup after restoration
      sessionStorage.removeItem('cartBackup');
      console.log('[RESTORE] Cart backup restored successfully');
      
      // Update cart count
      fetchCartCount();
    } catch (err) {
      console.error('[RESTORE] Error restoring cart:', err);
    }
  };

  // Execute action from AI Agent
  const executeAction = async (action: any) => {
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    if (!authToken) {
      showToast('Vui lòng đăng nhập để thực hiện thao tác này', 'error');
      return;
    }

    try {
      let result;
      let endpoint = '';
      let body: any = {};

      switch (action.type) {
        case 'ADD_TO_CART':
          endpoint = '/api/agent/cart/add';
          body = { productId: action.productId, quantity: action.quantity || 1 };
          break;

        case 'APPLY_DISCOUNT':
          console.log('[APPLY_DISCOUNT] Action data:', action);
          
          // Check if there's a pending product to add first
          if (action.pendingProductId && action.pendingQuantity) {
            console.log(`[APPLY_DISCOUNT] Clearing cart and adding pending product: ${action.pendingProductId} x ${action.pendingQuantity}`);
            
            try {
              // Step 1: Get current cart to backup
              const currentCartResponse = await fetch(`${API_CONFIG.AI_SERVICE_URL}/api/agent/cart`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
              });
              const currentCartData = await currentCartResponse.json();
              const backupItems = currentCartData.success && currentCartData.cart ? currentCartData.cart.items || [] : [];
              console.log('[APPLY_DISCOUNT] Backup cart items:', backupItems.length);
              
              // Step 2: Clear entire cart
              if (backupItems.length > 0) {
                const clearResponse = await fetch(`${API_CONFIG.AI_SERVICE_URL}/api/agent/cart/clear`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                  }
                });
                
                if (clearResponse.ok) {
                  console.log('[APPLY_DISCOUNT] Cart cleared successfully');
                } else {
                  console.warn('[APPLY_DISCOUNT] Failed to clear cart, continuing anyway');
                }
              }
              
              // Step 3: Add pending product with exact quantity
              const addResponse = await fetch(`${API_CONFIG.AI_SERVICE_URL}/api/agent/cart/add`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                  productId: action.pendingProductId,
                  quantity: action.pendingQuantity
                })
              });

              const addResult = await addResponse.json();
              console.log('[APPLY_DISCOUNT] Add to cart result:', addResult);

              if (!addResponse.ok || !addResult.success) {
                showToast('Không thể thêm sản phẩm vào giỏ hàng', 'error');
                return;
              }

              // Store backup items to restore after successful order
              sessionStorage.setItem('cartBackup', JSON.stringify(backupItems));
              console.log('[APPLY_DISCOUNT] Stored cart backup in sessionStorage');

              showToast(`Đã chuẩn bị ${action.pendingQuantity} sản phẩm cho đơn hàng`, 'success');
              
              // Store pending product info for order creation (get from add result)
              const addedItem = addResult.data?.cart?.items?.find((item: any) => 
                (item.productId || item.product?.id) === action.pendingProductId
              );
              
              if (addedItem) {
                sessionStorage.setItem('pendingOrderItem', JSON.stringify(addedItem));
                console.log('[APPLY_DISCOUNT] Stored pending order item:', addedItem);
              }
            } catch (err) {
              console.error('Failed to prepare cart:', err);
              showToast('Lỗi khi chuẩn bị giỏ hàng', 'error');
              return;
            }
          } else {
            console.log('[APPLY_DISCOUNT] No pending product, using existing cart...');
          }

          // Step 2: Open order confirmation popup with discount code pre-filled
          try {
            // Check if we have a pending order item (just added from AI)
            const pendingItemStr = sessionStorage.getItem('pendingOrderItem');
            let orderItems = [];
            
            if (pendingItemStr) {
              // Use ONLY the pending item for order, not entire cart
              const pendingItem = JSON.parse(pendingItemStr);
              orderItems = [pendingItem];
              console.log('[APPLY_DISCOUNT] Using pending item for order:', orderItems);
            } else {
              // No pending item, get from cart
              const cartResponse = await fetch(`${API_CONFIG.AI_SERVICE_URL}/api/agent/cart`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
              });
              const cartData = await cartResponse.json();
              orderItems = cartData.success && cartData.cart ? cartData.cart.items || [] : [];
            }

            if (orderItems.length > 0) {
              // Fetch user info from Spring
              try {
                const userResponse = await fetch(`${API_CONFIG.API_URL}/users/me`, {
                  headers: { 'Authorization': `Bearer ${authToken}` }
                });
                if (userResponse.ok) {
                  const userData = await userResponse.json();
                  setUserInfo(userData);
                  setShippingAddress(userData.address || '');
                }
              } catch (err) {
                console.error('Failed to fetch user info:', err);
              }

              // Set order details with discount code pre-filled
              const totalAmount = orderItems.reduce((sum: number, item: any) => {
                const price = item.product?.price || item.price || 0;
                const quantity = item.quantity || 1;
                return sum + (price * quantity);
              }, 0);
              
              setOrderDetails({
                items: orderItems,
                totalAmount: totalAmount,
                discountCode: action.discountCode, // Pre-fill discount code
                shippingAddress: ''
              });
              setPaymentMethod('COD');
              setShowOrderConfirm(true);
              showToast(`Đã áp mã ${action.discountCode}. Vui lòng xác nhận đơn hàng.`, 'success');
              setActions([]); // Clear actions
              
              // Clear pending item after use
              if (pendingItemStr) {
                sessionStorage.removeItem('pendingOrderItem');
              }
            } else {
              showToast('Giỏ hàng trống. Vui lòng thêm sản phẩm trước.', 'warning');
            }
          } catch (err) {
            showToast('Không thể lấy thông tin giỏ hàng', 'error');
          }
          return;

        case 'VIEW_PROMOTIONS':
          // Send message to AI to show promotions
          setInputValue('Xem các chương trình khuyến mãi hiện có');
          setActions([]);
          // Auto submit
          setTimeout(() => {
            const form = document.querySelector('form');
            if (form) form.requestSubmit();
          }, 100);
          return;

        case 'VIEW_CART':
          window.location.href = '/cart';
          return;

        case 'GO_TO_CHECKOUT':
          // Redirect to checkout page with source indicator
          window.location.href = '/checkout?from=ai-chat';
          return;

        case 'CHECKOUT_WITH_ITEMS':
          // Checkout with specific items from AI chat (not entire cart)
          try {
            if (!action.items || action.items.length === 0) {
              showToast('Không có sản phẩm để thanh toán', 'warning');
              return;
            }

            // Fetch user info from Spring
            const userResponse = await fetch(`${API_CONFIG.API_URL}/users/me`, {
              headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (userResponse.ok) {
              const userData = await userResponse.json();
              setUserInfo(userData);
              setShippingAddress(userData.address || '');
            }

            // Set order details with ONLY AI-selected items (not full cart)
            setOrderDetails({
              items: action.items.map((item: any) => ({
                product: {
                  id: item.productId,
                  name: item.productName,
                  price: item.price
                },
                productId: item.productId,
                quantity: item.quantity
              })),
              totalAmount: action.total || action.items.reduce((sum: number, item: any) => 
                sum + (item.price * item.quantity), 0
              ),
              discountCode: action.discountCode || '',
              shippingAddress: ''
            });
            setPaymentMethod('COD');
            setShowOrderConfirm(true);
            
            // Clear actions after opening checkout
            setActions([]);
            
            showToast('Đã chuẩn bị đơn hàng. Vui lòng xác nhận.', 'success');
          } catch (err) {
            console.error('Failed to prepare checkout:', err);
            showToast('Không thể chuẩn bị thanh toán', 'error');
          }
          return;

        case 'CREATE_ORDER':
          // Fetch cart and show confirmation popup
          try {
            const cartResponse = await fetch(`${API_CONFIG.AI_SERVICE_URL}/api/agent/cart`, {
              headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const cartData = await cartResponse.json();

            if (cartData.success && cartData.cart && cartData.cart.items?.length > 0) {
              // Fetch user info from Spring
              try {
                const userResponse = await fetch(`${API_CONFIG.API_URL}/users/me`, {
                  headers: { 'Authorization': `Bearer ${authToken}` }
                });
                if (userResponse.ok) {
                  const userData = await userResponse.json();
                  setUserInfo(userData);
                  // Pre-fill shipping address if user has one
                  setShippingAddress(userData.address || '');
                }
              } catch (err) {
                console.error('Failed to fetch user info:', err);
              }

              setOrderDetails({
                items: cartData.cart.items,
                totalAmount: cartData.cart.totalPrice || cartData.cart.totalAmount || 0,
                discountCode: action.discountCode || null,
                shippingAddress: action.shippingAddress || ''
              });
              // Reset payment method
              setPaymentMethod('COD');
              setShowOrderConfirm(true);
            } else {
              showToast('Vui lòng thêm sản phẩm vào giỏ trước khi đặt hàng', 'warning');
            }
          } catch (err) {
            showToast('Không thể lấy thông tin giỏ hàng', 'error');
          }
          return;

        default:
          showToast('Thao tác không hợp lệ', 'error');
          return;
      }

      // Execute API call for ADD_TO_CART
      result = await fetch(`${API_CONFIG.AI_SERVICE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(body)
      });

      const data = await result.json();

      if (data.success) {
        showToast(data.message || `Đã thêm ${action.productName} vào giỏ hàng!`, 'success');

        // Add confirmation message to chat
        const confirmMessage: Message = {
          role: 'assistant',
          content: `✅ **${data.message}**\n\nBạn có thể tiếp tục mua sắm hoặc xem giỏ hàng!`,
          model: 'system',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, confirmMessage]);

        // Update cart count
        fetchCartCount();

        // Show follow-up actions after adding to cart
        const followUpActions = [
          {
            type: 'GO_TO_CHECKOUT',
            label: '💳 Đi tới thanh toán'
          },
          {
            type: 'VIEW_CART',
            label: '🛒 Xem giỏ hàng'
          },
          {
            type: 'VIEW_PROMOTIONS',
            label: '🎁 Xem khuyến mãi'
          }
        ];
        setActions(followUpActions);
      } else {
        showToast(data.message || 'Không thể thực hiện thao tác', 'error');
        setActions([]); // Clear actions on error
      }
    } catch (error) {
      console.error('Action execution error:', error);
      showToast('Không thể kết nối đến server', 'error');
      setActions([]); // Clear actions on error
    }
  };

  // Handle order confirmation
  const handleConfirmOrder = async () => {
    if (!orderDetails) return;

    const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!authToken) {
      showToast('Vui lòng đăng nhập', 'error');
      return;
    }

    try {
      // Validate shipping address
      if (!shippingAddress || shippingAddress.trim() === '') {
        showToast('Vui lòng nhập địa chỉ giao hàng', 'error');
        return;
      }

      const orderData: any = {
        items: orderDetails.items.map((item: any) => ({
          productId: item.product?.id || item.productId,
          quantity: item.quantity
        })),
        shippingAddress: shippingAddress,
        paymentMethod: paymentMethod
      };

      // Add discount code if exists
      if (orderDetails.discountCode) {
        orderData.discountCode = orderDetails.discountCode;
      }

      // Call Spring API directly instead of Python proxy to avoid connection issues
      const response = await fetch(`${API_CONFIG.API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (response.ok) {
        // Check if payment method is BANK_TRANSFER and order has QR code
        const order = result;
        if (paymentMethod === 'BANK_TRANSFER' && order && order.qrCodeUrl) {
          setQrOrderData(order);
          setShowQRModal(true);
          setShowOrderConfirm(false);
          setOrderDetails(null);
          setActions([]);
          
          // Restore cart backup after successful order
          await restoreCartBackup(authToken);
        } else {
          // COD or no QR - show success toast
          showToast(`Đơn hàng #${order.id} đã được tạo thành công!` || 'Đơn hàng của bạn đã được tạo', 'success');

          // Add success message to chat
          const successMessage: Message = {
            role: 'assistant',
            content: `🎉 **Đặt hàng thành công!**\n\n${result.message}\n\nCảm ơn bạn đã mua hàng! Chúng tôi sẽ liên hệ xác nhận đơn hàng sớm nhất.`,
            model: 'system',
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, successMessage]);

          setShowOrderConfirm(false);
          setOrderDetails(null);
          setActions([]);
          
          // Restore cart backup after successful order
          await restoreCartBackup(authToken);
        }
      } else {
        showToast(result.message || 'Vui lòng thử lại', 'error');
        // Restore cart backup on order creation failure (immediate)
        await restoreCartBackup(authToken, true);
      }
    } catch (error) {
      console.error('Order creation error:', error);
      showToast('Không thể kết nối đến server', 'error');
      // Restore cart backup on error (immediate)
      await restoreCartBackup(authToken, true);
    }
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Professional Order Checkout Popup */}
      {showOrderConfirm && orderDetails && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-600/50 max-w-4xl w-full my-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <ShoppingCart className="w-7 h-7" />
                Thanh toán đơn hàng
              </h2>
              <p className="text-green-100 text-sm mt-1">Vui lòng kiểm tra kỹ thông tin trước khi xác nhận</p>
            </div>

            {/* Content - 2 Column Layout */}
            <div className="p-6 grid md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
              {/* Left Column - Customer Info */}
              <div className="space-y-6">
                {/* Customer Information Section */}
                <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-600/50">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Thông tin người đặt
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 uppercase font-semibold">Tên khách hàng</label>
                      <p className="text-white font-medium mt-1">{userInfo?.username || 'Đang tải...'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 uppercase font-semibold">Email</label>
                        <p className="text-white text-sm mt-1">{userInfo?.email || 'Đang tải...'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 uppercase font-semibold">Số điện thoại</label>
                        <p className="text-white text-sm mt-1">{userInfo?.phoneNumber || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-600/50">
                  <h3 className="text-lg font-semibold text-white mb-4">📍 Địa chỉ giao hàng</h3>
                  <textarea
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Nhập địa chỉ đầy đủ: Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    rows={4}
                    required
                  />
                </div>

                {/* Payment Method */}
                <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-600/50">
                  <h3 className="text-lg font-semibold text-white mb-4">💳 Phương thức thanh toán</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setPaymentMethod('COD')}
                      className={`w-full px-4 py-4 rounded-xl font-medium transition-all flex items-center gap-3 ${paymentMethod === 'COD'
                        ? 'bg-green-600 text-white border-2 border-green-400 shadow-lg shadow-green-500/25'
                        : 'bg-slate-800/50 text-slate-300 border border-slate-600 hover:bg-slate-700/50'
                        }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'COD' ? 'border-white' : 'border-slate-500'
                        }`}>
                        {paymentMethod === 'COD' && <div className="w-3 h-3 bg-white rounded-full"></div>}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold">💵 Thanh toán khi nhận hàng (COD)</p>
                        <p className="text-xs opacity-75 mt-0.5">Thanh toán bằng tiền mặt khi nhận hàng</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('BANK_TRANSFER')}
                      className={`w-full px-4 py-4 rounded-xl font-medium transition-all flex items-center gap-3 ${paymentMethod === 'BANK_TRANSFER'
                        ? 'bg-green-600 text-white border-2 border-green-400 shadow-lg shadow-green-500/25'
                        : 'bg-slate-800/50 text-slate-300 border border-slate-600 hover:bg-slate-700/50'
                        }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'BANK_TRANSFER' ? 'border-white' : 'border-slate-500'
                        }`}>
                        {paymentMethod === 'BANK_TRANSFER' && <div className="w-3 h-3 bg-white rounded-full"></div>}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold">🏦 Chuyển khoản ngân hàng</p>
                        <p className="text-xs opacity-75 mt-0.5">Chuyển khoản qua Internet Banking</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column - Order Summary */}
              <div className="space-y-6">
                {/* Order Items */}
                <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-600/50">
                  <h3 className="text-lg font-semibold text-white mb-4">📦 Sản phẩm đã chọn ({orderDetails.items.length})</h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {orderDetails.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-3 bg-slate-800/50 p-3 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-white text-sm">{item.productName || item.product?.name || `Sản phẩm #${item.productId}`}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {(item.productPrice || item.product?.price || 0).toLocaleString('vi-VN')}đ × {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-400">
                            {(item.subtotal || (item.productPrice || item.product?.price || 0) * item.quantity).toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Discount Code */}
                {orderDetails.discountCode && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🎫</span>
                        <div>
                          <p className="text-xs text-yellow-400 font-semibold">Mã giảm giá</p>
                          <p className="text-yellow-300 font-bold">{orderDetails.discountCode}</p>
                        </div>
                      </div>
                      <span className="font-bold text-green-400">-{discountAmount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                )}

                {/* Order Summary */}
                <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-5 border-2 border-green-500/30">
                  <h3 className="text-lg font-semibold text-white mb-4">💰 Tổng kết đơn hàng</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-slate-300">
                      <span>Tạm tính ({orderDetails.items.length} sản phẩm)</span>
                      <span className="font-medium">{(orderDetails.totalAmount || 0).toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Phí vận chuyển</span>
                      <span className="font-medium text-green-400">Miễn phí</span>
                    </div>
                    {orderDetails.discountCode && (
                      <div className="flex justify-between text-yellow-400">
                        <span>Giảm giá ({orderDetails.discountCode})</span>
                        <span className="font-medium">-{discountAmount.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                    <div className="border-t border-slate-600 pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-white">Tổng cộng</span>
                        <div className="text-right">
                          <span className="text-3xl font-bold text-green-400">
                            {((orderDetails.totalAmount || 0) - discountAmount).toLocaleString('vi-VN')}đ
                          </span>
                          <p className="text-xs text-slate-400 mt-1">(Đã bao gồm VAT)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Note */}
                <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-600/50">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">📝 Ghi chú đơn hàng (tùy chọn)</h3>
                  <textarea
                    placeholder="Thêm ghi chú cho đơn hàng của bạn..."
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-800/50 border-t border-slate-600/50 flex gap-4">
              <button
                onClick={async () => {
                  setShowOrderConfirm(false);
                  setOrderDetails(null);
                  
                  // Restore cart backup when user cancels
                  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
                  if (authToken) {
                    await restoreCartBackup(authToken, true); // immediate restore on cancel
                    showToast('Đã khôi phục giỏ hàng', 'success');
                  }
                }}
                className="flex-1 px-6 py-4 bg-slate-600 hover:bg-slate-500 text-white rounded-xl transition-all font-semibold"
              >
                ← Quay lại
              </button>
              <button
                onClick={handleConfirmOrder}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-xl transition-all font-bold shadow-lg shadow-green-500/25 flex items-center justify-center gap-2"
              >
                <span className="text-xl">✓</span>
                Xác nhận đặt hàng
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white overflow-hidden">
        {/* Sidebar */}
        <div className="w-[280px] bg-slate-900/95 backdrop-blur-xl border-r border-white/10 flex flex-col overflow-hidden shadow-2xl relative z-20">
          {/* Header */}
          <div className="p-6 border-b border-white/5 bg-slate-900/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-lg font-bold text-white leading-tight ${poppins.className}`}>AI Assistant</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Online</span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">ID:</span>
                <span className="text-slate-300 font-mono bg-slate-800/50 px-2 py-0.5 rounded">{userId.substring(0, 8)}...</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Session:</span>
                <span className="text-indigo-300 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">{sessionId.substring(0, 8)}...</span>
              </div>
            </div>
          </div>

          {/* New Chat Button */}
          <div className="p-4 pb-2">
            <button
              onClick={() => createNewSession(userId)}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group border border-white/10"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              <span>Cuộc hội thoại mới</span>
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent hover:scrollbar-thumb-slate-600 transition-colors">
            <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Gần đây</div>
            {userHistory?.sessions.map((session) => (
              <button
                key={session.session_id}
                onClick={() => loadSessionMessages(session.session_id)}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 group relative overflow-hidden border ${sessionId === session.session_id
                  ? 'bg-slate-800 border-indigo-500/50 shadow-md'
                  : 'bg-transparent border-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                  }`}
              >
                {sessionId === session.session_id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl" />
                )}
                <div className="flex flex-col gap-1 pl-2">
                  <span className={`text-sm font-medium truncate ${sessionId === session.session_id ? 'text-white' : ''}`}>
                    {session.messages.length > 0
                      ? session.messages[session.messages.length - 1].content.substring(0, 40)
                      : 'Trò chuyện mới'}
                  </span>
                  <div className="flex items-center justify-between text-[10px] opacity-60">
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {session.message_count}</span>
                    <span>{session.messages.length > 0 && new Date(session.messages[session.messages.length - 1].timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/5 space-y-2 bg-slate-900/50">
            <button
              onClick={handleClearAllHistory}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium group"
            >
              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Xóa lịch sử & làm mới
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Thoát chế độ Agent
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative bg-slate-950 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900/0 to-slate-900/0 pointer-events-none" />

          {/* Top Bar */}
          <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/5 p-4 flex justify-between items-center z-10 sticky top-0 shadow-sm">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Agent Chat <span className="text-slate-600 font-light">/</span> Powered by LLM
                </h2>
                <p className="text-xs text-slate-500 font-medium tracking-wide">AI-POWERED ASSISTANT</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="px-3 py-1.5 bg-slate-800/50 rounded-lg border border-white/5 backdrop-blur-sm shadow-inner">
                <div className="text-slate-300 text-xs font-mono flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  {activeModalConfig ? (
                    <span>{activeModalConfig.modal_name}</span>
                  ) : (
                    <span>{selectedModel.split('/')[1] || selectedModel}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 relative z-0 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8 md:p-12 max-w-3xl">
                  {/* Main Icon */}
                  <div className="relative inline-block mb-8">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-2xl shadow-blue-500/30 animate-pulse">
                      <MessageSquare className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-slate-900 flex items-center justify-center">
                      <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                    </div>
                  </div>

                  {/* Welcome Text */}
                  <h3 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Xin chào! 👋
                  </h3>
                  <p className="text-slate-400 text-base md:text-lg mb-8 leading-relaxed">
                    Tôi là trợ lý AI của bạn. Hãy hỏi tôi về sản phẩm,<br className="hidden md:block" />
                    đơn hàng hoặc bất cứ điều gì bạn cần hỗ trợ.
                  </p>

                  {/* Feature Cards */}
                  <div className="grid md:grid-cols-3 gap-4 mt-8">
                    <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/60 hover:border-blue-500/30 transition-all group">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ShoppingCart className="w-6 h-6 text-blue-400" />
                      </div>
                      <h4 className="font-semibold text-white mb-1 text-sm">Tư vấn sản phẩm</h4>
                      <p className="text-xs text-slate-400">Tìm kiếm & đề xuất sản phẩm phù hợp</p>
                    </div>

                    <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/60 hover:border-indigo-500/30 transition-all group">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ClipboardList className="w-6 h-6 text-indigo-400" />
                      </div>
                      <h4 className="font-semibold text-white mb-1 text-sm">Tra cứu đơn hàng</h4>
                      <p className="text-xs text-slate-400">Kiểm tra trạng thái & lịch sử đơn</p>
                    </div>

                    <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/60 hover:border-purple-500/30 transition-all group">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Bot className="w-6 h-6 text-purple-400" />
                      </div>
                      <h4 className="font-semibold text-white mb-1 text-sm">Hỗ trợ 24/7</h4>
                      <p className="text-xs text-slate-400">Trả lời nhanh mọi thắc mắc</p>
                    </div>
                  </div>

                  {/* Quick Suggestions */}
                  <div className="mt-8">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Gợi ý câu hỏi</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <button className="px-4 py-2 bg-slate-800/60 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 rounded-full text-sm text-slate-300 hover:text-white transition-all">
                        💼 Sản phẩm mới nhất
                      </button>
                      <button className="px-4 py-2 bg-slate-800/60 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 rounded-full text-sm text-slate-300 hover:text-white transition-all">
                        📦 Đơn hàng của tôi
                      </button>
                      <button className="px-4 py-2 bg-slate-800/60 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 rounded-full text-sm text-slate-300 hover:text-white transition-all">
                        🎯 Khuyến mãi hot
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} chat-message-enter`}
                >
                  <div
                    className={`max-w-4xl rounded-2xl p-5 shadow-sm transition-all duration-200 chat-message relative group ${msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-500/20'
                      : 'bg-slate-900/60 backdrop-blur-md text-slate-200 rounded-tl-sm border border-slate-700/50 shadow-sm'
                      } ${poppins.className}`}
                  >
                    <div className="text-xs font-semibold mb-2 opacity-75 uppercase tracking-wide flex items-center gap-1.5">
                      {msg.role === 'user' ? <><User className="w-3.5 h-3.5" /> Bạn</> : <><Bot className="w-3.5 h-3.5" /> Agent</>}
                    </div>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:mt-3 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }: any) => <p className="text-base leading-relaxed mb-2">{children}</p>,
                            strong: ({ children }: any) => <strong className="font-semibold text-white bg-slate-600/50 px-1 rounded">{children}</strong>,
                            em: ({ children }: any) => <em className="italic text-slate-200">{children}</em>,
                            ul: ({ children }: any) => <ul className="my-2 space-y-1 list-disc list-inside">{children}</ul>,
                            ol: ({ children }: any) => <ol className="my-2 space-y-1 list-decimal list-inside">{children}</ol>,
                            li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
                            code: ({ inline, children }: any) => inline ? (
                              <code className="bg-slate-600 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                            ) : (
                              <code className="block bg-slate-600 text-slate-100 p-3 rounded-lg text-sm font-mono overflow-x-auto my-2">{children}</code>
                            ),
                            blockquote: ({ children }: any) => (
                              <blockquote className="border-l-4 border-blue-400 pl-4 my-2 italic text-slate-300">{children}</blockquote>
                            ),
                            h1: ({ children }: any) => <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>,
                            h2: ({ children }: any) => <h2 className="text-lg font-bold text-white mt-3 mb-2">{children}</h2>,
                            h3: ({ children }: any) => <h3 className="text-base font-semibold text-white mt-3 mb-1">{children}</h3>,
                            table: ({ children }: any) => (
                              <div className="overflow-x-auto my-3 rounded-lg">
                                <table className="min-w-full border-collapse border border-slate-600">{children}</table>
                              </div>
                            ),
                            thead: ({ children }: any) => <thead className="bg-slate-600">{children}</thead>,
                            tbody: ({ children }: any) => <tbody className="bg-slate-700">{children}</tbody>,
                            tr: ({ children }: any) => <tr className="border-b border-slate-600">{children}</tr>,
                            th: ({ children }: any) => <th className="border border-slate-600 px-3 py-2 text-left font-semibold text-white text-sm">{children}</th>,
                            td: ({ children }: any) => <td className="border border-slate-600 px-3 py-2 text-slate-200 text-sm">{children}</td>,
                            a: ({ children, href }: any) => (
                              <a href={href as string} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
                                {children}
                              </a>
                            ),
                            img: ({ src, alt }: any) => {
                              // Check if image is in table context (smaller thumbnail)
                              const isTableImage = src?.toString().includes('imageUrl') || alt?.toString().toLowerCase().includes('product');
                              return isTableImage ? (
                                <img
                                  src={src as string}
                                  alt={alt as string || 'Product'}
                                  className="w-16 h-16 rounded-md shadow border border-slate-600 object-cover inline-block"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=No+Image';
                                  }}
                                />
                              ) : (
                                <figure className="my-3 inline-block">
                                  <img
                                    src={src as string}
                                    alt={alt as string}
                                    className="w-[200px] h-[200px] rounded-lg shadow-lg border border-slate-600 hover:shadow-xl transition-shadow duration-300 object-cover"
                                    loading="lazy"
                                  />
                                  {alt && (
                                    <figcaption className="mt-2 text-center text-sm font-medium text-slate-300 bg-slate-700/50 rounded-md px-2 py-1 max-w-[200px]">
                                      {alt}
                                    </figcaption>
                                  )}
                                </figure>
                              );
                            },
                          } as any}
                        >
                          {msg.content}
                        </ReactMarkdown>

                        {/* Inline Product Cards */}
                        {msg.products && msg.products.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-xs text-green-400 font-semibold uppercase tracking-wide">📦 Sản phẩm đề xuất:</p>
                            {msg.products.map((product: InlineProduct) => (
                              <ProductCard
                                key={product.id}
                                product={product}
                                onAddToCart={async (productId, productName) => {
                                  if (!apiClient.isAuthenticated()) {
                                    showToast('Vui lòng đăng nhập', 'error');
                                    return;
                                  }
                                  try {
                                    await apiClient.addToCart(productId, 1);
                                    showToast(`Đã thêm ${productName} vào giỏ`, 'success');
                                    fetchCartCount();
                                  } catch (err) {
                                    showToast('Không thể thêm vào giỏ', 'error');
                                  }
                                }}
                                onViewDetail={async (productId) => {
                                  // Gửi message tự động để AI mô tả sản phẩm
                                  const productName = product.name;
                                  const detailMessage = `Cho tôi xem chi tiết về sản phẩm ${productName}`;

                                  // Add user message
                                  const userMsg: Message = {
                                    role: 'user',
                                    content: detailMessage,
                                    model: 'user',
                                    timestamp: new Date().toISOString(),
                                    user_id: userId,
                                  };
                                  setMessages((prev) => [...prev, userMsg]);
                                  setInputValue('');
                                  setLoading(true);

                                  // Send to AI
                                  try {
                                    const authToken = localStorage.getItem('authToken');
                                    const response = await fetch(getGroqChatUrl('/chat'), {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', 'Authorization': authToken ? `Bearer ${authToken}` : '' },
                                      body: JSON.stringify({
                                        message: detailMessage,
                                        session_id: sessionId,
                                        user_id: userId,
                                      }),
                                    });
                                    const data = await response.json();
                                    const aiMessage: Message = {
                                      role: 'assistant',
                                      content: data.message,
                                      model: data.model,
                                      timestamp: data.timestamp,
                                      user_id: userId,
                                      products: data.products || undefined,
                                    };
                                    setMessages((prev) => [...prev, aiMessage]);
                                    if (data.actions) setActions(data.actions);
                                  } catch (err) {
                                    console.error('Error fetching product details:', err);
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                              />
                            ))}
                          </div>
                        )}

                        {/* Orders Display */}
                        {msg.orders && msg.orders.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide">📦 Đơn hàng của bạn:</p>
                            {msg.orders.map((order) => (
                              <OrderCard
                                key={order.id}
                                order={order}
                                onViewDetail={(orderId) => {
                                  setSelectedOrderId(orderId);
                                }}
                              />
                            ))}
                          </div>
                        )}

                      </div>
                    ) : (
                      <p className="text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}
                    <div className="text-xs opacity-50 mt-2.5">
                      {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
            {loading && <TypingIndicator />}

            {/* Action Buttons from AI Agent */}
            {!loading && actions.length > 0 && messages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <span className="text-xs text-green-400 w-full mb-1">🤖 Thao tác có sẵn:</span>
                {actions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => executeAction(action)}
                    className="px-4 py-2 text-sm bg-green-600/30 hover:bg-green-500/50 text-green-200 hover:text-white rounded-full border border-green-500/50 hover:border-green-400 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/20 flex items-center gap-2"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Quick Reply Suggestions */}
            {!loading && suggestions.length > 0 && messages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <span className="text-xs text-slate-400 w-full mb-1">💡 Gợi ý nhanh:</span>
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputValue(suggestion);
                      setSuggestions([]);
                      // Don't clear actions here - let new response update them
                      // Auto submit
                      const form = document.querySelector('form');
                      if (form) {
                        setTimeout(() => form.requestSubmit(), 100);
                      }
                    }}
                    className="px-4 py-2 text-sm bg-slate-700/50 hover:bg-blue-600/50 text-slate-200 hover:text-white rounded-full border border-slate-600/50 hover:border-blue-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Modern Floating Design */}
          <div className="p-4 md:p-6 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 relative z-10">
            <form onSubmit={handleSendMessage} className="flex gap-3 relative max-w-5xl mx-auto">
              {/* Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

              <div className="relative flex-1 group">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  disabled={loading}
                  className={`w-full px-5 py-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-800 focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50 transition-all duration-300 font-medium shadow-inner ${inter.className}`}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className={`px-6 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-2xl font-bold transition-all duration-200 shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2 min-w-[100px] ${poppins.className}`}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Gửi</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Cart Icon */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCartPreview(!showCartPreview)}
                  className="h-full px-5 rounded-2xl bg-slate-800/50 hover:bg-slate-700 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white transition-all shadow-sm flex items-center justify-center"
                  title="Giỏ hàng"
                >
                  <div className="relative">
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40">
                        {cartCount}
                      </span>
                    )}
                  </div>
                </button>
                {/* Cart Preview (Keep existing logic visual) */}
                {showCartPreview && (
                  <div className="absolute bottom-full right-0 mb-4 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
                    <div className="bg-slate-800 p-3 border-b border-slate-700">
                      <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
                        <ShoppingCart className="w-4 h-4 text-emerald-400" /> Giỏ hàng ({cartCount})
                      </h3>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                      {cartItems.length > 0 ? (
                        cartItems.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center bg-slate-800/50 p-2 rounded-lg text-xs group hover:bg-slate-800 transition-colors">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-medium text-slate-300 truncate">{item.product?.name || `SP #${item.productId}`}</p>
                              <p className="text-slate-500">SL: {item.quantity}</p>
                            </div>
                            <p className="text-emerald-400 font-semibold whitespace-nowrap">
                              {((item.product?.price || 0) * item.quantity).toLocaleString('vi-VN')}đ
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-slate-500 py-6 text-sm">Giỏ hàng trống</p>
                      )}
                    </div>
                    {cartItems.length > 0 && (
                      <div className="p-2 border-t border-slate-700 bg-slate-800/50">
                        <button
                          onClick={() => window.location.href = '/cart'}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wide transition-all"
                        >
                          Xem giỏ hàng
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* History Modal */}
        {showHistory && userHistory && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-2xl w-full max-h-96 overflow-hidden shadow-2xl border border-slate-700/50">
              <div className="p-8 border-b border-slate-700/50 sticky top-0 bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-md">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2 flex items-center gap-2"><ClipboardList className="w-6 h-6 text-blue-400" /> Lịch sử Chat</h3>
                <p className="text-sm text-slate-400">
                  <span className="text-blue-400 font-bold">{userHistory.total_sessions}</span> session -
                  <span className="text-purple-400 font-bold ml-1">{userHistory.total_messages}</span> tin nhắn
                </p>
              </div>

              <div className="p-6 space-y-3 overflow-y-auto max-h-[calc(100%-120px)]">
                {userHistory.sessions.map((session) => (
                  <div
                    key={session.session_id}
                    className="border border-slate-600/50 rounded-xl p-4 hover:bg-slate-700/50 transition-all duration-300 cursor-pointer group hover:scale-102 hover:shadow-lg bg-slate-700/20 backdrop-blur-sm"
                    onClick={() => {
                      loadSessionMessages(session.session_id);
                      setShowHistory(false);
                    }}
                  >
                    <div className="font-semibold text-blue-400 mb-2 group-hover:text-blue-300 transition-colors">
                      <MessageSquare className="w-4 h-4 inline mr-1" /> Session
                    </div>
                    <div className="text-sm text-slate-300 mb-2 font-medium truncate group-hover:translate-x-1 transition-transform">
                      {session.messages.length > 0
                        ? session.messages[0].content.substring(0, 50) + '...'
                        : 'Không có tin nhắn'}
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{session.message_count} tin nhắn</span>
                      <span>
                        {session.messages.length > 0
                          ? new Date(session.messages[session.messages.length - 1].timestamp).toLocaleDateString('vi-VN')
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-slate-700/50 sticky bottom-0 bg-slate-800/50 backdrop-blur-md">
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 rounded-xl transition-all duration-300 hover:shadow-lg active:scale-95 font-semibold"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Panel - Slide in from right */}
      {selectedOrderId && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-opacity duration-500"
            onClick={() => setSelectedOrderId(null)}
          />

          {/* Detail Panel */}
          <div className="fixed top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 shadow-2xl z-[70] animate-slide-in-right bg-white dark:bg-gray-900 overflow-hidden">
            <OrderDetailPanel
              orderId={selectedOrderId}
              onClose={() => setSelectedOrderId(null)}
            />
          </div>
        </>
      )}

      {/* QR Code Modal for Bank Transfer */}
      {showQRModal && qrOrderData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-green-500/30 max-w-md w-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">💳 Thanh toán QR</h2>
                  <p className="text-green-100 text-sm">Đơn hàng #{qrOrderData.id}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-green-500/10 border border-yellow-500/30 rounded-xl p-4">
                <p className="text-green-300 text-sm font-medium text-center">
                  📱 Quét mã QR bằng ứng dụng ngân hàng
                </p>
              </div>

              {/* QR Code */}
              {qrOrderData.qrCodeUrl && (
                <div className="bg-white p-4 rounded-xl">
                  <img
                    src={qrOrderData.qrCodeUrl}
                    alt="VietQR Code"
                    className="w-48 h-48 mx-auto object-contain"
                  />
                </div>
              )}

              {/* Bank Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ngân hàng:</span>
                  <span className="text-white font-semibold">MB Bank</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">STK:</span>
                  <span className="text-white font-semibold">0889559357</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tên TK:</span>
                  <span className="text-white font-semibold">NGUYEN VAN HOANG</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Số tiền:</span>
                  <span className="text-emerald-400 font-bold text-lg">{qrOrderData.totalAmount?.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nội dung:</span>
                  <span className="text-white font-semibold">DH{qrOrderData.id}</span>
                </div>
              </div>

              <p className="text-blue-400 text-xs text-center">
                ℹ️ Số tiền và nội dung sẽ tự động điền khi quét QR
              </p>

              {/* Close Button */}
              <button
                onClick={async () => {
                  // Auto-confirm order for testing
                  try {
                    await apiClient.updateOrderStatus(qrOrderData.id, 'CONFIRMED');
                  } catch (error) {
                    console.error('Failed to update order status:', error);
                  }
                  setShowQRModal(false);
                  showToast('Đơn hàng đã được xác nhận.', 'success');

                  // Add success message to chat
                  const successMessage: Message = {
                    role: 'assistant',
                    content: `🎉 **Đặt hàng thành công!**\n\nĐơn hàng #${qrOrderData.id} đã được xác nhận.\n\nCảm ơn bạn đã mua hàng! Chúng tôi sẽ liên hệ xác nhận đơn hàng sớm nhất.`,
                    model: 'system',
                    timestamp: new Date().toISOString(),
                  };
                  setMessages((prev) => [...prev, successMessage]);
                }}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Đã hiểu, đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
