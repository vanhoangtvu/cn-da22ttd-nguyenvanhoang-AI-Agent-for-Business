'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import ProductDetailPanel from '@/components/ProductDetailPanel';
import {
  ShoppingCart,
  Settings,
  FileText,
  ShoppingBag,
  User,
  LogOut,
  Search,
  Star,
  Package,
  Truck,
  Heart,
  Eye,
  Grid3X3,
  List,
  X,
  Tag,
  Filter,
  ChevronDown,
  Zap,
  Sparkles,
  Award,
  Briefcase,
  Clock,
  TrendingUp,
  Users,
  MapPin,
  Phone,
  Mail,
  Globe,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Home,
  ChevronRight,
  SlidersHorizontal,
  HeartHandshake,
  Gift,
  ArrowUp,
  Menu,
  Plus
} from 'lucide-react';

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

// Modern Skeleton Loading Component
const ProductSkeleton = ({ viewMode }: { viewMode: 'grid' | 'list' }) => (
  <div className={`group relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-2xl shadow-lg overflow-hidden border border-white/30 dark:border-gray-700/30 animate-pulse ${
    viewMode === 'list' ? 'flex' : ''
  }`}>
    {/* Image Skeleton */}
    <div className={`relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 ${viewMode === 'list' ? 'w-48' : 'aspect-[4/3]'}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-gray-200/50 to-gray-300/50 dark:from-gray-600/50 dark:to-gray-700/50 animate-shimmer"></div>

      {/* Badge Skeletons */}
      <div className="absolute top-3 left-3 flex flex-col gap-2">
        <div className="w-14 h-5 bg-white/60 rounded-lg animate-shimmer"></div>
        <div className="w-12 h-5 bg-white/60 rounded-lg animate-shimmer"></div>
      </div>

      {/* Gallery Indicator Skeleton */}
      <div className="absolute bottom-3 right-3 w-10 h-5 bg-black/40 rounded-lg animate-shimmer"></div>
    </div>

    {/* Content Skeleton */}
    <div className={`p-4 ${viewMode === 'list' ? 'flex-1 flex flex-col justify-between' : ''}`}>
      <div>
        {/* Category Badge Skeleton */}
        <div className="mb-3 w-20 h-6 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl animate-shimmer"></div>

        {/* Title Skeleton */}
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2 animate-shimmer"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5 mb-4 animate-shimmer"></div>

        {/* Stats Skeleton */}
        <div className="flex gap-3 mb-4">
          <div className="w-14 h-5 bg-green-50 dark:bg-green-900/20 rounded-lg animate-shimmer"></div>
          <div className="w-12 h-5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg animate-shimmer"></div>
          <div className="w-14 h-5 bg-purple-50 dark:bg-purple-900/20 rounded-lg animate-shimmer"></div>
        </div>
      </div>

      {/* Price and Button Skeleton */}
      <div className={`${viewMode === 'list' ? 'flex items-center justify-between gap-4' : 'space-y-3'}`}>
        <div className="flex-1">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg mb-1 animate-shimmer"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-shimmer"></div>
        </div>
        <div className={`h-10 bg-gradient-to-r from-blue-200 to-indigo-200 dark:from-blue-800 dark:to-indigo-800 rounded-xl animate-shimmer ${
          viewMode === 'list' ? 'w-32' : 'w-full'
        }`}></div>
      </div>
    </div>
  </div>
);

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name');
  const [cartCount, setCartCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [hoveredProduct, setHoveredProduct] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  // Scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load products and categories
  useEffect(() => {
    loadData();
  }, []);

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Debounce search keyword
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchKeyword(searchKeyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // Handle mobile menu close on ESC and click outside
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMobileMenuOpen && !target.closest('.mobile-menu-container')) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        apiClient.getAllProducts(),
        apiClient.getAllCategories(),
      ]);
      setProducts(productsData as Product[]);
      setCategories((categoriesData as Category[]).filter((cat: Category) => cat.status === 'ACTIVE'));
      
      // Load cart count if authenticated
      if (apiClient.isAuthenticated()) {
        await loadCartCount();
      }
    } catch (err) {
      setError('Không thể tải dữ liệu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCartCount = async () => {
    try {
      const cart = await apiClient.getCart();
      const count = cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
      setCartCount(count);
    } catch (err) {
      console.error('Không thể tải số lượng giỏ hàng:', err);
    }
  };

  // Filter and sort products
  const filteredProducts = products
    .filter((product) => {
      if (selectedCategory && product.categoryId !== selectedCategory) return false;
      if (debouncedSearchKeyword && !product.name.toLowerCase().includes(debouncedSearchKeyword.toLowerCase())) return false;
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
      <header className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-4 group">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center shadow-2xl group-hover:shadow-3xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <Briefcase className="w-8 h-8 text-white relative z-10 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full"></div>
              </div>
              <div>
                <span className="text-2xl font-black bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 dark:from-slate-200 dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent tracking-tight">
                  BizOps
                </span>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">Smart Business Solutions</div>
              </div>
            </Link>

            {/* Search Bar */}
            <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
              <div className="relative w-full group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-xl"></div>
                <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02] group-hover:border-blue-300/50 dark:group-hover:border-blue-400/50">
                  <input
                    type="text"
                    placeholder="Tìm kiếm sản phẩm..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full px-6 py-4 pl-14 bg-transparent border-0 rounded-2xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0 focus:outline-none transition-all duration-300 text-lg"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 group-hover:from-blue-600 group-hover:to-indigo-700 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  {searchKeyword && (
                    <button
                      onClick={() => setSearchKeyword('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>



              {isClient && apiClient.isAuthenticated() ? (
                <>
                  {(() => {
                    const userData = apiClient.getUserData();
                    const isAdminOrBusiness = userData && (userData.role === 'ADMIN' || userData.role === 'BUSINESS');
                    return isAdminOrBusiness ? (
                      <Link
                        href="/admin"
                        className="hidden sm:flex px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold items-center gap-2 hover:scale-105"
                      >
                        <Settings className="w-5 h-5" />
                        <span className="hidden lg:inline">Quản lý</span>
                      </Link>
                    ) : null;
                  })()}
                  <Link
                    href="/ai-chat"
                    className="p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Agent Chat"
                  >
                    <Sparkles className="w-6 h-6" />
                  </Link>
                  <Link
                    href="/orders"
                    className="p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Đơn hàng"
                  >
                    <FileText className="w-6 h-6" />
                  </Link>
                  <Link
                    href="/cart"
                    className="relative p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Giỏ hàng"
                  >
                    <ShoppingCart className="w-6 h-6" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/profile"
                    className="p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Thông tin cá nhân"
                  >
                    <User className="w-6 h-6" />
                  </Link>
                  <button
                    onClick={() => apiClient.logout()}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : isClient ? (
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
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-container md:hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex flex-col gap-4">
              <div className="mt-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm kiếm sản phẩm..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full px-4 py-3 pl-12 bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative min-h-[600px] bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-hidden">
        {/* Modern Animated Background */}
        <div className="absolute inset-0">
          {/* Gradient Mesh */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-cyan-600/20"></div>

          {/* Floating Particles */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${3 + Math.random() * 4}s`
                }}
              ></div>
            ))}
          </div>

          {/* Geometric Shapes */}
          <div className="absolute top-20 left-10 w-32 h-32 border border-white/10 rounded-full animate-spin-slow"></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 bg-gradient-to-br from-cyan-400/10 to-blue-400/10 rounded-lg rotate-45"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-16 border-2 border-white/5 rounded-full animate-bounce"></div>
        </div>

        {/* Content */}
        <div className="relative container mx-auto px-4 h-full flex items-center py-20">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-xl rounded-full text-white text-sm font-semibold mb-8 border border-white/20 shadow-2xl">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              <span>🚀 BizOps Platform</span>
              <Sparkles className="w-4 h-4" />
            </div>

            {/* Main Title */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-white mb-8 leading-tight">
              <span className="block animate-slide-up">Nâng Tầm</span>
              <span className="block bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent animate-slide-up animation-delay-200">
                Doanh Nghiệp
              </span>
              <span className="block text-4xl md:text-5xl lg:text-6xl font-bold text-white/80 animate-slide-up animation-delay-400">
                Với Công Nghệ AI
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-2xl leading-relaxed animate-slide-up animation-delay-600">
              Khám phá các giải pháp kinh doanh thông minh, tối ưu hóa quy trình và tăng trưởng bền vững với nền tảng BizOps.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 animate-slide-up animation-delay-800">
              <button
                onClick={() => setSelectedCategory(null)}
                className="group px-10 py-5 bg-gradient-to-r from-white to-gray-100 text-slate-900 rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3"
              >
                <Zap className="w-6 h-6 group-hover:animate-pulse" />
                Khám phá ngay
              </button>
              <button className="group px-10 py-5 bg-white/10 backdrop-blur-xl text-white rounded-2xl font-bold text-lg hover:bg-white/20 transition-all duration-300 border-2 border-white/30 hover:border-white/50 flex items-center justify-center gap-3">
                <TrendingUp className="w-6 h-6 group-hover:scale-110 transition-transform" />
                Xem Demo
              </button>
            </div>

            {/* Technology Stack */}
            <div className="flex flex-wrap gap-6 mt-12 animate-slide-up animation-delay-1000 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="flex justify-center mb-1">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 0 1-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 0 0-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.25 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 0 0-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 0 1-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 0 1-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 0 1 .174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 0 0 4.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 0 0 2.466-2.163 11.944 11.944 0 0 0 2.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 0 0-2.499-.523A33.119 33.119 0 0 0 11.573 0zm4.069 7.217c.347 0 .408.005.486.047a.473.473 0 0 1 .237.277c.018.06.023 1.365.018 4.304l-.006 4.218-.744-1.14-.746-1.14v-3.066c0-1.982.01-3.097.023-3.15a.478.478 0 0 1 .233-.296c.096-.05.13-.054.5-.054z"/>
                  </svg>
                </div>
                <div className="text-sm font-semibold text-white mb-0.5">Next.js</div>
                <div className="text-white/60 text-xs">Frontend</div>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-1">
                  <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.205 16.392c-2.469 3.289-7.741 2.179-11.122 2.338 0 0-.599.034-1.201.133 0 0 .228-.097.519-.198 2.374-.821 3.496-.986 4.939-1.727 2.71-1.388 5.408-4.413 5.957-7.555-1.032 3.022-4.17 5.623-7.027 6.679-1.955.722-5.492 1.424-5.493 1.424a5.28 5.28 0 0 1-.143-.076c-2.405-1.17-2.475-6.38 1.894-8.059 1.916-.736 3.747-.332 5.818-.825 2.208-.525 4.766-2.18 5.805-4.344 1.165 3.458 2.565 8.866.054 12.21zm.042-13.28a9.212 9.212 0 0 1-1.065 1.89 9.982 9.982 0 0 0-7.167-3.031C6.492 1.971 2 6.463 2 11.985a9.983 9.983 0 0 0 3.205 7.334l.22.194a.856.856 0 1 1 .001.001l.149.132A9.96 9.96 0 0 0 12.015 22c5.278 0 9.613-4.108 9.984-9.292.274-2.539-.476-5.763-1.752-9.596"/>
                  </svg>
                </div>
                <div className="text-sm font-semibold text-white mb-0.5">Spring Boot</div>
                <div className="text-white/60 text-xs">Backend</div>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-1">
                  <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z"/>
                  </svg>
                </div>
                <div className="text-sm font-semibold text-white mb-0.5">Python</div>
                <div className="text-white/60 text-xs">AI Service</div>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-1">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <ellipse cx="12" cy="5" rx="9" ry="3"/>
                    <path d="m21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                    <path d="m3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                  </svg>
                </div>
                <div className="text-sm font-semibold text-white mb-0.5">MySQL</div>
                <div className="text-white/60 text-xs">Database</div>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-1">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <div className="text-sm font-semibold text-white mb-0.5">LLM</div>
                <div className="text-white/60 text-xs">AI Engine</div>
              </div>
            </div>
          </div>

          {/* Modern Decorative Elements */}
          <div className="hidden xl:block absolute right-10 top-1/2 -translate-y-1/2">
            <div className="relative">
              {/* Main Card */}
              <div className="w-96 h-96 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 rotate-6 hover:rotate-12 transition-transform duration-700 animate-float">
                <div className="p-8 h-full flex flex-col justify-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <Briefcase className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">BizOps Suite</h3>
                  <p className="text-white/80 text-sm leading-relaxed">
                    Nền tảng toàn diện cho quản lý và tối ưu hóa hoạt động kinh doanh với AI thông minh.
                  </p>
                  <div className="flex gap-2 mt-6">
                    <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-blue-400 rounded-full animation-delay-200"></div>
                    <div className="w-3 h-3 bg-purple-400 rounded-full animation-delay-400"></div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -left-4 w-20 h-20 bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 rounded-full blur-xl animate-bounce"></div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2"></div>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <Home className="w-4 h-4" />
              Trang chủ
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              {selectedCategory ? categories.find(cat => cat.id === selectedCategory)?.name || 'Cửa hàng' : 'Cửa hàng'}
            </span>
          </nav>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200/50 dark:border-blue-800/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <HeartHandshake className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                  Chào mừng bạn đến với BizOps! 🎉
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Nâng tầm hiệu quả kinh doanh với các giải pháp công nghệ và sản phẩm chất lượng cao
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span>Miễn phí vận chuyển</span>
              </div>
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Shield className="w-4 h-4" />
                <span>Bảo hành chính hãng</span>
              </div>
              <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                <Award className="w-4 h-4" />
                <span>Chất lượng đảm bảo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar Container */}
          <div className="w-64 flex-shrink-0 hidden lg:block">
            {/* Sidebar - Categories */}
            <aside className="mb-6">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Tag className="w-6 h-6 text-blue-600" />
                  Danh mục
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full p-3 rounded-xl transition-all hover:shadow-md ${
                      selectedCategory === null
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${selectedCategory === null ? 'bg-white/20' : 'bg-white dark:bg-gray-600'}`}>
                        <Grid3X3 className="w-5 h-5" />
                      </div>
                      <span className="font-medium">Tất cả sản phẩm</span>
                    </div>
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full p-3 rounded-xl transition-all hover:shadow-md ${
                        selectedCategory === category.id
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center flex-shrink-0">
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
                                  svg.setAttribute('class', 'w-5 h-5 text-blue-600 dark:text-blue-400');
                                  svg.setAttribute('fill', 'none');
                                  svg.setAttribute('stroke', 'currentColor');
                                  svg.setAttribute('viewBox', '0 0 24 24');
                                  svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />';
                                  parent.appendChild(svg);
                                }
                              }}
                            />
                          ) : (
                            <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <span className="font-medium text-left line-clamp-2">{category.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Sidebar - Filters */}
            <aside>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 sticky top-24">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Filter className="w-6 h-6 text-blue-600" />
                  Bộ lọc
                </h2>

                {/* Quick Filters */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">Lọc nhanh</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSortBy('price-asc')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        sortBy === 'price-asc'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 inline mr-1" />
                      Giá thấp
                    </button>
                    <button
                      onClick={() => setSortBy('price-desc')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        sortBy === 'price-desc'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 inline mr-1 rotate-180" />
                      Giá cao
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        viewMode === 'grid'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Grid3X3 className="w-4 h-4 inline mr-1" />
                      Lưới
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        viewMode === 'list'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <List className="w-4 h-4 inline mr-1" />
                      Danh sách
                    </button>
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
          </div>

          {/* Mobile Filter Bar */}
          <div className="lg:hidden mb-6">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl p-4 border border-white/20 dark:border-gray-700/50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Bộ lọc</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="name">Tên A-Z</option>
                    <option value="price-asc">Giá thấp</option>
                    <option value="price-desc">Giá cao</option>
                  </select>
                  <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-md transition-all ${
                        viewMode === 'grid'
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-md transition-all ${
                        viewMode === 'list'
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1">
            {/* Modern Toolbar */}
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 mb-8 border border-white/40 dark:border-gray-700/40">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Hiển thị</div>
                      <div className="text-2xl font-black bg-gradient-to-r from-slate-800 to-blue-800 dark:from-slate-200 dark:to-blue-200 bg-clip-text text-transparent">
                        {filteredProducts.length} sản phẩm
                      </div>
                    </div>
                  </div>
                  {selectedCategory && (
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300 border border-red-200/50 dark:border-red-800/50"
                    >
                      <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                      <span>Xóa bộ lọc</span>
                    </button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  {/* Enhanced Sort */}
                  <div className="relative group">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="appearance-none px-6 py-3 pr-12 bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300/50 transition-all duration-300 font-semibold cursor-pointer shadow-lg hover:shadow-xl text-gray-900 dark:text-gray-100"
                    >
                      <option value="name">📝 Tên A-Z</option>
                      <option value="price-asc">💰 Giá thấp → cao</option>
                      <option value="price-desc">💎 Giá cao → thấp</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-hover:text-blue-500 transition-colors pointer-events-none" />
                  </div>

                  {/* Modern View Mode */}
                  <div className="flex gap-2 bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl p-1.5 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-600/50">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`group p-3 rounded-xl transition-all duration-300 ${
                        viewMode === 'grid'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50 hover:scale-105'
                      }`}
                      title="Chế độ lưới"
                    >
                      <Grid3X3 className={`w-5 h-5 ${viewMode === 'grid' ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'}`} />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`group p-3 rounded-xl transition-all duration-300 ${
                        viewMode === 'list'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50 hover:scale-105'
                      }`}
                      title="Chế độ danh sách"
                    >
                      <List className={`w-5 h-5 ${viewMode === 'list' ? 'animate-pulse' : 'group-hover:-rotate-12 transition-transform'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Products */}
            {loading ? (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                    : 'space-y-3'
                }
              >
                {Array.from({ length: 12 }).map((_, index) => (
                  <ProductSkeleton key={index} viewMode={viewMode} />
                ))}
              </div>
            ) : error ? (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-2 border-red-300 dark:border-red-700 rounded-2xl p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                  <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-red-600 dark:text-red-400 font-bold text-xl">{error}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl p-12 text-center border border-white/20 dark:border-gray-700/50">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full mb-6">
                  <Package className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Không tìm thấy sản phẩm</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                  {searchKeyword
                    ? `Không có sản phẩm nào khớp với "${searchKeyword}". Hãy thử tìm kiếm với từ khóa khác hoặc duyệt các danh mục phổ biến.`
                    : 'Không có sản phẩm nào trong danh mục này. Hãy khám phá các danh mục khác!'
                  }
                </p>

                {/* Quick Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setSearchKeyword('');
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <Grid3X3 className="w-5 h-5" />
                    Xem tất cả sản phẩm
                  </button>
                </div>

                {/* Popular Categories */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                  <h4 className="text-lg font-semibold mb-4">Danh mục phổ biến</h4>
                  <div className="flex flex-wrap justify-center gap-3">
                    {categories.slice(0, 6).map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-all hover:scale-105 flex items-center gap-2"
                      >
                        <Tag className="w-4 h-4" />
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                    : 'space-y-3'
                }
              >
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onMouseEnter={() => setHoveredProduct(product.id)}
                    onMouseLeave={() => setHoveredProduct(null)}
                    onClick={() => setSelectedProductId(product.id)}
                    className={`group relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-2xl shadow-lg hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10 transition-all duration-500 overflow-hidden border border-white/30 dark:border-gray-700/30 cursor-pointer ${
                      viewMode === 'list' ? 'flex' : ''
                    } ${hoveredProduct === product.id ? 'scale-[1.02] -translate-y-1 shadow-2xl' : ''}`}
                  >

                    {/* Image Container */}
                    <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-48' : 'aspect-[4/3]'} bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800`}>
                      <img
                        src={product.imageUrls?.[0] || `https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop&crop=center&auto=format&q=75`}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.src.includes('placeholder')) {
                            target.src = `https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop&crop=center&auto=format&q=75`;
                          }
                        }}
                      />

                      {/* Loading overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 opacity-0 group-hover:opacity-0 transition-opacity duration-300"></div>

                      {/* Enhanced Overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end p-4 ${
                        product.quantity === 0 ? 'opacity-100' : ''
                      }`}>
                        {product.quantity === 0 ? (
                          <div className="w-full text-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/90 backdrop-blur-sm text-white font-bold text-sm rounded-xl shadow-lg">
                              <X className="w-4 h-4" />
                              Hết hàng
                            </span>
                          </div>
                        ) : (
                          <div className="w-full flex justify-end transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <button className="p-2 bg-white/95 backdrop-blur-sm text-red-500 rounded-lg hover:bg-white hover:scale-105 transition-all duration-200 shadow-lg">
                              <Heart className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Modern Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        {product.quantity <= 5 && product.quantity > 0 && (
                          <span className="px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-lg shadow-lg backdrop-blur-sm border border-white/20 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Sắp hết
                          </span>
                        )}
                        {product.price < 100000 && (
                          <span className="px-2 py-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-bold rounded-lg shadow-lg backdrop-blur-sm border border-white/20 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Giá tốt
                          </span>
                        )}
                        <span className="px-2 py-1 bg-gradient-to-r from-blue-500/80 to-indigo-500/80 backdrop-blur-sm text-white text-xs font-semibold rounded-lg shadow-lg border border-white/20">
                          Mới
                        </span>
                      </div>

                      {/* Enhanced Gallery Indicator */}
                      {product.imageUrls && product.imageUrls.length > 1 && (
                        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs rounded-lg flex items-center gap-1 shadow-lg border border-white/10">
                          <div className="flex gap-0.5">
                            {[...Array(Math.min(product.imageUrls.length, 3))].map((_, i) => (
                              <div key={i} className="w-1 h-1 bg-white/60 rounded-full"></div>
                            ))}
                          </div>
                          <span className="font-medium">{product.imageUrls.length}</span>
                        </div>
                      )}
                    </div>

                    {/* Enhanced Content */}
                    <div className={`relative p-4 ${viewMode === 'list' ? 'flex-1 flex flex-col justify-between' : ''}`}>
                      <div>
                        {/* Premium Category Badge */}
                        <div className="mb-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            {product.categoryName}
                          </span>
                        </div>

                        {/* Enhanced Title */}
                        <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 leading-tight">
                          {product.name}
                        </h3>

                        {/* Improved Description */}
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>

                        {/* Modern Stats */}
                        <div className="flex items-center gap-3 mb-4 text-xs">
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg" title={`Còn ${product.quantity} sản phẩm`}>
                            <Package className="w-3 h-3" />
                            <span className="font-medium">
                              {product.quantity === 0 ? 'Hết hàng' :
                               product.quantity <= 5 ? 'Còn ít' :
                               product.quantity <= 20 ? 'Còn nhiều' : 'Còn hàng'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg">
                            <Star className="w-3 h-3 fill-current" />
                            <span className="font-medium">4.8</span>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg">
                            <Users className="w-3 h-3" />
                            <span className="font-medium">
                              {Math.floor(Math.random() * 50) + 10}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Price and Action */}
                      <div className={`${viewMode === 'list' ? 'flex items-center justify-between gap-4' : 'space-y-3'}`}>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-2xl font-black bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 dark:from-slate-200 dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                              {product.price.toLocaleString('vi-VN')}đ
                            </span>
                            <span className="text-sm text-gray-400 line-through">
                              {(product.price * 1.2).toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              {product.sellerUsername}
                            </span>
                            <div className="flex items-center gap-1">
                              <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddToCart(product.id)}
                          disabled={product.quantity === 0}
                          className={`px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                            viewMode === 'list' ? '' : 'w-full'
                          }`}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>Thêm</span>
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

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        {/* Scroll to Top */}
        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center group"
            title="Lên đầu trang"
          >
            <ArrowUp className="w-6 h-6 group-hover:animate-bounce" />
          </button>
        )}

        {/* Quick Cart */}
        {isClient && apiClient.isAuthenticated() && (
          <Link
            href="/cart"
            className="relative w-14 h-14 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center group"
            title="Giỏ hàng"
          >
            <ShoppingCart className="w-6 h-6 group-hover:animate-bounce" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                {cartCount}
              </span>
            )}
          </Link>
        )}
      </div>

      {/* Product Detail Panel - Slide in from right */}
      {selectedProductId && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-500"
            onClick={() => setSelectedProductId(null)}
          />
          
          {/* Detail Panel */}
          <div className="fixed top-0 right-0 h-full w-1/2 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 animate-slide-in-right bg-white dark:bg-gray-900">
            <ProductDetailPanel
              productId={selectedProductId}
              onClose={() => setSelectedProductId(null)}
            />
          </div>
        </>
      )}
    </div>
  );
}
