'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  imageUrls: string[];
  status: string;
  categoryId: number;
  categoryName: string;
  sellerId: number;
  sellerUsername: string;
}

interface Category {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  status: string;
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name');
  const [cartCount, setCartCount] = useState(0);
  const [hoveredProduct, setHoveredProduct] = useState<number | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Banner carousel auto-play
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load products and categories
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        apiClient.getAllProducts(),
        apiClient.getAllCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData.filter((cat: Category) => cat.status === 'ACTIVE'));
    } catch (err) {
      setError('Không thể tải dữ liệu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort products
  const filteredProducts = products
    .filter((product) => {
      if (selectedCategory && product.categoryId !== selectedCategory) return false;
      if (searchKeyword && !product.name.toLowerCase().includes(searchKeyword.toLowerCase())) return false;
      return product.status === 'ACTIVE';
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

  // Add to cart
  const handleAddToCart = async (productId: number) => {
    if (!apiClient.isAuthenticated()) {
      alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
      return;
    }

    try {
      await apiClient.addToCart(productId, 1);
      setCartCount(cartCount + 1);
      alert('Đã thêm vào giỏ hàng!');
    } catch (err) {
      alert('Không thể thêm vào giỏ hàng');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                AI Shop
              </span>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full px-4 py-3 pl-12 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {/* Chat AI Button */}
              <Link
                href="/chat"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat AI
              </Link>

              {apiClient.isAuthenticated() ? (
                <>
                  {(() => {
                    const userData = apiClient.getUserData();
                    const isAdminOrBusiness = userData && (userData.role === 'ADMIN' || userData.role === 'BUSINESS');
                    return isAdminOrBusiness ? (
                      <Link
                        href="/admin"
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Quản lý
                      </Link>
                    ) : null;
                  })()}
                  <Link
                    href="/orders"
                    className="p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Đơn hàng"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </Link>
                  <Link
                    href="/cart"
                    className="relative p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Giỏ hàng"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/profile"
                    className="p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Thông tin cá nhân"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => apiClient.logout()}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative h-[500px] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>

        {/* Banner Content */}
        <div className="relative container mx-auto px-4 h-full flex items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-semibold mb-6 animate-fade-in">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Chào mừng đến với AI Shop
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 animate-slide-up">
              Khám phá sản phẩm <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-200">
                tuyệt vời nhất
              </span>
            </h1>
            <p className="text-xl text-white/90 mb-8 animate-slide-up animation-delay-200">
              Hàng ngàn sản phẩm chất lượng với giá cả tốt nhất thị trường
            </p>
            <div className="flex gap-4 animate-slide-up animation-delay-400">
              <button
                onClick={() => setSelectedCategory(null)}
                className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-gray-100 transition-all hover:scale-105 shadow-lg"
              >
                Mua sắm ngay
              </button>
              <button className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/20 transition-all border-2 border-white/30">
                Tìm hiểu thêm
              </button>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="hidden lg:block absolute right-20 top-1/2 -translate-y-1/2 animate-float">
            <div className="relative">
              <div className="w-80 h-80 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl rotate-12"></div>
              <div className="absolute inset-0 w-80 h-80 bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl -rotate-6"></div>
            </div>
          </div>
        </div>

        {/* Banner Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {[0, 1, 2].map((index) => (
            <button
              key={index}
              onClick={() => setCurrentBannerIndex(index)}
              className={`h-2 rounded-full transition-all ${
                currentBannerIndex === index ? 'w-8 bg-white' : 'w-2 bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Featured Categories */}
      <div className="bg-white dark:bg-gray-900 py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Danh mục nổi bật</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`group p-6 rounded-2xl transition-all hover:shadow-xl ${
                selectedCategory === null
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`p-4 rounded-full ${selectedCategory === null ? 'bg-white/20' : 'bg-white dark:bg-gray-700'}`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </div>
                <span className="font-semibold text-sm">Tất cả</span>
              </div>
            </button>
            {categories.slice(0, 5).map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`group p-6 rounded-2xl transition-all hover:shadow-xl ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent && !parent.querySelector('svg')) {
                            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                            svg.setAttribute('class', 'w-8 h-8 text-blue-600 dark:text-blue-400');
                            svg.setAttribute('fill', 'none');
                            svg.setAttribute('stroke', 'currentColor');
                            svg.setAttribute('viewBox', '0 0 24 24');
                            svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />';
                            parent.appendChild(svg);
                          }
                        }}
                      />
                    ) : (
                      <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    )}
                  </div>
                  <span className="font-semibold text-sm text-center line-clamp-2">{category.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar - Categories */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sticky top-24 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Bộ lọc
              </h2>
              
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">Danh mục</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                      selectedCategory === null
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span className="font-medium">Tất cả</span>
                    </div>
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                        selectedCategory === category.id
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="font-medium">{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range Filter Placeholder */}
              <div>
                <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">Khoảng giá</h3>
                <div className="space-y-2 text-sm">
                  <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                    Dưới 100.000đ
                  </button>
                  <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                    100.000đ - 500.000đ
                  </button>
                  <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                    500.000đ - 1.000.000đ
                  </button>
                  <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                    Trên 1.000.000đ
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Toolbar */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Hiển thị <span className="font-bold text-lg text-blue-600 dark:text-blue-400">{filteredProducts.length}</span> sản phẩm
                  </div>
                  {selectedCategory && (
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all"
                    >
                      <span>Xóa bộ lọc</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {/* Sort */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="appearance-none px-4 py-2.5 pr-10 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium cursor-pointer"
                    >
                      <option value="name">Tên A-Z</option>
                      <option value="price-asc">Giá thấp đến cao</option>
                      <option value="price-desc">Giá cao đến thấp</option>
                    </select>
                    <svg className="absolute right-3 top-3.5 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* View Mode */}
                  <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === 'grid'
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'
                      }`}
                      title="Lưới"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === 'list'
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'
                      }`}
                      title="Danh sách"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Products */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 font-semibold text-lg">Đang tải sản phẩm...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-2 border-red-300 dark:border-red-700 rounded-2xl p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                  <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-600 dark:text-red-400 font-bold text-xl">{error}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-2">Không tìm thấy sản phẩm</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác</p>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearchKeyword('');
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Xem tất cả sản phẩm
                </button>
              </div>
            ) : (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                    : 'space-y-4'
                }
              >
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onMouseEnter={() => setHoveredProduct(product.id)}
                    onMouseLeave={() => setHoveredProduct(null)}
                    className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group border border-gray-100 dark:border-gray-700 ${
                      viewMode === 'list' ? 'flex' : ''
                    } ${hoveredProduct === product.id ? 'scale-[1.02] -translate-y-1' : ''}`}
                  >
                    {/* Image */}
                    <div className={`relative overflow-hidden bg-gray-100 dark:bg-gray-700 ${viewMode === 'list' ? 'w-64' : 'aspect-square'}`}>
                      <img
                        src={product.imageUrls?.[0] || 'https://via.placeholder.com/400'}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      
                      {/* Overlay with Quick Actions */}
                      <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 ${
                        product.quantity === 0 ? 'opacity-100' : ''
                      }`}>
                        {product.quantity === 0 ? (
                          <div className="w-full text-center">
                            <span className="inline-block px-4 py-2 bg-red-500 text-white font-bold text-sm rounded-lg">
                              Hết hàng
                            </span>
                          </div>
                        ) : (
                          <div className="w-full flex gap-2">
                            <button className="flex-1 px-3 py-2 bg-white/90 backdrop-blur-sm text-gray-900 rounded-lg font-semibold hover:bg-white transition-all text-sm">
                              Xem nhanh
                            </button>
                            <button className="p-2 bg-white/90 backdrop-blur-sm text-red-500 rounded-lg hover:bg-white transition-all">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        {product.quantity <= 5 && product.quantity > 0 && (
                          <span className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                            Sắp hết
                          </span>
                        )}
                        {product.price < 100000 && (
                          <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">
                            Giá tốt
                          </span>
                        )}
                      </div>

                      {/* Image Gallery Indicator */}
                      {product.imageUrls && product.imageUrls.length > 1 && (
                        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs rounded-lg flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {product.imageUrls.length}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className={`p-5 ${viewMode === 'list' ? 'flex-1 flex flex-col justify-between' : ''}`}>
                      <div>
                        {/* Category Badge */}
                        <div className="mb-3">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            {product.categoryName}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer">
                          {product.name}
                        </h3>

                        {/* Description */}
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                          {product.description}
                        </p>

                        {/* Stats */}
                        <div className="flex items-center gap-3 mb-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <span>Còn {product.quantity}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span>4.5</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            <span>123 đã bán</span>
                          </div>
                        </div>
                      </div>

                      {/* Price and Action */}
                      <div className={`${viewMode === 'list' ? 'flex items-center justify-between gap-4' : 'space-y-3'}`}>
                        <div>
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                              {product.price.toLocaleString('vi-VN')}đ
                            </span>
                            {/* Optional: Show original price with discount */}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Bởi {product.sellerUsername}
                          </span>
                        </div>

                        <button
                          onClick={() => handleAddToCart(product.id)}
                          disabled={product.quantity === 0}
                          className={`group/btn px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100 flex items-center justify-center gap-2 ${
                            viewMode === 'list' ? '' : 'w-full'
                          }`}
                        >
                          <svg className="w-5 h-5 group-hover/btn:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Thêm vào giỏ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
