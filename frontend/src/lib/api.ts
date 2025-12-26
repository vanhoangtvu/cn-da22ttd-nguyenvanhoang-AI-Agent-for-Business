const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8089/api/v1';
const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:5000';

// Import centralized config
import { API_CONFIG } from '@/config/api.config';

// Types based on Spring Service DTOs
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string; // Can be username or email
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: number;
  username: string;
  email: string;
  role: 'ADMIN' | 'BUSINESS' | 'CUSTOMER';
}

export interface ActivityLogDTO {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  description: string;
  details: string | null;
  userId: number | null;
  username: string | null;
  userRole: string | null;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  timeAgo: string;
  iconType: string;
  actionColor: string;
  actionDescription: string;
  entityInfo: string;
  iconBgColor: string;
  iconColor: string;
  iconPath: string;
}

// API Client Class
class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization (client-side only)
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('authToken');
      console.log('ApiClient initialized. Token loaded from localStorage:', this.token ? 'yes (length: ' + this.token.length + ')' : 'no');
    }
  }

  // Set auth token
  setAuthToken(token: string) {
    console.log('Setting auth token:', token ? 'token exists (length: ' + token.length + ')' : 'token is null/undefined');
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
      console.log('Token saved to localStorage');
    }
  }

  // Remove auth token
  removeAuthToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
    }
  }

  // Get auth token
  getAuthToken(): string | null {
    return this.token;
  }

  // Set user data
  setUserData(userData: LoginResponse) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userData', JSON.stringify(userData));
    }
  }

  // Get user data
  getUserData(): LoginResponse | null {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.token !== null;
  }

  // Generic fetch method
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add Authorization header if token exists
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      console.log('Token being sent:', this.token.substring(0, 20) + '...');
    } else {
      console.warn('No token available for request to:', endpoint);
    }

    const url = `${API_BASE_URL}${endpoint}`;
    console.log('API Request:', {
      url,
      method: options.method || 'GET',
      hasToken: !!this.token,
      endpoint
    });

    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log('API Response status:', response.status, 'for', endpoint);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Đã có lỗi xảy ra';

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      console.error('API Error:', {
        url,
        status: response.status,
        statusText: response.statusText,
        errorMessage,
        errorText
      });

      // If unauthorized, clear token and redirect to login
      if (response.status === 401) {
        console.error('Unauthorized! Token may be invalid or expired.');
        this.removeAuthToken();
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }

      throw new Error(errorMessage);
    }

    // Handle empty response (e.g., 204 No Content)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    const data = await response.json();
    console.log('API Response data:', data);
    return data;
  }

  // Auth APIs
  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await this.fetch<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.fetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    console.log('Login response received:', response);
    console.log('Token in response:', response.token);

    // Automatically set token and user data after successful login
    if (response.token) {
      this.setAuthToken(response.token);
      this.setUserData(response);
      console.log('Token and user data saved automatically after login');
    } else {
      console.error('No token in login response!');
    }

    return response;
  }

  // Logout
  logout() {
    this.removeAuthToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  // Shop API (Public - No authentication required)
  async getAllProducts() {
    return this.fetch('/shop/products');
  }

  async getProduct(id: number) {
    return this.fetch(`/shop/products/${id}`);
  }

  async getProductsByCategory(categoryId: number) {
    return this.fetch(`/shop/products/category/${categoryId}`);
  }

  async searchProducts(keyword: string) {
    return this.fetch(`/shop/products/search?keyword=${encodeURIComponent(keyword)}`);
  }

  async getAllCategories() {
    return this.fetch('/shop/categories');
  }

  async getCategory(id: number) {
    return this.fetch(`/shop/categories/${id}`);
  }

  // Cart API
  async getCart() {
    return this.fetch('/cart');
  }

  async addToCart(productId: number, quantity: number) {
    return this.fetch('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
  }

  async updateCartItem(itemId: number, quantity: number) {
    return this.fetch(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  }

  async removeCartItem(itemId: number) {
    return this.fetch(`/cart/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  async clearCart() {
    return this.fetch('/cart', {
      method: 'DELETE',
    });
  }

  // Orders API
  async createOrder(data: { note?: string; items: Array<{ productId: number; quantity: number }> }) {
    return this.fetch('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyOrders() {
    return this.fetch('/orders/my-orders');
  }

  async getOrder(id: number) {
    return this.fetch(`/orders/${id}`);
  }

  async cancelOrder(id: number) {
    return this.fetch(`/orders/${id}/cancel`, {
      method: 'POST',
    });
  }

  async updateOrderAddress(id: number, shippingAddress: string) {
    return this.fetch(`/orders/${id}/address`, {
      method: 'PATCH',
      body: JSON.stringify({ shippingAddress }),
    });
  }

  // Profile API
  async getProfile() {
    return this.fetch('/profile');
  }

  async updateProfile(data: {
    username?: string;
    email?: string;
    address?: string;
    phoneNumber?: string;
    avatarUrl?: string;
  }) {
    return this.fetch('/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changePassword(oldPassword: string, newPassword: string) {
    return this.fetch('/profile/password', {
      method: 'PATCH',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  // User Management API (Admin/Business only)
  async getAllUsers() {
    return this.fetch('/users');
  }

  async deleteUser(id: number) {
    return this.fetch(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async updateAccountStatus(userId: number, status: string) {
    return this.fetch(`/users/${userId}/status?status=${status}`, {
      method: 'PATCH',
    });
  }

  async updateUserRole(userId: number, role: string) {
    return this.fetch(`/users/${userId}/role?role=${role}`, {
      method: 'PATCH',
    });
  }

  // Admin Product Management API
  async getAdminProducts() {
    return this.fetch('/admin/products');
  }

  async getProductsBySeller(sellerId: number) {
    return this.fetch(`/admin/products/seller/${sellerId}`);
  }

  async createProduct(data: {
    name: string;
    description: string;
    price: number;
    quantity: number;
    categoryId: number;
    imageUrls?: string[];
    details?: string;  // JSON string for product details
  }) {
    return this.fetch('/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(productId: number, data: {
    name: string;
    description: string;
    price: number;
    quantity: number;
    categoryId: number;
    imageUrls?: string[];
    details?: string;  // JSON string for product details
  }) {
    return this.fetch(`/admin/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(productId: number) {
    return this.fetch(`/admin/products/${productId}`, {
      method: 'DELETE',
    });
  }

  async updateProductStatus(productId: number, status: string) {
    return this.fetch(`/admin/products/${productId}/status?status=${status}`, {
      method: 'PATCH',
    });
  }

  // Admin Category Management API
  async getAdminCategories() {
    return this.fetch('/admin/categories');
  }

  async createCategory(data: { name: string; description?: string }) {
    return this.fetch('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(categoryId: number, data: { name: string; description?: string }) {
    return this.fetch(`/admin/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(categoryId: number) {
    return this.fetch(`/admin/categories/${categoryId}`, {
      method: 'DELETE',
    });
  }

  async updateCategoryStatus(categoryId: number, status: string) {
    return this.fetch(`/admin/categories/${categoryId}/status?status=${status}`, {
      method: 'PATCH',
    });
  }

  // Admin Order Management API
  async getAdminOrders() {
    return this.fetch('/admin/orders');
  }

  async getOrdersByStatus(status: string) {
    return this.fetch(`/admin/orders/status/${status}`);
  }

  async getOrdersByCustomer(customerId: number) {
    return this.fetch(`/admin/orders/customer/${customerId}`);
  }

  async updateOrderStatus(orderId: number, status: string) {
    return this.fetch(`/admin/orders/${orderId}/status?status=${status}`, {
      method: 'PATCH',
    });
  }

  // Admin Dashboard Statistics API
  async getAdminStats() {
    return this.fetch('/admin/dashboard/admin-stats');
  }

  async getBusinessStats() {
    return this.fetch('/admin/dashboard/business-stats');
  }

  async getDailyRevenue(days: number) {
    return this.fetch(`/admin/dashboard/revenue/daily?days=${days}`);
  }

  async getWeeklyRevenue(weeks: number) {
    return this.fetch(`/admin/dashboard/revenue/weekly?weeks=${weeks}`);
  }

  async getMonthlyRevenue(months: number) {
    return this.fetch(`/admin/dashboard/revenue/monthly?months=${months}`);
  }

  async getAdminDailyRevenue(days: number) {
    return this.fetch(`/admin/dashboard/admin/revenue/daily?days=${days}`);
  }

  async getAdminWeeklyRevenue(weeks: number) {
    return this.fetch(`/admin/dashboard/admin/revenue/weekly?weeks=${weeks}`);
  }

  async getAdminMonthlyRevenue(months: number) {
    return this.fetch(`/admin/dashboard/admin/revenue/monthly?months=${months}`);
  }

  // System Report API
  async getSystemReport() {
    return this.fetch('/admin/dashboard/system-report');
  }

  // System Analytics API
  async getSystemAnalytics() {
    // Call Spring service for system analytics
    return this.fetch('/admin/analytics/system-data');
  }

  // Business Documents API
  async uploadDocument(file: File, description?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${API_BASE_URL}/admin/business-documents`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to upload document');
    }

    return response.json();
  }

  async getMyDocuments() {
    return this.fetch('/admin/business-documents/my-documents');
  }

  async getDocument(id: number) {
    return this.fetch(`/admin/business-documents/${id}`);
  }

  async getDocumentsByBusiness(businessId: number) {
    return this.fetch(`/admin/business-documents/business/${businessId}`);
  }

  async deleteDocument(id: number) {
    return this.fetch(`/admin/business-documents/${id}`, {
      method: 'DELETE',
    });
  }

  async downloadDocument(filePath: string) {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${filePath}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to download document');
    }

    return response.blob();
  }

  async getRecentActivities(limit: number = 20): Promise<ActivityLogDTO[]> {
    return this.fetch(`/admin/dashboard/recent-activities?limit=${limit}`);
  }

  async getRecentActivitiesForBusiness(limit: number = 20): Promise<ActivityLogDTO[]> {
    return this.fetch(`/admin/dashboard/business/recent-activities?limit=${limit}`);
  }

  // Discount Management APIs
  async getAdminDiscounts() {
    return this.fetch('/admin/discounts');
  }

  async createDiscount(discountData: any) {
    return this.fetch('/admin/discounts', {
      method: 'POST',
      body: JSON.stringify(discountData),
    });
  }

  async updateDiscount(id: number, discountData: any) {
    return this.fetch(`/admin/discounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(discountData),
    });
  }

  async deleteDiscount(id: number) {
    return this.fetch(`/admin/discounts/${id}`, {
      method: 'DELETE',
    });
  }

  async updateDiscountStatus(id: number, status: string) {
    return this.fetch(`/admin/discounts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async applyDiscount(code: string, orderTotal: number) {
    return this.fetch('/admin/discounts/apply', {
      method: 'POST',
      body: JSON.stringify({ code, orderTotal }),
    });
  }

  async validateDiscount(code: string) {
    return this.fetch(`/admin/discounts/validate/${code}`);
  }

  async getDiscountAnalytics() {
    return this.fetch('/admin/discounts/analytics');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
