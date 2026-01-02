'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader, AlertCircle, X, Hand, Lightbulb, Check, RefreshCw } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface GroqChatWidgetProps {
  compact?: boolean;
  className?: string;
  onClose?: () => void;
}

const GROQ_API_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:5000';

export default function GroqChatWidget({
  compact = false,
  className = '',
  onClose,
}: GroqChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedModel, setSelectedModel] = useState('openai/gpt-oss-20b');
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Session management
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load available models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch(`${GROQ_API_URL}/api/groq-chat/models`);
        if (response.ok) {
          const data = await response.json();
          setAvailableModels(data.models);
          setSelectedModel(data.default_model);
        }
      } catch (err) {
        console.error('Failed to load models:', err);
      }
    };

    loadModels();
  }, []);

  // Initialize session and user on mount
  useEffect(() => {
    // Get or create session ID
    const storedSessionId = localStorage.getItem('groq_chat_session_id');
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('groq_chat_session_id', newSessionId);
    }

    // Get user ID from auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const extractedUserId = payload.userId || payload.sub || payload.id;
        if (extractedUserId) {
          // Use user_X format for consistency with backend
          setUserId(`user_${extractedUserId}`);
        }
      } catch (e) {
        console.error('Failed to parse token:', e);
      }
    }
  }, []);

  // Load chat history when session and user are ready
  useEffect(() => {
    if (sessionId && userId) {
      loadChatHistory();
    }
  }, [sessionId, userId]);

  const loadChatHistory = async () => {
    if (!sessionId || !userId) return;

    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('token');
      const extractedUserId = userId.replace('user_', ''); // Remove prefix for API call

      const response = await fetch(
        `${GROQ_API_URL}/api/groq-chat/user/${userId}/history/${sessionId}?auth_user_id=${userId}`,
        {
          headers: token ? {
            'Authorization': `Bearer ${token}`,
          } : {},
        }
      );

      if (response.ok) {
        const data = await response.json();
        const historyMessages: ChatMessage[] = data.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        }));
        setMessages(historyMessages);
        console.log(`[Chat] Loaded ${historyMessages.length} messages from history`);
      } else if (response.status === 404) {
        // No history found - this is normal for new sessions
        console.log('[Chat] No history found for this session');
      } else {
        console.error('[Chat] Failed to load history:', response.status);
      }
    } catch (err) {
      console.error('[Chat] Error loading chat history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };


  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${GROQ_API_URL}/api/groq-chat/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: input.trim(),
          model: selectedModel,
          session_id: sessionId,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: data.timestamp,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const startNewChat = () => {
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    localStorage.setItem('groq_chat_session_id', newSessionId);
    setMessages([]);
    setError(null);
    console.log('[Chat] Started new session:', newSessionId);
  };

  if (compact) {
    return (
      <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">AI Chat</h2>
            <p className="text-sm text-blue-100">Powered by Groq</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:bg-blue-800 p-2 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {loadingHistory && (
            <div className="text-center text-gray-500 py-8">
              <div className="flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                <p className="text-sm">Loading chat history...</p>
              </div>
            </div>
          )}

          {!loadingHistory && messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm flex items-center gap-1"><Hand className="w-4 h-4" /> Start a conversation!</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-300 text-gray-900 rounded-bl-none'
                  }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-300 px-4 py-2 rounded-lg rounded-bl-none">
                <Loader className="w-5 h-5 animate-spin text-gray-600" />
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2 max-w-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
          <div className="space-y-3">
            {availableModels.length > 0 && (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {messages.length > 0 && (
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={clearChat}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear Chat
              </button>
              <button
                type="button"
                onClick={startNewChat}
                className="text-sm text-blue-600 hover:text-blue-900 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                New Chat
              </button>
            </div>
          )}
        </form>
      </div>
    );
  }

  // Full-page mode
  return (
    <div className={`flex flex-col h-screen bg-white ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 shadow-lg">
        <h1 className="text-3xl font-bold">AI Assistant</h1>
        <p className="text-blue-100 mt-1">Ask me anything - powered by Groq</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex gap-6 p-6">
        {/* Messages Panel */}
        <div className="flex-1 flex flex-col bg-gray-50 rounded-lg shadow">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center"><Hand className="w-8 h-8 text-blue-600" /></div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome!</h2>
                  <p className="text-gray-600">
                    Start a conversation by typing a message below
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md px-6 py-4 rounded-lg ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white border border-gray-300 text-gray-900 rounded-bl-none'
                    }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.timestamp && (
                    <p
                      className={`text-xs mt-2 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-300 px-6 py-4 rounded-lg rounded-bl-none">
                  <div className="flex items-center gap-2">
                    <Loader className="w-5 h-5 animate-spin text-blue-600" />
                    <p className="text-gray-600">Thinking...</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-start">
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg rounded-bl-none flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-300 p-6 bg-white rounded-b-lg">
            <form onSubmit={sendMessage} className="space-y-4">
              {availableModels.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message here..."
                  disabled={loading}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2 font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send
                    </>
                  )}
                </button>
              </div>

              {messages.length > 0 && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={clearChat}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Clear Conversation
                  </button>
                  <button
                    type="button"
                    onClick={startNewChat}
                    className="text-sm text-blue-600 hover:text-blue-900 flex items-center gap-1 font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    New Chat
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Info Panel */}
        <div className="w-80 bg-blue-50 rounded-lg shadow p-6 border border-blue-200">
          <h3 className="font-bold text-lg text-blue-900 mb-4 flex items-center gap-2"><Lightbulb className="w-5 h-5" /> Tips</h3>
          <ul className="space-y-3 text-sm text-blue-800">
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600 flex-shrink-0" /> Ask any question and get instant answers</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600 flex-shrink-0" /> Choose from multiple AI models</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600 flex-shrink-0" /> Clear conversation to start fresh</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600 flex-shrink-0" /> Fast responses powered by Groq API</li>
          </ul>

          <hr className="my-6 border-blue-200" />

          <div className="space-y-2">
            <p className="text-xs font-semibold text-blue-900">Current Model</p>
            <p className="text-xs text-blue-700 bg-white rounded p-2 break-words">
              {selectedModel}
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <p className="text-xs font-semibold text-blue-900">Messages: {messages.length}</p>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((messages.length / 20) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
