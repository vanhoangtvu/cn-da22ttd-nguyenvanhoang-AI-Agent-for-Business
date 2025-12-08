'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ProductCard from '@/components/ProductCard';
import ProductDetailPanel from '@/components/ProductDetailPanel';
import OrderCard from '@/components/OrderCard';
import OrderDetailPanel from '@/components/OrderDetailPanel';

// Python AI Service URL
const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://113.178.203.147:5000';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  products?: Product[];
  orders?: Order[];
}

interface Order {
  id: number;
  customerName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  orderItemsCount: number;
  productName?: string; // Optional: product name from minimal format
}

interface Product {
  id?: number;
  name: string;
  price?: string | number;
  imageUrl?: string;
  description?: string;
  stock?: number;
  categoryName?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

// Parse products from AI response - Enhanced version
const parseProducts = (content: string): { products: Product[]; cleanContent: string } => {
  const products: Product[] = [];
  let cleanContent = content;

  // Find all markdown images
  const imagePattern = /!\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  const images: Array<{alt: string, url: string, index: number}> = [];
  
  let imgMatch;
  while ((imgMatch = imagePattern.exec(content)) !== null) {
    images.push({
      alt: imgMatch[1],
      url: imgMatch[2],
      index: imgMatch.index
    });
  }

  // For each image, extract detailed product info
  images.forEach(img => {
    const beforeImage = content.substring(Math.max(0, img.index - 500), img.index);
    const afterImage = content.substring(img.index, Math.min(content.length, img.index + 600));
    
    let name = img.alt;
    const namePatterns = [
      /\*\*([^*]+)\*\*(?!.*\*\*)/,
      /\d+\.\s+\*\*([^*]+)\*\*/,
      /^[•\-\*]\s+\*\*([^*]+)\*\*/m
    ];
    
    for (const pattern of namePatterns) {
      const match = beforeImage.match(pattern);
      if (match) {
        name = match[1].trim();
        break;
      }
    }
    
    let productId: number | undefined;
    const idMatch = afterImage.match(/ID:\s*(\d+)|Product ID:\s*(\d+)|Mã SP:\s*(\d+)/i);
    if (idMatch) {
      productId = parseInt(idMatch[1] || idMatch[2] || idMatch[3]);
    }
    
    const pricePatterns = [
      /Giá bán:\s*([0-9.,]+\s*(?:VNĐ|VND|đ))/i,
      /Giá:\s*([0-9.,]+\s*(?:VNĐ|VND|đ))/i,
      /([0-9]{1,3}(?:[.,][0-9]{3})*\s*(?:VNĐ|VND|đ))/i
    ];
    
    let price: string | undefined;
    for (const pattern of pricePatterns) {
      const match = afterImage.match(pattern);
      if (match) {
        price = match[1];
        break;
      }
    }
    
    let description = '';
    const descPatterns = [
      /Mô tả:\s*([^\n*]+)/i,
      /Đặc điểm:\s*([^\n*]+)/i,
      /\n\s*\*\s*([^*\n]+?)(?=\n\s*\*|Giá:|$)/
    ];
    
    for (const pattern of descPatterns) {
      const match = afterImage.match(pattern);
      if (match && !match[1].includes('Giá') && !match[1].includes('VNĐ')) {
        description = match[1].trim();
        break;
      }
    }
    
    const stockPatterns = [
      /Tồn kho:\s*(\d+)/i,
      /Còn lại:\s*(\d+)/i,
      /Số lượng:\s*(\d+)/i
    ];
    
    let stock: number | undefined;
    for (const pattern of stockPatterns) {
      const match = afterImage.match(pattern);
      if (match) {
        stock = parseInt(match[1]);
        break;
      }
    }
    
    const categoryMatch = afterImage.match(/Danh mục:\s*([^\n*]+)/i);
    const categoryName = categoryMatch ? categoryMatch[1].trim() : undefined;
    
    products.push({
      id: productId,
      name,
      imageUrl: img.url,
      price,
      description,
      stock,
      categoryName
    });
    
    console.log('Parsed product:', { id: productId, name, imageUrl: img.url });
  });

  const uniqueProducts = products.filter((product, index, self) =>
    index === self.findIndex((p) => 
      (p.id && product.id && p.id === product.id) || 
      (p.imageUrl === product.imageUrl)
    )
  );

  console.log('Total products parsed:', uniqueProducts.length);
  console.log('Products with ID:', uniqueProducts.filter(p => p.id).length);

  if (uniqueProducts.length > 0) {
    cleanContent = content.replace(/!\[[^\]]+\]\([^)]+\)/g, '');
    cleanContent = cleanContent.replace(/\n{3,}/g, '\n\n');
  }

  return { products: uniqueProducts, cleanContent };
};

