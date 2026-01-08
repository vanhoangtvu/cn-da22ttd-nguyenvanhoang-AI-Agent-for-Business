'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import {
  X,
  ShoppingCart,
  CreditCard,
  Heart,
  Share2,
  ShieldCheck,
  Truck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Star,
  Info,
  Package,
  Layers,
  Zap,
} from 'lucide-react';

interface ProductDetailPanelProps {
  productId: number;
  onClose: () => void;
}

interface ProductDetails {
  rating?: number;
  reviews?: number;
  discount?: number;
  originalPrice?: number;
  brand?: string;
  model?: string;
  warranty?: string;
  weight?: number | string;
  dimensions?: string;
  material?: string;
  color?: string;
  storage?: string;
  type?: string;
  specifications?: Record<string, string>;
  deliveryTime?: string;
  returnPolicy?: string;
  isFeatured?: boolean;
  features?: string[];
  connectivity?: string[];
  accessories?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Helper function to parse product details
function parseProductDetails(detailsJson?: string): ProductDetails {
  if (!detailsJson) return {};
  try {
    return JSON.parse(detailsJson) as ProductDetails;
  } catch (error) {
    console.error('Error parsing product details:', error);
    return {};
  }
}

interface ProductDetail {
  id: number;
  name: string;
  price: number;
  imageUrls: string[];
  description: string;
  quantity: number;
  status: string;
  categoryName: string;
  categoryId: number;
  sellerUsername?: string;
  sellerId?: number;
  details?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ProductDetailPanel({ productId, onClose }: ProductDetailPanelProps) {
  const { showToast } = useToast();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addToCartSuccess, setAddToCartSuccess] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');
  const [isLiked, setIsLiked] = useState(false);

