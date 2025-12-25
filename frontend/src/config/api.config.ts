/**
 * API Configuration
 * Sử dụng environment variables để tránh hardcode
 */

export const API_CONFIG = {
  // AI Service (Groq Chat, Python Backend)
  AI_SERVICE_URL: process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://14.164.29.11:5000',

  // Spring Service (Main Business API)
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://14.164.29.11:8089/api/v1',

  // Groq Chat endpoints
  GROQ_CHAT_BASE: `${process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://14.164.29.11:5000'}/api/groq-chat`,
};

// Helper functions
export const getGroqChatUrl = (endpoint: string) => {
  return `${API_CONFIG.GROQ_CHAT_BASE}${endpoint}`;
};

export const get_groq_chat_url = (endpoint: string) => {
  return `${API_CONFIG.GROQ_CHAT_BASE}${endpoint}`;
};

export const getApiUrl = (endpoint: string) => {
  return `${API_CONFIG.API_URL}${endpoint}`;
};
