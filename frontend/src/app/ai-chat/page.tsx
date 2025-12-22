'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Bot, Trash2, MessageSquare, User, Send, ClipboardList, ArrowLeft } from 'lucide-react';
import { API_CONFIG, getGroqChatUrl } from '@/config/api.config';
import { useToast } from '@/components/Toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model: string;
  timestamp: string;
  user_id?: string;
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
        <span className="text-slate-400 text-sm">Đang trả lời...</span>
      </div>
    </div>
  </div>
);

export default function AIChatPage() {
  const router = useRouter();
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { addToast } = useToast();

  // Scroll to bottom khi có message mới
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      };
      setMessages((prev) => [...prev, aiMessage]);
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
      addToast({
        type: 'success',
        title: 'Thành công',
        message: 'Lịch sử đã được xóa'
      });
    } catch (error) {
      console.error('Error clearing history:', error);
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
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Agent Chat</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium">User: <span className="text-blue-400">{userId.substring(0, 12)}...</span></p>
          <p className="text-xs text-slate-400 font-medium mt-1">Session: <span className="text-purple-400">{sessionId.substring(0, 12)}...</span></p>
        </div>

        {/* New Chat Button */}
        <button
          onClick={() => {
            createNewSession(userId);
          }}
          className="m-4 p-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-md"
        >
          <Plus className="w-5 h-5" />
          Cuộc trò chuyện mới
        </button>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {userHistory?.sessions.map((session) => (
            <button
              key={session.session_id}
              onClick={() => loadSessionMessages(session.session_id)}
              className={`w-full text-left p-3 rounded-lg transition-all duration-300 truncate group ${sessionId === session.session_id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                  : 'bg-slate-700/40 hover:bg-slate-600/40 text-slate-200 hover:text-white hover:scale-105 border border-slate-600/30'
                }`}
            >
              <div className="text-xs font-bold mb-1 opacity-75">SESSION</div>
              <div className="text-sm font-semibold truncate group-hover:translate-x-1 transition-transform">
                {session.messages.length > 0
                  ? session.messages[session.messages.length - 1].content.substring(0, 30) + '...'
                  : 'Trống'}
              </div>
              <div className="text-xs text-slate-400 mt-1">{session.message_count} tin nhắn</div>
            </button>
          ))}
        </div>

        {/* Clear History */}
        <button
          onClick={handleClearAllHistory}
          className="m-4 p-3 bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-700 hover:to-red-800 rounded-xl text-sm transition-all duration-300 hover:shadow-lg active:scale-95 font-medium backdrop-blur-sm border border-red-500/30"
        >
          <Trash2 className="w-4 h-4 mr-1 inline" /> Xóa lịch sử
        </button>

        {/* Exit Button */}
        <button
          onClick={() => router.push('/')}
          className="m-4 p-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 rounded-xl text-sm transition-all duration-300 hover:shadow-lg active:scale-95 font-medium backdrop-blur-sm border border-slate-500/30"
        >
          <ArrowLeft className="w-4 h-4 mr-1 inline" /> Thoát chế độ Agent
        </button>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-md border-b border-slate-700/50 p-6 flex justify-between items-center shadow-lg">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Agent Chat - Groq</h2>
            <p className="text-sm text-slate-400">Trò chuyện với AI Agent thông minh</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-slate-700/40 rounded-xl border border-slate-600/50 backdrop-blur-sm">
              <div className="text-white text-sm font-medium">
                {activeModalConfig ? (
                  <span>Modal: {activeModalConfig.modal_name}</span>
                ) : (
                  <span>Modal: {selectedModel.split('/')[1] || selectedModel}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-gradient-to-b from-transparent via-slate-900/20 to-slate-900/40">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center animate-bounce"><MessageSquare className="w-12 h-12 text-blue-400" /></div>
                <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Bắt đầu cuộc trò chuyện</h3>
                <p className="text-slate-400 text-lg">
                  Nhập tin nhắn của bạn để bắt đầu với Agent Chat
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} chat-message-enter`}
              >
                <div
                  className={`max-w-2xl rounded-2xl p-5 shadow-lg transition-all duration-500 hover:shadow-2xl chat-message ${msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-none hover:from-blue-500 hover:to-blue-600'
                      : 'bg-gradient-to-r from-slate-700 to-slate-800 text-slate-100 rounded-bl-none border border-slate-600/50 hover:from-slate-600 hover:to-slate-700'
                    }`}
                >
                  <div className="text-xs font-bold mb-2 opacity-75 uppercase tracking-wide flex items-center gap-1">
                    {msg.role === 'user' ? <><User className="w-3 h-3" /> Bạn</> : <><Bot className="w-3 h-3" /> Agent</>}
                  </div>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:mt-3 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="text-base leading-relaxed mb-2">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-white bg-slate-600/50 px-1 rounded">{children}</strong>,
                          em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
                          ul: ({ children }) => <ul className="my-2 space-y-1 list-disc list-inside">{children}</ul>,
                          ol: ({ children }) => <ol className="my-2 space-y-1 list-decimal list-inside">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          code: ({ inline, children }) => inline ? (
                            <code className="bg-slate-600 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                          ) : (
                            <code className="block bg-slate-600 text-slate-100 p-3 rounded-lg text-sm font-mono overflow-x-auto my-2">{children}</code>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-blue-400 pl-4 my-2 italic text-slate-300">{children}</blockquote>
                          ),
                          h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-lg font-bold text-white mt-3 mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-base font-semibold text-white mt-3 mb-1">{children}</h3>,
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-4">
                              <table className="min-w-full border-collapse border border-slate-600">{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => <thead className="bg-slate-600">{children}</thead>,
                          tbody: ({ children }) => <tbody className="bg-slate-700">{children}</tbody>,
                          tr: ({ children }) => <tr className="border-b border-slate-600">{children}</tr>,
                          th: ({ children }) => <th className="border border-slate-600 px-4 py-2 text-left font-semibold text-white">{children}</th>,
                          td: ({ children }) => <td className="border border-slate-600 px-4 py-2 text-slate-200">{children}</td>,
                          a: ({ children, href }) => (
                            <a href={href as string} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
                              {children}
                            </a>
                          ),
                          img: ({ src, alt }) => (
                            <img
                              src={src as string}
                              alt={alt as string}
                              className="max-w-full h-auto rounded-lg shadow-lg my-4 border border-slate-600 hover:shadow-xl transition-shadow duration-300"
                              loading="lazy"
                            />
                          ),
                        } as any}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                  <div className="text-xs opacity-50 mt-3">
                    {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-gradient-to-t from-slate-900 to-slate-800/50 backdrop-blur-md border-t border-slate-700/50 p-6 shadow-2xl">
          <form onSubmit={handleSendMessage} className="flex gap-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Nhập tin nhắn của bạn..."
              disabled={loading}
              className="flex-1 px-6 py-4 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 backdrop-blur-sm transition-all duration-300 font-medium"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 disabled:opacity-50 rounded-xl font-bold transition-all duration-300 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed shadow-lg hover:scale-105 flex items-center justify-center gap-2 min-w-32"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  Gửi
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
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
  );
}
