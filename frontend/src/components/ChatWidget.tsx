'use client';

import { useState, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api';

// Python AI Service URL
const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://113.178.203.147:5000';

// Generate a unique session ID for this widget instance
const generateSessionId = () => {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('chat_widget_session') : null;
  if (stored) return stored;
  const newId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  if (typeof window !== 'undefined') {
    localStorage.setItem('chat_widget_session', newId);
  }
  return newId;
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId] = useState(generateSessionId);
  const [aiModel, setAiModel] = useState('gemini-2.0-flash');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Xin chào! Tôi là AI Agent của cửa hàng. Tôi có thể giúp bạn tìm kiếm sản phẩm, tư vấn mua hàng và trả lời các câu hỏi. Bạn cần hỗ trợ gì?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load AI config from server
  useEffect(() => {
    const loadAIConfig = async () => {
      try {
        const res = await fetch(`${AI_SERVICE_URL}/ai-config/user-config`);
        if (res.ok) {
          const config = await res.json();
          setAiModel(config.model);
        }
      } catch (err) {
        console.error('Failed to load AI config:', err);
      }
    };
    loadAIConfig();
  }, []);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Send message to AI
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Get user data for context
    const userData = apiClient.getUserData();
    const userId = userData?.userId?.toString() || 'anonymous';

    try {
      // Try streaming first
      let streamingSuccess = false;
      
      try {
        const response = await fetch(`${AI_SERVICE_URL}/gemini/chat/rag/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify({
            message: userMessage.content,
            model: aiModel,
            session_id: sessionId,
            user_id: userId,
          }),
        });

        if (!response.ok) {
          throw new Error('Streaming failed');
        }

      // Create assistant message placeholder
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        },
      ]);
      setIsStreaming(true);

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6).trim();
                  if (!jsonStr) continue;
                  
                  const data = JSON.parse(jsonStr);
                  if (data.type === 'chunk' && data.text) {
                    fullContent += data.text;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: fullContent }
                          : msg
                      )
                    );
                  } else if (data.type === 'error') {
                    throw new Error(data.error);
                  }
                } catch (parseError) {
                  // Skip invalid JSON lines
                  console.debug('Skip non-JSON line:', line);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        streamingSuccess = fullContent.length > 0;
      }

      // If streaming didn't work, show error
      if (!streamingSuccess) {
        throw new Error('Streaming returned no content');
      }

      setIsStreaming(false);
      } catch (streamError) {
        console.log('Streaming failed, trying fallback:', streamError);
        setIsStreaming(false);
        
        // Try non-streaming fallback
        try {
          const response = await fetch(`${AI_SERVICE_URL}/gemini/chat/rag`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: userMessage.content,
              model: aiModel,
              session_id: sessionId,
              user_id: userId,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response,
                timestamp: new Date(),
              },
            ]);
          } else {
            throw new Error('Fallback also failed');
          }
        } catch (fallbackError) {
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.',
              timestamp: new Date(),
            },
          ]);
        }
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick action buttons with SVG icons
  const quickActions = [
    { label: 'Sản phẩm hot', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z', message: 'Sản phẩm nào đang bán chạy nhất?' },
    { label: 'Khuyến mãi', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', message: 'Có chương trình khuyến mãi nào không?' },
    { label: 'Đơn hàng', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', message: 'Làm sao để theo dõi đơn hàng?' },
    { label: 'Đổi trả', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', message: 'Chính sách đổi trả như thế nào?' },
  ];

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
        }`}
      >
        {isOpen ? (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <div className="relative">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {/* Notification dot */}
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
          </div>
        )}
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></span>
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg">AI Agent</h3>
            <p className="text-white/80 text-sm flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Đang hoạt động
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-md'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-md rounded-bl-md'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">AI Agent</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                  {isStreaming && message.role === 'assistant' && message === messages[messages.length - 1] && (
                    <span className="inline-block w-2 h-4 bg-blue-600 ml-1 animate-pulse"></span>
                  )}
                </p>
                <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                  {message.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && !isStreaming && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-sm text-gray-500">AI đang suy nghĩ...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 2 && (
          <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Gợi ý câu hỏi:</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInputValue(action.message);
                    inputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-full transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                  </svg>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            Powered by Google Gemini AI
          </p>
        </div>
      </div>
    </>
  );
}