// Parse orders from AI response
const parseOrders = (content: string): { orders: Order[]; cleanContent: string } => {
  const orders: Order[] = [];
  let cleanContent = content;

  // Pattern 1: New minimal format with JSON-like ORDER_CARD
  // **Đơn hàng #20**
  // ORDER_CARD: {"id": 20, "product": "Acer Aspire 5"}
  // More flexible regex to handle various whitespace/newline combinations
  const minimalPattern = /\*\*Đơn hàng\s*#(\d+)\*\*[\s\S]*?ORDER_CARD:\s*\{\s*"id"\s*:\s*(\d+)\s*,\s*"product"\s*:\s*"([^"]+)"\s*\}/gi;
  
  let match;
  while ((match = minimalPattern.exec(content)) !== null) {
    const orderId = parseInt(match[2]);
    console.log('[Pattern 1 - Minimal] Matched Order ID:', orderId, 'Product:', match[3]);
    orders.push({
      id: orderId,
      customerName: '', // Will be loaded from API
      totalAmount: 0, // Will be loaded from API
      status: '', // Will be loaded from API
      createdAt: '', // Will be loaded from API
      orderItemsCount: 1, // Default, will be loaded from API
      productName: match[3] // Store product name from minimal format
    });
  }

  console.log('[Pattern 1] Total orders parsed (minimal format):', orders.length);
  if (orders.length > 0) {
    console.log('[Pattern 1] Sample order:', orders[0]);
    return { orders, cleanContent };
  }

  // Pattern 2: Simplified bullet format (like in current screenshot)
  // Đơn hàng #13:
  // • Trạng thái: DELIVERED  OR  Trạng thái: DELIVERED
  // • Tổng tiền: 27990K VND
  // • Ngày đặt hàng: 2025-11-28T13:25:00
  // • Sản phẩm: Samsung Galaxy S24 Ultra x1
  const simpleBulletPattern = /Đơn hàng\s*#(\d+)[:\s]*[\s\S]*?Trạng thái:\s*(\w+)[\s\S]*?Tổng tiền:\s*([0-9.,KkVNĐđ\s]+)[\s\S]*?Ngày đặt hàng:\s*([^\n]+)[\s\S]*?Sản phẩm:\s*([^\n•]+)/gi;
  
  let match2;
  while ((match2 = simpleBulletPattern.exec(content)) !== null) {
    const itemsText = match2[5].trim();
    const itemsMatch = itemsText.match(/x(\d+)/);
    const itemsCount = itemsMatch ? parseInt(itemsMatch[1]) : 1;
    
    // Extract product name (before "x1" or similar)
    const productName = itemsText.replace(/\s*x\d+\s*$/, '').trim();
    
    // Parse total amount
    let totalAmountStr = match2[3].trim().toUpperCase().replace(/[VNĐđ\s]/gi, '');
    let totalAmount: number;
    
    console.log('[Pattern 2 - Bullet] Matched Order ID:', match2[1]);
    console.log('[Pattern 2 - Bullet] Raw total:', match2[3]);
    
    if (totalAmountStr.includes('K')) {
      const numberPart = totalAmountStr.replace('K', '').replace(/[.,]/g, '');
      totalAmount = parseFloat(numberPart) * 1000;
      console.log('[Pattern 2] K format - Number part:', numberPart, '-> Total:', totalAmount);
    } else {
      totalAmount = parseFloat(totalAmountStr.replace(/[.,]/g, ''));
      console.log('[Pattern 2] Direct format - Total:', totalAmount);
    }
    
    orders.push({
      id: parseInt(match2[1]),
      customerName: '', // Will be loaded from API
      totalAmount: totalAmount,
      status: match2[2].trim().toUpperCase(),
      createdAt: match2[4].trim(),
      orderItemsCount: itemsCount,
      productName: productName
    });
  }

  console.log('[Pattern 2] Total orders parsed (bullet format):', orders.length);
  if (orders.length > 0) {
    console.log('[Pattern 2] Sample order:', orders[0]);
    return { orders, cleanContent };
  }

  // Fallback patterns for backward compatibility
  // Pattern 3: ORDER_ID format (old structured format)
  const structuredPattern = /ORDER_ID:\s*(\d+)[\s\S]*?CUSTOMER:\s*([^\n]+)[\s\S]*?TOTAL:\s*([0-9.,]+)[\s\S]*?STATUS:\s*([^\n]+)[\s\S]*?DATE:\s*([^\n]+)[\s\S]*?ITEMS:\s*([^\n]+)/gi;
  
  let match3;
  while ((match3 = structuredPattern.exec(content)) !== null) {
    const itemsText = match3[6].trim();
    const itemsMatch = itemsText.match(/(\d+)/);
    const itemsCount = itemsMatch ? parseInt(itemsMatch[1]) : 1;
    
    orders.push({
      id: parseInt(match3[1]),
      customerName: match3[2].trim(),
      totalAmount: parseFloat(match3[3].replace(/[.,KkVNĐđ\s]/g, '')),
      status: match3[4].trim().toUpperCase(),
      createdAt: match3[5].trim(),
      orderItemsCount: itemsCount
    });
  }

  // Pattern 4: Fallback for plain text format (like in screenshot)
  // Can be either: "TOTAL: 13990K VND" OR "TOTAL: 13990000 VND" OR "TOTAL: 13990000đ"
  const plainPattern = /Đơn hàng\s*#(\d+)\s+ORDER_ID:\s*\d+\s+CUSTOMER:\s*(\w+)\s+TOTAL:\s*([0-9.,Kk]+)(?:\s*(?:VN[DĐ]|đ))?\s+STATUS:\s*(\w+)\s+DATE:\s*([^\s]+)[\s\S]*?ITEMS:\s*([^\n]+)/gi;
  
  let match4;
  while ((match4 = plainPattern.exec(content)) !== null) {
    // Extract product count from ITEMS field
    const itemsText = match4[6].trim();
    const itemsMatch = itemsText.match(/x(\d+)/);
    const itemsCount = itemsMatch ? parseInt(itemsMatch[1]) : 1;
    
    // Parse total amount (handle K for thousands OR direct value)
    let totalAmountStr = match4[3].trim().toUpperCase();
    let totalAmount: number;
    
    console.log('[Pattern 4] Raw total string:', match4[3]);
    console.log('[Pattern 4] After cleanup:', totalAmountStr);
    
    if (totalAmountStr.includes('K')) {
      // Has K suffix - multiply by 1000
      // Example: "13990K" -> 13990 * 1000 = 13,990,000
      const numberPart = totalAmountStr.replace('K', '').replace(/[.,]/g, '');
      totalAmount = parseFloat(numberPart) * 1000;
      console.log('[Pattern 4] K format - Number part:', numberPart, '-> Total:', totalAmount);
    } else {
      // No K - already in full number format
      // Example: "13990000" -> 13,990,000
      totalAmount = parseFloat(totalAmountStr.replace(/[.,]/g, ''));
      console.log('[Pattern 4] Direct format - Total:', totalAmount);
    }
    
    orders.push({
      id: parseInt(match4[1]),
      customerName: match4[2].trim(),
      totalAmount: totalAmount,
      status: match4[4].trim().toUpperCase(),
      createdAt: match4[5].trim(),
      orderItemsCount: itemsCount
    });
  }

  // Pattern 5: New format from latest response - bullet list format
  // Đơn hàng #20
  // • Mã đơn hàng: 20
  // • Trạng thái: PENDING
  // • Tổng tiền: 13990K VND
  // • Ngày đặt hàng: 2025-12-04T08:20:16.467919
  // • Sản phẩm: Acer Aspire 5 x1
  const bulletPattern = /Đơn hàng\s*#(\d+)\s*\n[\s\S]*?Mã đơn hàng:\s*\d+\s*\n[\s\S]*?Trạng thái:\s*(\w+)\s*\n[\s\S]*?Tổng tiền:\s*([0-9.,KkVNĐđ\s]+)\s*\n[\s\S]*?Ngày đặt hàng:\s*([^\n]+)\s*\n[\s\S]*?Sản phẩm:\s*([^\n]+)/gi;
  
  let match5;
  while ((match5 = bulletPattern.exec(content)) !== null) {
    const itemsText = match5[5].trim();
    const itemsMatch = itemsText.match(/x(\d+)/);
    const itemsCount = itemsMatch ? parseInt(itemsMatch[1]) : 1;
    
    // Parse total amount
    let totalAmountStr = match4[3].trim().toUpperCase().replace(/[VNĐđ\s]/gi, '');
    let totalAmount: number;
    
    if (totalAmountStr.includes('K')) {
      const numberPart = totalAmountStr.replace('K', '').replace(/[.,]/g, '');
      totalAmount = parseFloat(numberPart) * 1000;
    } else {
      totalAmount = parseFloat(totalAmountStr.replace(/[.,]/g, ''));
    }
    
    orders.push({
      id: parseInt(match5[1]),
      customerName: 'customer', // Default as it's not in this format
      totalAmount: totalAmount,
      status: match5[2].trim().toUpperCase(),
      createdAt: match5[4].trim(),
      orderItemsCount: itemsCount
    });
  }

  console.log('Total orders parsed:', orders.length);
  if (orders.length > 0) {
    console.log('Sample order:', orders[0]);
  }

  return { orders, cleanContent };
};

