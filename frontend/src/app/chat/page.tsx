'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';

// Python AI Service URL
const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://113.178.203.147:5000';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export default function ChatPage() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [allowModelChange, setAllowModelChange] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get user info
  const userData = apiClient.getUserData();
  const userId = userData?.userId?.toString() || 'anonymous';
  const sessionId = `user_${userId}_session`; // Mỗi user chỉ có 1 session duy nhất

  // Load AI config from server
  useEffect(() => {
    const loadAIConfig = async () => {
      try {
        const res = await fetch(`${AI_SERVICE_URL}/ai-config/user-config`);
        if (res.ok) {
          const config = await res.json();
          setSelectedModel(config.model);
          setAllowModelChange(config.allow_change);
        }
      } catch (err) {
        console.error('Failed to load AI config:', err);
      }
    };
    loadAIConfig();
  }, []);

  // Load user's single conversation from localStorage
  useEffect(() => {
    const storageKey = `ai_conversation_${userId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      setConversation({
        ...parsed,
        id: sessionId,
        createdAt: new Date(parsed.createdAt),
        messages: parsed.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
      });
    } else {
      // Create new conversation for this user
      setConversation({
        id: sessionId,
        title: 'Cuộc hội thoại của bạn',
        messages: [],
        createdAt: new Date(),
      });
    }
  }, [userId, sessionId]);

  // Save conversation to localStorage
  useEffect(() => {
    if (conversation && conversation.messages.length > 0) {
      const storageKey = `ai_conversation_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify(conversation));
    }
  }, [conversation, userId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  // Auto resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  // Clear conversation (reset chat)
  const clearConversation = () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử chat?')) {
      const newConv = {
        id: sessionId,
        title: 'Cuộc hội thoại của bạn',
        messages: [],
        createdAt: new Date(),
      };
      setConversation(newConv);
      localStorage.removeItem(`ai_conversation_${userId}`);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading || !conversation) return;

    const conv = conversation;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    // Update conversation title if first message
    let updatedConv = conv;
    if (conv.messages.length === 0) {
      updatedConv = { ...conv, title: inputValue.slice(0, 30) + (inputValue.length > 30 ? '...' : '') };
    }

    const updatedMessages = [...updatedConv.messages, userMessage];
    updatedConv = { ...updatedConv, messages: updatedMessages };
    
    setConversation(updatedConv);
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setIsLoading(true);

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
            model: selectedModel,
            session_id: sessionId,
            user_id: userId,
          }),
        });

        if (!response.ok) {
          throw new Error('Streaming failed');
        }

        // Create assistant message placeholder
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        };

        const messagesWithAssistant = [...updatedMessages, assistantMessage];
        const convWithAssistant = { ...updatedConv, messages: messagesWithAssistant };
        setConversation(convWithAssistant);
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
                      const updatedAssistantMessage = { ...assistantMessage, content: fullContent };
                      const newMessages = [...updatedMessages, updatedAssistantMessage];
                      const newConv = { ...updatedConv, messages: newMessages };
                      setConversation(newConv);
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

        // If streaming didn't work, throw to use fallback
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
              model: selectedModel,
              session_id: sessionId,
              user_id: userId,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: data.response,
              timestamp: new Date(),
            };
            const newMessages = [...updatedMessages, assistantMessage];
            const newConv = { ...updatedConv, messages: newMessages };
            setConversation(newConv);
          } else {
            throw new Error('Fallback also failed');
          }
        } catch (fallbackError) {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.',
            timestamp: new Date(),
          };
          const newMessages = [...updatedMessages, errorMessage];
          const newConv = { ...updatedConv, messages: newMessages };
          setConversation(newConv);
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

  // Example prompts with SVG icon paths
  const examplePrompts = [
    {
      iconPath: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
      title: 'Tư vấn sản phẩm',
      prompt: 'Tôi đang tìm kiếm sản phẩm phù hợp với nhu cầu của mình. Bạn có thể giúp tôi không?',
    },
    {
      iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      title: 'Phân tích kinh doanh',
      prompt: 'Hãy phân tích xu hướng thị trường và đề xuất chiến lược kinh doanh hiệu quả.',
    },
    {
      iconPath: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
      title: 'Ý tưởng marketing',
      prompt: 'Cho tôi một số ý tưởng marketing sáng tạo để thu hút khách hàng mới.',
    },
    {
      iconPath: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      title: 'Báo cáo doanh thu',
      prompt: 'Làm thế nào để tối ưu hóa doanh thu và giảm chi phí vận hành?',
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4">
        <Link
          href="/shop"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>

        <div className="flex-1 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">AI Agent</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {userData ? `Xin chào, ${userData.username || userData.email}` : 'Trợ lý thông minh cho doanh nghiệp'}
            </p>
          </div>
        </div>

        {/* Model info */}
        {allowModelChange ? (
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
          </select>
        ) : (
          <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400">
            {selectedModel.replace('gemini-', 'Gemini ').replace(/-/g, ' ')}
          </div>
        )}

        {/* Clear chat button */}
        {conversation && conversation.messages.length > 0 && (
          <button
            onClick={clearConversation}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-red-500"
            title="Xóa lịch sử chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}

        {/* User Menu */}
        {apiClient.isAuthenticated() ? (
          <Link
            href="/profile"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm"
          >
            Đăng nhập
          </Link>
        )}
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto">
        {!conversation || conversation.messages.length === 0 ? (
          /* Welcome Screen */
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="max-w-3xl w-full text-center space-y-8">
              {/* Logo */}
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                {/* Welcome Text */}
                <div>
                  <h2 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
                    Xin chào{userData ? `, ${userData.username || userData.email}` : ''}! Tôi là AI Agent
                  </h2>
                  <p className="text-xl text-gray-600 dark:text-gray-400">
                    Tôi có thể giúp bạn tư vấn sản phẩm, phân tích kinh doanh và trả lời mọi câu hỏi.
                    <br />Hãy bắt đầu cuộc trò chuyện!
                  </p>
                </div>

                {/* Example Prompts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  {examplePrompts.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setInputValue(item.prompt);
                        inputRef.current?.focus();
                      }}
                      className="group p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-left hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.iconPath} />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {item.prompt}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Features */}
                <div className="flex flex-wrap justify-center gap-4 mt-8">
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Phản hồi nhanh
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Dữ liệu bảo mật
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Tích hợp RAG
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
              {conversation.messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                        : 'bg-gradient-to-br from-blue-600 to-indigo-600'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>

                  {/* Message Content */}
                  <div
                    className={`flex-1 max-w-[80%] ${
                      message.role === 'user' ? 'text-right' : ''
                    }`}
                  >
                    <div
                      className={`inline-block px-5 py-4 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-md'
                          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-lg rounded-tl-md border border-gray-100 dark:border-gray-700'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {message.content}
                        {isStreaming && message.role === 'assistant' && index === conversation.messages.length - 1 && (
                          <span className="inline-block w-2 h-5 bg-blue-600 ml-1 animate-pulse"></span>
                        )}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {message.timestamp.toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Loading */}
              {isLoading && !isStreaming && (
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="bg-white dark:bg-gray-800 px-5 py-4 rounded-2xl rounded-tl-md shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
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
          )}
      </main>

      {/* Input Area - Fixed at bottom */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative flex items-end gap-3 bg-gray-100 dark:bg-gray-700 rounded-2xl p-2">
            {/* Attachment Button */}
            <button className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            {/* Text Input */}
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleTextareaChange}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn của bạn..."
              disabled={isLoading}
              rows={1}
              className="flex-1 px-4 py-3 bg-transparent border-none focus:ring-0 resize-none text-gray-800 dark:text-white placeholder-gray-500 max-h-52 disabled:opacity-50"
              style={{ minHeight: '48px' }}
            />

            {/* Send Button */}
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
            >
              {isLoading ? (
                <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-3">
            AI Agent sử dụng Google Gemini và dữ liệu RAG từ hệ thống để trả lời. Kết quả chỉ mang tính tham khảo.
          </p>
        </div>
      </div>
    </div>
  );
}
