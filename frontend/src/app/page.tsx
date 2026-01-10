'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import ProductDetailPanel from '@/components/ProductDetailPanel';
import ThemeToggle from '@/components/ThemeToggle';
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
  Plus,
  ShieldCheck,
  Facebook,
  Twitter,
  Instagram
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
  <div className={`group relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-2xl shadow-lg overflow-hidden border border-white/30 dark:border-gray-700/30 animate-pulse ${viewMode === 'list' ? 'flex' : ''
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
        <div className={`h-10 bg-gradient-to-r from-blue-200 to-indigo-200 dark:from-blue-800 dark:to-indigo-800 rounded-xl animate-shimmer ${viewMode === 'list' ? 'w-32' : 'w-full'
          }`}></div>
      </div>
    </div>
  </div>
);

export default function HomePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name');
  const [cartCount, setCartCount] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; fullName?: string; avatarUrl?: string } | null>(null);
  const [hoveredProduct, setHoveredProduct] = useState<number | null>(null);
  // Floating particles state for hydration fix
  const [particles, setParticles] = useState<Array<{ left: string, top: string, delay: string, duration: string }>>([]);

  useEffect(() => {
    setParticles([...Array(20)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${3 + Math.random() * 4}s`
    })));
  }, []);

  // Load user data and check authorization
  useEffect(() => {
    if (apiClient.isAuthenticated()) {
      const userData = apiClient.getUserData();
      if (userData) {
        // Redirect ADMIN and BUSINESS users to admin dashboard
        if (userData.role === 'ADMIN' || userData.role === 'BUSINESS') {
          router.push('/admin');
          return;
        }

        setCurrentUser({
          username: userData.username,
          fullName: userData.fullName,
          avatarUrl: userData.avatarUrl
        });
      }
    }
  }, [router]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      setDebouncedSearchKeyword(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
      const count = (cart as any)?.items?.reduce((total: number, item: any) => total + item.quantity, 0) || 0;
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
      showToast('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng', 'warning');
      router.push('/login');
      return;
    }

    try {
      await apiClient.addToCart(productId, 1);
      setCartCount(cartCount + 1);
      showToast('Đã thêm vào giỏ hàng!', 'success');
    } catch (err) {
      showToast('Không thể thêm vào giỏ hàng', 'error');
      console.error(err);
    }
  };

  // Handle Scroll Effect
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 border-b border-white/10 ${isScrolled ? 'bg-[#050505]/80 backdrop-blur-md shadow-lg shadow-black/5' : 'bg-[#050505]'}`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-4 group">
              <div className="relative">
                <div className="w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <img src="/logo.png" alt="AgentBiz Logo" className="w-full h-full object-contain drop-shadow-lg scale-110" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                  BizOps
                </span>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Solutions</div>
              </div>
            </Link>

            {/* Search Bar */}
            <div className="hidden lg:flex flex-1 max-w-xl mx-12">
              <div className="relative w-full group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-lg"></div>
                <div className="relative bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300 flex items-center">
                  <Search className="w-5 h-5 text-slate-400 ml-4" />
                  <input
                    type="text"
                    placeholder="Search for solutions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 bg-transparent border-0 text-white placeholder-slate-500 focus:ring-0 focus:outline-none text-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchKeyword('')}
                      className="p-2 mr-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-slate-300 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                <Menu className="w-6 h-6" />
              </button>

              {isClient && apiClient.isAuthenticated() ? (
                <>
                  <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-lg p-1">
                    <Link
                      href="/ai-chat"
                      className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-all"
                      title="AI Agent"
                    >
                      <Sparkles className="w-5 h-5" />
                    </Link>
                    <Link
                      href="/orders"
                      className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-all"
                      title="Orders"
                    >
                      <FileText className="w-5 h-5" />
                    </Link>
                    <Link
                      href="/cart"
                      className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-all"
                      title="Cart"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      {cartCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </Link>
                  </div>

                  <div className="h-8 w-[1px] bg-white/10 mx-2 hidden sm:block"></div>

                  <Link
                    href="/profile"
                    className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-lg hover:bg-white/5 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-[#050505] group-hover:ring-blue-500/50 transition-all overflow-hidden">
                      {currentUser?.avatarUrl ? (
                        <img
                          src={currentUser.avatarUrl}
                          alt={currentUser.fullName || currentUser.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{(currentUser?.fullName || currentUser?.username || 'U').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="hidden md:block text-left">
                      <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                        {currentUser?.fullName || currentUser?.username || 'Account'}
                      </div>
                    </div>
                  </Link>

                  <button
                    onClick={() => apiClient.logout()}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>

                  {/* Theme Toggle */}
                  <ThemeToggle />
                </>
              ) : isClient ? (
                <>
                  <Link
                    href="/login"
                    className="px-5 py-2.5 text-slate-300 hover:text-white font-medium transition-colors text-sm"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    className="px-5 py-2.5 bg-white text-black rounded-lg hover:bg-slate-200 transition-all font-bold text-sm shadow-lg shadow-white/5"
                  >
                    Đăng ký ngay
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
                    value={searchTerm}
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
      <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center overflow-hidden bg-[#050505]">
        {/* Dynamic Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-[#050505] to-[#050505] z-0"></div>

          {/* Modern Glow Effects */}
          <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[100px] animate-pulse delay-700"></div>

          {/* Subtle Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

          {/* Particle Effects */}
          <div className="absolute inset-0 z-10 w-full h-full">
            {particles.map((p, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/40 rounded-full animate-float blur-[0.5px]"
                style={{
                  left: p.left,
                  top: p.top,
                  animationDelay: p.delay,
                  animationDuration: p.duration
                }}
              />
            ))}
          </div>
        </div>

        {/* Hero Content */}
        <div className="container mx-auto px-4 relative z-20">
          <div className="flex flex-col lg:flex-row items-center gap-16">

            {/* Left Content */}
            <div className="flex-1 text-center lg:text-left pt-10 lg:pt-0">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-medium mb-8 animate-fade-in backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-slate-300">BizOps AI Platform</span>
                <div className="w-[1px] h-3 bg-white/20 mx-2"></div>
                <span className="text-white">v2.0 Released</span>
              </div>

              {/* Main Title */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-8">
                <span className="block animate-slide-up" style={{ animationDelay: '100ms' }}>
                  Transform Your
                </span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 animate-slide-up pb-2" style={{ animationDelay: '200ms' }}>
                  Business Logic
                </span>
                <span className="block text-4xl sm:text-5xl lg:text-6xl font-medium text-slate-400 mt-2 animate-slide-up" style={{ animationDelay: '300ms' }}>
                  With Intelligent AI
                </span>
              </h1>

              {/* Description */}
              <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light animate-slide-up" style={{ animationDelay: '400ms' }}>
                Hệ thống AI Agency tự động hóa quy trình nghiệp vụ, tối ưu vận hành và thúc đẩy tăng trưởng doanh nghiệp của bạn.
              </p>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center animate-slide-up mb-16" style={{ animationDelay: '500ms' }}>
                <Link
                  href="/ai-chat"
                  className="w-full sm:w-auto px-8 py-4 bg-white text-black hover:bg-slate-200 rounded-xl font-bold text-lg transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  Start AI Agent
                </Link>
                <button className="w-full sm:w-auto px-8 py-4 bg-transparent text-white border border-white/20 hover:bg-white/5 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Live Demo
                </button>
              </div>

              {/* Tech Stack */}
              <div className="animate-slide-up" style={{ animationDelay: '600ms' }}>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6 text-center lg:text-left">Powering Next-Gen Business</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto lg:mx-0">
                  {[
                    { name: 'Next.js 16', icon: <svg viewBox="0 0 180 180" fill="none" className="w-full h-full text-white"><mask id="mask0_408_134" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="180" height="180"><circle cx="90" cy="90" r="90" fill="black" /></mask><g mask="url(#mask0_408_134)"><circle cx="90" cy="90" r="90" fill="black" /><path d="M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z" fill="white" /><path d="M115 54H127V125.97H115V54Z" fill="white" /></g></svg> },
                    { name: 'Spring Boot', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg' },
                    { name: 'Python AI', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' },
                    { name: 'MySQL', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg' },
                    { name: 'Redis', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg' },
                    { name: 'Docker', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg' },
                    { name: 'LLM Engine', icon: <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg shadow-purple-500/20"><Sparkles className="w-5 h-5 text-white" /></div> },
                    { name: 'RAG+CHRM', icon: <div className="p-1.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-lg shadow-orange-500/20"><Zap className="w-5 h-5 text-white" /></div> },
                  ].map((tech, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] transition-all cursor-default group hover:scale-105 hover:border-white/10">
                      {tech.logo ? (
                        <div className={`w-8 h-8 flex items-center justify-center transition-transform group-hover:scale-110 ${tech.invert ? 'brightness-0 invert' : ''}`}>
                          <img src={tech.logo} alt={tech.name} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center transition-transform group-hover:scale-110">
                          {tech.icon}
                        </div>
                      )}
                      <span className="text-slate-300 font-medium text-sm group-hover:text-white transition-colors">{tech.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Content - 3D Visual */}
            <div className="hidden lg:block w-1/2 relative">
              <div className="relative w-full aspect-square max-w-[550px] mx-auto animate-float">

                {/* Backdrop Glows */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-indigo-500/20 rounded-full blur-[100px]"></div>

                {/* Main Dashboard Preview */}
                <div className="relative z-10 bg-[#0F111A] rounded-2xl border border-white/10 shadow-2xl overflow-hidden p-2 transform rotate-y-[-5deg] rotate-x-[5deg] transition-transform duration-500 hover:rotate-0">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none"></div>
                  {/* Window Header */}
                  <div className="h-8 bg-[#1A1D2D] rounded-t-xl flex items-center px-4 gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                  </div>
                  {/* Content */}
                  <div className="bg-[#0B0D14] rounded-xl p-6 min-h-[400px] flex flex-col gap-6">
                    {/* Fake Stats Row */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-[#151926] p-4 rounded-lg border border-white/5">
                        <div className="text-xs text-slate-500 mb-1">Total Token</div>
                        <div className="text-xl font-bold text-white">160K+</div>
                      </div>
                      <div className="bg-[#151926] p-4 rounded-lg border border-white/5">
                        <div className="text-xs text-slate-500 mb-1">Active Modal LLM</div>
                        <div className="text-xl font-bold text-white">15+</div>
                      </div>
                      <div className="bg-[#151926] p-4 rounded-lg border border-white/5">
                        <div className="text-xs text-slate-500 mb-1">LPU</div>
                        <div className="text-xl font-bold text-emerald-400">High Speed</div>
                      </div>
                    </div>

                    {/* Fake Graph */}
                    <div className="h-40 bg-[#151926] rounded-lg border border-white/5 relative overflow-hidden group">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex gap-1 items-end h-20 w-full px-8 opacity-50">
                          <div className="w-full bg-indigo-500/50 h-[40%] rounded-t-sm"></div>
                          <div className="w-full bg-indigo-500/70 h-[70%] rounded-t-sm"></div>
                          <div className="w-full bg-indigo-500/40 h-[50%] rounded-t-sm"></div>
                          <div className="w-full bg-indigo-500/80 h-[90%] rounded-t-sm"></div>
                          <div className="w-full bg-indigo-500/60 h-[60%] rounded-t-sm"></div>
                        </div>
                      </div>F
                      {/* Hover Effect */}
                      <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>

                    {/* Fake Chat */}
                    <div className="flex flex-col gap-3">
                      <div className="self-end bg-blue-600 px-4 py-2 rounded-2xl rounded-tr-sm text-xs text-white">
                        Analyze performance
                      </div>
                      <div className="self-start bg-[#1F2437] px-4 py-3 rounded-2xl rounded-tl-sm text-xs text-slate-300 border border-white/5 max-w-[90%]">
                        <span className="text-indigo-400 font-bold block mb-1">AI Agent</span>
                        Based on Q3 data, revenue increased by 24% driven by enterprise adoption. Customer retention improved by 15%.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -right-2 top-10 bg-[#1A1D2D]/90 backdrop-blur-xl p-4 rounded-xl border border-white/10 shadow-2xl animate-float delay-1000">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Growth</div>
                      <div className="text-lg font-bold text-white">+124%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section - New Addition */}
      {/* Features Section - Compact */}
      <section className="py-8 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/20 hover:shadow-sm transition-all duration-300">
              <div className="shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Tốc độ vượt trội</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Xử lý hàng nghìn giao dịch/giây với độ trễ cực thấp.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/20 hover:shadow-sm transition-all duration-300">
              <div className="shrink-0 w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Bảo mật đa lớp</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Mã hóa đầu cuối, đạt chuẩn an ninh quốc tế.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/20 hover:shadow-sm transition-all duration-300">
              <div className="shrink-0 w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Phân tích chuyên sâu</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Báo cáo & dự báo xu hướng thời gian thực.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

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

      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar Container - Optimized */}
          <div className={`lg:w-72 flex-shrink-0 space-y-8 ${isMobileMenuOpen ? 'block' : 'hidden lg:block'}`}>

            {/* Categories Sidebar */}
            <aside className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-24">
              <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Tag className="w-5 h-5 text-blue-600" />
                  Danh mục
                </h2>
              </div>
              <div className="p-3 space-y-1 max-h-[60vh] overflow-y-auto scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full px-4 py-3 rounded-xl transition-all flex items-center gap-3 text-sm font-medium ${selectedCategory === null
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                  <div className={`p-1.5 rounded-lg ${selectedCategory === null ? 'bg-blue-200 dark:bg-blue-800' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <Grid3X3 className="w-4 h-4" />
                  </div>
                  Tất cả sản phẩm
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full px-4 py-3 rounded-xl transition-all flex items-center gap-3 text-sm font-medium ${selectedCategory === category.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                      {category.imageUrl ? (
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            // Fallback logic handled by CSS/Parent
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Tag className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <span className="truncate">{category.name}</span>
                  </button>
                ))}
              </div>
            </aside>

            {/* Filters Sidebar */}
            <aside className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-[calc(24px+400px)]">
              <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Filter className="w-5 h-5 text-blue-600" />
                  Bộ lọc
                </h2>
              </div>
              <div className="p-4 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Sắp xếp</h3>
                  <div className="space-y-2">
                    {[
                      { value: 'name', label: 'Tên A-Z', icon: List },
                      { value: 'price-asc', label: 'Giá thấp đến cao', icon: TrendingUp },
                      { value: 'price-desc', label: 'Giá cao đến thấp', icon: TrendingUp },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSortBy(option.value as "name" | "price-asc" | "price-desc")}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${sortBy === option.value
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <option.icon className={`w-4 h-4 ${option.value === 'price-desc' ? 'rotate-180' : ''}`} />
                          {option.label}
                        </div>
                        {sortBy === option.value && <CheckCircle className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="font-semibold">{filteredProducts.length}</span>
                <span className="text-gray-500">sản phẩm</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Search for Mobile */}
                <div className="relative md:hidden w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pl-9 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                </div>

                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    title="Dạng lưới"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'list'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    title="Dạng danh sách"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Product Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, index) => (
                  <ProductSkeleton key={index} viewMode={viewMode} />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Không tìm thấy sản phẩm</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearchTerm('');
                  }}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              <div className={viewMode === 'grid'
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "flex flex-col gap-4"
              }>
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProductId(product.id)}
                    className={`group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer ${viewMode === 'list' ? 'flex flex-row items-center gap-6 p-4' : 'flex flex-col'
                      }`}
                  >
                    {/* Image Area */}
                    <div className={`relative overflow-hidden bg-gray-100 dark:bg-gray-700 ${viewMode === 'list' ? 'w-48 h-32 rounded-lg flex-shrink-0' : 'aspect-[4/3] w-full'
                      }`}>
                      <img
                        src={product.imageUrls?.[0]}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop';
                        }}
                      />

                      {/* Overlays */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {product.price < 500000 && (
                          <span className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider rounded">Hot Deal</span>
                        )}
                        {product.quantity <= 5 && product.quantity > 0 && (
                          <span className="px-2 py-1 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider rounded">Sắp hết</span>
                        )}
                      </div>

                      {/* Add to Cart Overlay (Grid only) */}
                      {viewMode === 'grid' && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(product.id);
                            }}
                            disabled={product.quantity === 0}
                            className="px-6 py-2.5 bg-white text-gray-900 rounded-full font-bold text-sm transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:scale-105 flex items-center gap-2"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            {product.quantity > 0 ? 'Thêm vào giỏ' : 'Hết hàng'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Content Area */}
                    <div className={`flex-1 flex flex-col ${viewMode === 'grid' ? 'p-5' : 'py-1 pr-4'}`}>
                      <div className="mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          {product.categoryName}
                        </span>
                      </div>

                      <h3 className="font-bold text-gray-900 dark:text-white leading-tight mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                        {product.name}
                      </h3>

                      {viewMode === 'list' && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                          {product.description}
                        </p>
                      )}

                      {/* Spacer for Grid */}
                      <div className="flex-1"></div>

                      <div className="flex items-end justify-between mt-3">
                        <div className="flex flex-col">
                          <span className="text-lg font-black text-gray-900 dark:text-white">
                            {product.price.toLocaleString('vi-VN')}₫
                          </span>
                          {product.price > 1000000 && (
                            <span className="text-xs text-gray-400 line-through">
                              {(product.price * 1.1).toLocaleString('vi-VN')}₫
                            </span>
                          )}
                        </div>

                        {/* Button for List View */}
                        {viewMode === 'list' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(product.id);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition"
                          >
                            Mua ngay
                          </button>
                        )}

                        {/* Rating for Grid View */}
                        {viewMode === 'grid' && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            <span>4.8</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Footer - New Addition */}
      <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pt-16 pb-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white">
                  <Briefcase className="w-5 h-5" />
                </div>
                <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-blue-900 dark:from-white dark:to-blue-200">
                  BizOps
                </span>
              </Link>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                Nền tảng quản lý và tối ưu hóa doanh nghiệp toàn diện với sức mạnh của AI.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-4">Sản phẩm</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li><Link href="#" className="hover:text-blue-600 transition-colors">Tính năng</Link></li>
                <li><Link href="#" className="hover:text-blue-600 transition-colors">Giải pháp</Link></li>
                <li><Link href="#" className="hover:text-blue-600 transition-colors">Bảng giá</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-4">Hỗ trợ</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li><Link href="#" className="hover:text-blue-600 transition-colors">Tài liệu</Link></li>
                <li><Link href="#" className="hover:text-blue-600 transition-colors">API</Link></li>
                <li><Link href="#" className="hover:text-blue-600 transition-colors">Liên hệ</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-4">Kết nối</h4>
              <div className="flex gap-4">
                <a href="#" className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                  <Facebook className="w-4 h-4" />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-blue-400 hover:text-white transition-all">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-all">
                  <Instagram className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-500 dark:text-gray-400">
            © 2024 BizOps AI. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        {/* Scroll to Top */}
        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-12 h-12 bg-white dark:bg-gray-800 text-gray-600 dark:text-white rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:-translate-y-1 transition-transform"
            title="Lên đầu trang"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}

        {/* Quick Cart */}
        {isClient && apiClient.isAuthenticated() && (
          <Link
            href="/cart"
            className="relative w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center hover:scale-110 transition-transform group"
            title="Giỏ hàng"
          >
            <ShoppingCart className="w-6 h-6 group-hover:animate-bounce" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white dark:border-gray-900 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
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
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity duration-500"
            onClick={() => setSelectedProductId(null)}
          />

          {/* Detail Panel */}
          <div className="fixed top-0 right-0 h-full w-full md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-2xl z-50 animate-slide-in-right bg-white dark:bg-gray-900">
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