export default function ChatPage() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [allowModelChange, setAllowModelChange] = useState(false);
  const [userGreeting, setUserGreeting] = useState('Trợ lý thông minh cho doanh nghiệp');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'groq'>('gemini');
  const [userId, setUserId] = useState<string>('anonymous');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Debug: Log when selectedProductId or selectedOrderId changes
  useEffect(() => {
    console.log('selectedProductId changed to:', selectedProductId);
  }, [selectedProductId]);

  useEffect(() => {
    console.log('selectedOrderId changed to:', selectedOrderId);
  }, [selectedOrderId]);

  // Get user info
  const userData = apiClient.getUserData();
  const sessionId = `user_${userId}_session`; // Mỗi user chỉ có 1 session duy nhất

  // Load AI model preference from admin (userId=1)
  // Note: We always use admin's model selection for all users
  // But we still track actual userId for chat history and data access
  const loadAdminModelPreference = async () => {
    try {
      const url = `${AI_SERVICE_URL}/ai-config/user-preference/1`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setAiProvider(data.provider);
        setSelectedModel(data.model);
      }
    } catch (error) {
      console.error('[Chat] Error loading admin model preference:', error);
      // Fallback to default
      setAiProvider('gemini');
      setSelectedModel('gemini-2.0-flash');
    }
  };

  // Set mounted and auth state after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setIsAuthenticated(apiClient.isAuthenticated());
    
    // Get and set actual userId (for chat history and data access)
    const userData = apiClient.getUserData();
    const currentUserId = userData?.userId?.toString() || 'anonymous';
    setUserId(currentUserId);
    
    if (userData) {
      setUserGreeting(`Xin chào, ${userData.username || userData.email}`);
    }
    
    // Load model preference from admin (not from user)
    loadAdminModelPreference();
  }, []);

  // Poll for admin model preference changes (every 3 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      loadAdminModelPreference();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Load AI config from server (only for Gemini)
  useEffect(() => {
    const loadAIConfig = async () => {
      // Only load server config for Gemini provider
      if (aiProvider !== 'gemini') return;
      
      try {
        const res = await fetch(`${AI_SERVICE_URL}/ai-config/user-config`);
        if (res.ok) {
          const config = await res.json();
          // Don't override user preference, just get allow_change setting
          setAllowModelChange(config.allow_change);
        }
      } catch (err) {
        console.error('Failed to load AI config:', err);
      }
    };
    loadAIConfig();
  }, [aiProvider]);

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
      
      // Determine API endpoint based on provider
      const apiEndpoint = aiProvider === 'groq' 
        ? `${AI_SERVICE_URL}/groq/chat/rag/stream`
        : `${AI_SERVICE_URL}/gemini/chat/rag/stream`;
      
      try {
        const response = await fetch(apiEndpoint, {
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

        if (!response.ok) {
          throw new Error('Streaming failed');
        }

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
        
        // Determine fallback API endpoint based on provider
        const fallbackEndpoint = aiProvider === 'groq' 
          ? `${AI_SERVICE_URL}/groq/chat/rag`
          : `${AI_SERVICE_URL}/gemini/chat/rag`;
        
        // Try non-streaming fallback
        try {
          const response = await fetch(fallbackEndpoint, {
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
      <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4 flex-shrink-0 z-10">
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
              {userGreeting}
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
          <div 
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400"
            title={`Provider: ${aiProvider} | Model: ${selectedModel}`}
          >
            {(() => {
              if (aiProvider === 'groq') {
                const nameMap: Record<string, string> = {
                  'llama-3.3-70b-versatile': 'Llama 3.3 70B',
                  'llama-3.1-70b-versatile': 'Llama 3.1 70B',
                  'llama-3.1-8b-instant': 'Llama 3.1 8B',
                  'groq/compound': 'Groq Compound',
                  'groq/compound-mini': 'Groq Compound Mini',
                  'moonshotai/kimi-k2-instruct-0905': 'Kimi K2',
                  'moonshotai/kimi-k2-instruct': 'Kimi K2',
                  'qwen/qwen3-32b': 'Qwen 3 32B',
                  'openai/gpt-oss-120b': 'GPT OSS 120B',
                };
                return nameMap[selectedModel] || selectedModel.split('/').pop() || selectedModel;
              }
              return selectedModel.replace('gemini-', 'Gemini ').replace(/-/g, ' ');
            })()}
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
        {mounted && (
          isAuthenticated ? (
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
          )
        )}
      </header>

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div 
          className={`flex flex-col transition-all duration-500 ease-in-out ${
            selectedProductId ? 'w-1/2' : 'w-full'
          }`}
        >
          {/* Messages Area */}
          <main className="flex-1 overflow-y-auto">{!conversation || conversation.messages.length === 0 ? (
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
                    {mounted && userData ? `Xin chào, ${userData.username || userData.email}! Tôi là AI Agent` : 'Xin chào! Tôi là AI Agent'}
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
              {conversation.messages.map((message, index) => {
                // Parse products and orders from message content
                const { products, cleanContent: contentAfterProducts } = message.products ? 
                  { products: message.products, cleanContent: message.content } : 
                  parseProducts(message.content);
                
                const { orders, cleanContent } = message.orders ?
                  { orders: message.orders, cleanContent: contentAfterProducts } :
                  parseOrders(contentAfterProducts);

                return (
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
                      className={`flex-1 max-w-[85%] ${
                        message.role === 'user' ? 'text-right' : ''
                      }`}
                    >
                      <div
                        className={`inline-block px-6 py-4 rounded-2xl ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-md'
                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-lg rounded-tl-md border border-gray-100 dark:border-gray-700'
                        }`}
                      >
                        {/* Message Text with Markdown */}
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                a: ({node, ...props}) => (
                                  <a {...props} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer" />
                                ),
                                img: ({node, ...props}) => null, // We handle images separately as product cards
                                p: ({node, ...props}) => (
                                  <p {...props} className="my-2 leading-relaxed" />
                                ),
                                strong: ({node, ...props}) => (
                                  <strong {...props} className="font-bold text-gray-900 dark:text-white" />
                                ),
                                ul: ({node, ...props}) => (
                                  <ul {...props} className="my-2 list-disc list-inside space-y-1" />
                                ),
                                ol: ({node, ...props}) => (
                                  <ol {...props} className="my-2 list-decimal list-inside space-y-1" />
                                ),
                                code: ({node, inline, ...props}: any) => 
                                  inline ? (
                                    <code {...props} className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm" />
                                  ) : (
                                    <code {...props} className="block bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-sm overflow-x-auto" />
                                  ),
                              }}
                            >
                              {cleanContent}
                            </ReactMarkdown>
                            {isStreaming && index === conversation.messages.length - 1 && (
                              <span className="inline-block w-2 h-5 bg-blue-600 ml-1 animate-pulse"></span>
                            )}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        )}

                        {/* Product Cards Section */}
                        {message.role === 'assistant' && products.length > 0 && (
                          <div className="mt-6 pt-4 border-t-2 border-blue-100 dark:border-blue-900/30">
                            <div className="flex items-center gap-2 mb-4">
                              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                              </svg>
                              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                Sản phẩm được đề xuất ({products.length})
                              </h4>
                            </div>
                            <div className={`grid gap-4 ${products.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                              {products.map((product, idx) => (
                                <ProductCard
                                  key={product.id || idx}
                                  id={product.id}
                                  name={product.name}
                                  price={product.price}
                                  imageUrl={product.imageUrl}
                                  description={product.description}
                                  stock={product.stock}
                                  categoryName={product.categoryName}
                                  showAddToCart={true}
                                  onClick={() => {
                                    console.log('Product clicked:', product);
                                    if (product.id) {
                                      console.log('Setting selectedProductId to:', product.id);
                                      setSelectedProductId(product.id);
                                    } else {
                                      console.warn('Product has no ID');
                                    }
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Order Cards Section */}
                        {message.role === 'assistant' && orders.length > 0 && (
                          <div className="mt-6 pt-4 border-t-2 border-green-100 dark:border-green-900/30">
                            <div className="flex items-center gap-2 mb-4">
                              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                Đơn hàng của bạn ({orders.length})
                              </h4>
                            </div>
                            <div className={`grid gap-4 ${orders.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                              {orders.map((order, idx) => (
                                <OrderCard
                                  key={order.id || idx}
                                  id={order.id}
                                  customerName={order.customerName}
                                  totalAmount={order.totalAmount}
                                  status={order.status}
                                  createdAt={order.createdAt}
                                  orderItemsCount={order.orderItemsCount}
                                  productName={order.productName}
                                  inChatMode={true}
                                  onClick={() => {
                                    console.log('Order clicked:', order);
                                    console.log('Setting selectedOrderId to:', order.id);
                                    setSelectedOrderId(order.id);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        {message.timestamp.toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}

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

          {/* Input Area - Fixed at bottom of chat */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex-shrink-0">
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

        {/* Product Detail Panel - Slide in from right */}
        {(() => {
          console.log('Checking selectedProductId:', selectedProductId);
          console.log('Should render panel:', !!selectedProductId);
          return selectedProductId ? (
            <>
              {/* Overlay */}
              <div 
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-500"
                onClick={() => {
                  console.log('Overlay clicked, closing panel');
                  setSelectedProductId(null);
                }}
              />
              
              {/* Detail Panel */}
              <div className="fixed top-0 right-0 h-full w-1/2 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 animate-slide-in-right bg-white dark:bg-gray-900">
                <ProductDetailPanel
                  productId={selectedProductId}
                  onClose={() => {
                    console.log('Close button clicked');
                    setSelectedProductId(null);
                  }}
                />
              </div>
            </>
          ) : null;
        })()}

        {/* Order Detail Panel - Slide in from right */}
        {selectedOrderId && (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-500"
              onClick={() => {
                console.log('Order overlay clicked, closing panel');
                setSelectedOrderId(null);
              }}
            />
            
            {/* Detail Panel */}
            <div className="fixed top-0 right-0 h-full w-1/2 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 animate-slide-in-right bg-white dark:bg-gray-900">
              <OrderDetailPanel
                orderId={selectedOrderId}
                onClose={() => {
                  console.log('Order close button clicked');
                  setSelectedOrderId(null);
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
