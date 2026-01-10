import Link from 'next/link';
import { apiClient } from '@/lib/api';

interface AdminLayoutProps {
  children: React.ReactNode;
  userData: any;
  currentPage: string;
}

export default function AdminLayout({ children, userData, currentPage }: AdminLayoutProps) {
  // Handle null userData case
  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-xl flex flex-col fixed h-full overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 flex-shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-md scale-110" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {userData.role === 'ADMIN' ? 'Admin Dashboard' : 'Business Dashboard'}
            </h1>
          </div>
          <span className="inline-block mt-2 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs rounded-full font-semibold">
            {userData.role}
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-4">
          <Link
            href="/admin"
            className={`flex items-center px-6 py-3 transition-colors ${currentPage === 'overview'
              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-r-4 border-purple-600'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="font-medium">Tổng quan</span>
          </Link>

          <Link
            href="/admin/products"
            className={`flex items-center px-6 py-3 transition-colors ${currentPage === 'products'
              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-r-4 border-purple-600'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="font-medium">Sản phẩm</span>
          </Link>

          <Link
            href="/admin/orders"
            className={`flex items-center px-6 py-3 transition-colors ${currentPage === 'orders'
              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-r-4 border-purple-600'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium">Đơn hàng</span>
          </Link>

          <Link
            href="/admin/categories"
            className={`flex items-center px-6 py-3 transition-colors ${currentPage === 'categories'
              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-r-4 border-purple-600'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="font-medium">Danh mục</span>
          </Link>

          <Link
            href="/admin/revenue"
            className={`flex items-center px-6 py-3 transition-colors ${currentPage === 'revenue'
              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-r-4 border-purple-600'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="font-medium">Doanh thu</span>
          </Link>

          {/* Giảm giá - Chỉ ADMIN */}
          {userData.role === 'ADMIN' && (
            <Link
              href="/admin/discounts"
              className={`flex items-center px-6 py-3 transition-colors ${currentPage === 'discounts'
                ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-r-4 border-purple-600'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="font-medium">Giảm giá</span>
            </Link>
          )}

          <Link
            href="/admin/reports"
            className={`flex items-center px-6 py-3 transition-colors ${currentPage === 'reports'
              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-r-4 border-purple-600'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium">Báo cáo</span>
          </Link>

          <Link
            href="/admin/ai-insights"
            className={`flex items-center px-6 py-3 transition-colors ${currentPage === 'ai-insights'
              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-r-4 border-purple-600'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="font-medium">AI Insights</span>
          </Link>

          {userData.role === 'ADMIN' && (
            <Link
              href="/admin/ai-agent-chat"
              className={`flex items-center px-6 py-3 transition-colors ${currentPage === 'ai-agent-chat'
                ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-r-4 border-purple-600'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="font-medium">Chat Agent</span>
            </Link>
          )}

          <Link
            href="/admin/users"
            className={`flex items-center px-6 py-3 transition-colors ${currentPage === 'users'
              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-r-4 border-purple-600'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="font-medium">{userData.role === 'ADMIN' ? 'Người dùng' : 'Khách hàng'}</span>
          </Link>

          <Link
            href="/admin/documents"
            className={`flex items-center px-6 py-3 transition-colors ${currentPage === 'documents'
              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-r-4 border-purple-600'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium">Tài liệu</span>
          </Link>
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Link
            href="/profile"
            className="flex items-center px-4 py-2 mb-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-medium">Tài khoản</span>
          </Link>
          <button
            onClick={() => apiClient.logout()}
            className="flex items-center w-full px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-800 shadow-sm px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {currentPage === 'overview' && 'Tổng quan'}
              {currentPage === 'products' && 'Quản lý sản phẩm'}
              {currentPage === 'orders' && 'Quản lý đơn hàng'}
              {currentPage === 'categories' && 'Quản lý danh mục'}
              {currentPage === 'revenue' && 'Báo cáo doanh thu'}
              {currentPage === 'discounts' && 'Quản lý giảm giá'}
              {currentPage === 'reports' && 'Báo cáo tổng hợp'}
              {currentPage === 'ai-insights' && 'AI Insights'}
              {currentPage === 'ai-agent-chat' && 'Chat Agent'}
              {currentPage === 'users' && (userData.role === 'ADMIN' ? 'Quản lý người dùng' : 'Quản lý khách hàng')}
              {currentPage === 'documents' && 'Quản lý tài liệu'}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Xin chào, <span className="font-semibold text-purple-600 dark:text-purple-400">{userData.username}</span>
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}