  const loadProductDetail = async () => {
    try {
      setLoading(true);
      const data = (await apiClient.getProduct(productId)) as ProductDetail;
      setProduct(data);
      setSelectedImageIndex(0);
    } catch (error) {
      console.error('Error loading product:', error);
      showToast('Không thể tải thông tin sản phẩm', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // Enhanced Auto-rotate images
  useEffect(() => {
    if (!product || !product.imageUrls || product.imageUrls.length < 2 || !isAutoPlaying) {
      return;
    }

    const interval = setInterval(() => {
      setSelectedImageIndex((prevIndex) =>
        (prevIndex + 1) % product.imageUrls.length
      );
    }, 5000); // Slower interval for better viewing

    return () => clearInterval(interval);
  }, [product, selectedImageIndex, isAutoPlaying]);


  const handleAddToCart = async () => {
    if (!product) return;

    try {
      setAddingToCart(true);
      await apiClient.addToCart(product.id, quantity);

      setAddToCartSuccess(true);
      setTimeout(() => setAddToCartSuccess(false), 2500);

      showToast(`Đã thêm ${quantity} sản phẩm vào giỏ hàng`, 'success');
    } catch (error) {
      console.error('Error adding to cart:', error);
      showToast('Không thể thêm vào giỏ hàng', 'error');
    } finally {
      setAddingToCart(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const handleImageInteraction = () => {
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 space-y-4">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Đang tải chi tiết sản phẩm...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 p-8 text-center">
        <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <Info className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sản phẩm không tồn tại</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Sản phẩm này có thể đã bị xóa hoặc không còn khả dụng.</p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-opacity"
        >
          Đóng
        </button>
      </div>
    );
  }

  const details = parseProductDetails(product.details);
  const discountedPrice = details.discount
    ? Math.round(product.price * (1 - details.discount / 100))
    : product.price;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 relative">
      {/* Header - Sticky & Glassmorphism */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-4 md:p-6 bg-gradient-to-b from-black/40 to-transparent pointer-events-none">
        <div className="pointer-events-auto">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-all transform hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full transition-all transform hover:scale-105 active:scale-95 ${isLiked ? 'text-red-500 bg-white/80' : 'text-white'}`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button
            className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-all transform hover:scale-105 active:scale-95"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              showToast('Đã sao chép liên kết!', 'success');
            }}
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-24">

        {/* Hero Image Section */}
        <div className="relative w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[21/9] bg-gray-100 dark:bg-gray-800 group">
          {product.imageUrls && product.imageUrls.length > 0 ? (
            <>
              <Image
                src={product.imageUrls[selectedImageIndex]}
                alt={product.name}
                fill
                className="object-contain p-4 md:p-8"
                priority
              />

              {/* Navigation Arrows (Desktop) */}
              {product.imageUrls.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex((prev) => prev === 0 ? product.imageUrls.length - 1 : prev - 1);
                      handleImageInteraction();
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur text-gray-800 dark:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-700 shadow-lg"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex((prev) => (prev + 1) % product.imageUrls.length);
                      handleImageInteraction();
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur text-gray-800 dark:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-700 shadow-lg"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Dots Indicator */}
              {product.imageUrls.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {product.imageUrls.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedImageIndex(idx);
                        handleImageInteraction();
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 ${idx === selectedImageIndex
                        ? 'w-6 bg-blue-600'
                        : 'w-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-blue-400'
                        }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <Package className="w-16 h-16" />
            </div>
          )}
        </div>

        {/* Product Info Container */}
        <div className="px-4 py-6 md:px-8 space-y-8 max-w-5xl mx-auto">

          {/* Title & Price Header */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                  <span className="bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs uppercase tracking-wide">
                    {product.categoryName}
                  </span>
                  {product.status === 'ACTIVE' && (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Còn hàng
                    </span>
                  )}
                </div>
                <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
                  {product.name}
                </h1>

                {details.rating && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-yellow-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${star <= Math.round(details.rating || 0) ? 'fill-current' : 'text-gray-300 dark:text-gray-600'}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({details.reviews || 0} đánh giá)
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                    {formatPrice(discountedPrice)}
                  </span>
                  {details.discount && details.discount > 0 && (
                    <span className="text-lg text-gray-500 dark:text-gray-400 line-through decoration-red-500/50">
                      {formatPrice(details.originalPrice || product.price)}
                    </span>
                  )}
                </div>
                {details.discount && details.discount > 0 && (
                  <span className="text-sm font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">
                    Tiết kiệm {details.discount}%
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-gray-100 dark:bg-gray-800" />

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center text-center gap-2 border border-gray-100 dark:border-gray-700/50">
              <Truck className="w-6 h-6 text-blue-500" />
              <div className="text-xs text-gray-500 dark:text-gray-400">Giao hàng</div>
              <div className="font-semibold text-sm text-gray-900 dark:text-gray-200">
                {details.deliveryTime || '2-3 ngày'}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center text-center gap-2 border border-gray-100 dark:border-gray-700/50">
              <ShieldCheck className="w-6 h-6 text-green-500" />
              <div className="text-xs text-gray-500 dark:text-gray-400">Bảo hành</div>
              <div className="font-semibold text-sm text-gray-900 dark:text-gray-200">
                {details.warranty || '12 Tháng'}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center text-center gap-2 border border-gray-100 dark:border-gray-700/50">
              <RefreshCw className="w-6 h-6 text-purple-500" />
              <div className="text-xs text-gray-500 dark:text-gray-400">Đổi trả</div>
              <div className="font-semibold text-sm text-gray-900 dark:text-gray-200">
                {details.returnPolicy || '30 Ngày'}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center text-center gap-2 border border-gray-100 dark:border-gray-700/50">
              <Layers className="w-6 h-6 text-orange-500" />
              <div className="text-xs text-gray-500 dark:text-gray-400">Tình trạng</div>
              <div className="font-semibold text-sm text-gray-900 dark:text-gray-200">
                Mới 100%
              </div>
            </div>
          </div>

          {/* Description & Specs Tabs */}
          <div className="space-y-6">
            <div className="flex items-center gap-8 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('description')}
                className={`pb-3 text-sm md:text-base font-semibold transition-all relative ${activeTab === 'description'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
                  }`}
              >
                Mô tả sản phẩm
                {activeTab === 'description' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('specs')}
                className={`pb-3 text-sm md:text-base font-semibold transition-all relative ${activeTab === 'specs'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
                  }`}
              >
                Thông số kỹ thuật
                {activeTab === 'specs' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
                )}
              </button>
            </div>

            <div className="min-h-[200px] animate-fade-in">
              {activeTab === 'description' ? (
                <div className="prose prose-blue dark:prose-invert max-w-none">
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </p>

                  {details.features && details.features.length > 0 && (
                    <div className="mt-8">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-4">Tính năng nổi bật</h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none p-0 m-0">
                        {details.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/30">
                            <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300 text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Key Specs */}
                  {(details.brand || details.model || details.color || details.type) && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {details.brand && (
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Thương hiệu</div>
                          <div className="font-semibold text-gray-900 dark:text-white">{details.brand}</div>
                        </div>
                      )}
                      {details.model && (
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Model</div>
                          <div className="font-semibold text-gray-900 dark:text-white">{details.model}</div>
                        </div>
                      )}
                      {details.type && (
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Loại</div>
                          <div className="font-semibold text-gray-900 dark:text-white">{details.type}</div>
                        </div>
                      )}
                      {details.color && (
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Màu sắc</div>
                          <div className="font-semibold text-gray-900 dark:text-white">{details.color}</div>
                        </div>
                      )}
                      {details.weight && (
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Trọng lượng</div>
                          <div className="font-semibold text-gray-900 dark:text-white">{details.weight}</div>
                        </div>
                      )}
                      {details.origin && (
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Xuất xứ</div>
                          <div className="font-semibold text-gray-900 dark:text-white">{details.origin}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* All Details as Table */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {/* Display all details from JSON */}
                        {Object.entries(details)
                          .filter(([key]) => !['rating', 'reviews', 'discount', 'originalPrice', 'deliveryTime', 'returnPolicy', 'isFeatured'].includes(key))
                          .map(([key, value], idx) => {
                            // Format key name
                            const keyMap: Record<string, string> = {
                              'brand': 'Thương hiệu',
                              'model': 'Model',
                              'type': 'Loại',
                              'color': 'Màu sắc',
                              'weight': 'Trọng lượng',
                              'warranty': 'Bảo hành',
                              'origin': 'Xuất xứ',
                              'anc': 'Chống ồn',
                              'drivers': 'Driver',
                              'foldable': 'Có thể gập',
                              'frequency_response': 'Dải tần',
                              'battery': 'Pin',
                              'connectivity': 'Kết nối',
                              'controls': 'Điều khiển',
                              'features': 'Tính năng',
                              'accessories': 'Phụ kiện',
                              'specifications': 'Thông số kỹ thuật'
                            };

                            const formattedKey = keyMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            
                            // Format value display
                            let displayValue = value;
                            if (typeof value === 'object' && value !== null) {
                              if (Array.isArray(value)) {
                                displayValue = value.join(', ');
                              } else {
                                // For nested objects like battery
                                displayValue = Object.entries(value)
                                  .map(([k, v]) => {
                                    const subKeyMap: Record<string, string> = {
                                      'anc_on': 'Bật ANC',
                                      'anc_off': 'Tắt ANC',
                                      'quick_charge': 'Sạc nhanh'
                                    };
                                    return `${subKeyMap[k] || k}: ${v}`;
                                  })
                                  .join(', ');
                              }
                            } else if (typeof value === 'boolean') {
                              displayValue = value ? 'Có' : 'Không';
                            }

                            return (
                              <tr key={idx} className="bg-white dark:bg-gray-900 even:bg-gray-50 dark:even:bg-gray-800/30">
                                <td className="px-6 py-4 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap w-1/3">
                                  {formattedKey}
                                </td>
                                <td className="px-6 py-4 text-gray-900 dark:text-white">
                                  {String(displayValue)}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar */}
      <div className="absolute bottom-0 inset-x-0 p-4 md:p-6 bg-white/10 dark:bg-gray-900/10 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 md:gap-8">

          {/* Quantity Selector */}
          <div className="hidden md:flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-xl p-1.5 border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1 || addingToCart}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 transition-colors shadow-sm"
            >
              -
            </button>
            <span className="w-8 text-center font-bold text-gray-900 dark:text-white">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
              disabled={quantity >= product.quantity || addingToCart}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 transition-colors shadow-sm"
            >
              +
            </button>
          </div>

          <div className="flex-1 flex gap-3">
            <button
              onClick={handleAddToCart}
              disabled={addingToCart || product.quantity <= 0}
              className={`flex-1 md:flex-none md:w-48 py-3.5 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none ${addToCartSuccess
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-lg hover:shadow-xl'
                }`}
            >
              {addToCartSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Đã thêm</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  <span>Thêm giỏ hàng</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                handleAddToCart();
                setTimeout(() => {
                  window.location.href = '/checkout';
                }, 500);
              }}
              disabled={product.quantity <= 0}
              className="flex-1 py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>Mua ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icon component helper
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
