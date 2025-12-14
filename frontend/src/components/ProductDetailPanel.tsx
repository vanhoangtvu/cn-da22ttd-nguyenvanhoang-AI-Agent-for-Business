'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { apiClient } from '@/lib/api';

interface ProductDetailPanelProps {
  productId: number;
  onClose: () => void;
}

interface ProductDetails {
  rating?: number;
  reviews?: number;
  discount?: number;
  originalPrice?: number;
  sku?: string;
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
  details?: string;  // JSON string for product details
  createdAt?: string;
  updatedAt?: string;
}

export default function ProductDetailPanel({ productId, onClose }: ProductDetailPanelProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addToCartSuccess, setAddToCartSuccess] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    loadProductDetail();
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
    }, 4000);

    return () => clearInterval(interval);
  }, [product, selectedImageIndex, isAutoPlaying]);

  // Pause auto-play when user interacts
  const handleImageInteraction = () => {
    setIsAutoPlaying(false);
    // Resume auto-play after 8 seconds of inactivity
    setTimeout(() => {
      setIsAutoPlaying(true);
    }, 8000);
  };  const loadProductDetail = async () => {
    try {
      setLoading(true);
      console.log('Loading product detail for ID:', productId);
      const data = await apiClient.getProduct(productId);
      console.log('Product data received:', data);
      setProduct(data);
      setSelectedImageIndex(0);
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    try {
      setAddingToCart(true);
      await apiClient.addToCart(product.id, quantity);
      
      // Show success animation
      setAddToCartSuccess(true);
      setTimeout(() => setAddToCartSuccess(false), 2000);
      
      alert(`Đã thêm ${quantity} sản phẩm vào giỏ hàng thành công!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Không thể thêm vào giỏ hàng. Vui lòng thử lại.');
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Đang tải thông tin sản phẩm...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Không tìm thấy sản phẩm</p>
        </div>
      </div>
    );
  }

  // Parse product details from JSON
  const details = parseProductDetails(product.details);
  const discountedPrice = details.discount 
    ? Math.round(product.price * (1 - details.discount / 100))
    : product.price;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-slate-900/50 dark:to-gray-900 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-pink-600/20 rounded-full blur-3xl"></div>
      </div>

      {/* Floating Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 w-12 h-12 flex items-center justify-center bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 backdrop-blur-xl text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-2xl transition-all duration-200 hover:scale-110 shadow-lg border border-white/50 dark:border-gray-700/50"
        title="Đóng"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Product Content - Scrollable - Optimized Spacing */}
      <div className="relative flex-1 overflow-y-auto pt-16 pb-6 px-6 space-y-8">
        {/* Product Images Gallery - Modern Design */}
        <div className="space-y-6">
          {/* Main Image Container - Enhanced with Smooth Slide */}
          <div className="relative w-full max-w-lg mx-auto overflow-hidden">
            <div className="relative h-96 overflow-hidden bg-gradient-to-br from-gray-100 via-gray-50 to-white dark:from-gray-700 dark:via-gray-800 dark:to-gray-900 shadow-2xl">
              {product.imageUrls && product.imageUrls.length > 0 ? (
                <>
                  {/* Image Carousel Container */}
                  <div className="relative w-full h-full">
                    {product.imageUrls.map((url, index) => (
                      <div
                        key={index}
                        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                          index === selectedImageIndex ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <Image
                          src={url}
                          alt={`${product.name} - ${index + 1}`}
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, 400px"
                          priority={index === 0}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Enhanced Image counter badge with auto-play indicator */}
                  {product.imageUrls.length > 1 && (
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <div className="px-4 py-2 bg-black/70 backdrop-blur-xl text-white text-sm font-bold rounded-2xl shadow-lg border border-white/20">
                        {selectedImageIndex + 1} / {product.imageUrls.length}
                      </div>
                      {/* Auto-play indicator */}
                      <button
                        onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                        className={`w-8 h-8 rounded-xl backdrop-blur-xl border transition-all duration-300 ${
                          isAutoPlaying
                            ? 'bg-green-500/80 text-white border-green-400/50'
                            : 'bg-gray-500/80 text-white border-gray-400/50'
                        } flex items-center justify-center shadow-lg`}
                        title={isAutoPlaying ? 'Tạm dừng tự động chuyển' : 'Bật tự động chuyển'}
                      >
                        {isAutoPlaying ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l.707.707A1 1 0 0012.414 11H15m-3 7.5A9.5 9.5 0 1121.5 12 9.5 9.5 0 0112 2.5z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Modern Navigation arrows */}
                  {product.imageUrls.length > 1 && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedImageIndex((prev) =>
                            prev === 0 ? product.imageUrls.length - 1 : prev - 1
                          );
                          handleImageInteraction();
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 backdrop-blur-xl text-gray-800 dark:text-white rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg border border-white/50 dark:border-gray-600/50 group"
                      >
                        <svg className="w-6 h-6 transition-transform duration-200 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedImageIndex((prev) =>
                            (prev + 1) % product.imageUrls.length
                          );
                          handleImageInteraction();
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 backdrop-blur-xl text-gray-800 dark:text-white rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg border border-white/50 dark:border-gray-600/50 group"
                      >
                        <svg className="w-6 h-6 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* Enhanced Dot indicators */}
                  {product.imageUrls.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
                      {/* Dots */}
                      <div className="flex gap-3 bg-black/20 backdrop-blur-xl rounded-2xl p-2">
                        {product.imageUrls.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setSelectedImageIndex(index);
                              handleImageInteraction();
                            }}
                            className={`transition-all duration-300 ${
                              selectedImageIndex === index
                                ? 'w-8 h-3 bg-white rounded-full shadow-lg'
                                : 'w-3 h-3 bg-white/50 hover:bg-white/75 rounded-full'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-center font-medium">Không có hình ảnh</p>
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail Gallery - Enhanced */}
          {product.imageUrls && product.imageUrls.length > 1 && (
            <div className="grid grid-cols-5 gap-3 max-w-lg mx-auto">
              {product.imageUrls.map((url, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${
                    selectedImageIndex === index
                      ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-lg scale-105'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  <Image
                    src={url}
                    alt={`${product.name} - ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                  {selectedImageIndex === index && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Title - Compact Header */}
        <div className="text-center space-y-3 pb-2">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-tight bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 dark:from-white dark:via-blue-100 dark:to-white bg-clip-text text-transparent">
            {product.name}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">ID: #{product.id}</span>
            <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            <span className="text-sm text-gray-500 dark:text-gray-400">{product.categoryName}</span>
          </div>
        </div>

        {/* Product Info - Modern Cards */}
        <div className="space-y-6">
          {/* Price - Premium Design with Discount Support */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-baseline gap-3 px-8 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-3xl border border-blue-100 dark:border-blue-800/50">
              {details.discount && details.discount > 0 && details.originalPrice ? (
                <div className="flex flex-col items-center gap-2">
                  {/* Discount badge */}
                  <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    -{details.discount}% OFF
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl md:text-6xl font-black text-blue-600 dark:text-blue-400">
                      {formatPrice(discountedPrice)}
                    </span>
                    <span className="text-xl text-gray-400 line-through">
                      {formatPrice(details.originalPrice)}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-5xl md:text-6xl font-black text-blue-600 dark:text-blue-400">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
            
            {/* Rating if available */}
            {details.rating && (
              <div className="flex items-center justify-center gap-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(details.rating!)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300 fill-current'
                      }`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {details.rating.toFixed(1)} ({details.reviews || 0} đánh giá)
                </span>
              </div>
            )}
          </div>

          {/* Status Cards - Modern Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stock Status */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 border border-green-100 dark:border-green-800/50">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  product.quantity > 0
                    ? 'bg-green-500 shadow-lg shadow-green-500/30'
                    : 'bg-red-500 shadow-lg shadow-red-500/30'
                }`}>
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Tình trạng</p>
                  <p className={`text-base font-bold ${
                    product.quantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {product.quantity > 0 ? `Còn ${product.quantity} sp` : 'Hết hàng'}
                  </p>
                </div>
              </div>
            </div>

            {/* Product Status */}
            {product.status && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800/50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    product.status === 'ACTIVE'
                      ? 'bg-blue-500 shadow-lg shadow-blue-500/30'
                      : 'bg-gray-500 shadow-lg shadow-gray-500/30'
                  }`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Trạng thái</p>
                    <p className={`text-base font-bold ${
                      product.status === 'ACTIVE'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {product.status === 'ACTIVE' ? 'Đang bán' : product.status}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Seller Info - Modern Card */}
          {product.sellerUsername && (
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 rounded-3xl p-4 border border-blue-100/50 dark:border-blue-800/30 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Người bán</p>
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400">{product.sellerUsername}</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">Online</span>
                </div>
              </div>
            </div>
          )}

          {/* Description - Enhanced Card */}
          {product.description && (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/50 dark:border-gray-700/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Mô tả sản phẩm</h3>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            </div>
          )}

          {/* Product Specifications */}
          {details.specifications && Object.keys(details.specifications).length > 0 && (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/50 dark:border-gray-700/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Thông số kỹ thuật</h3>
              </div>
              <div className="space-y-3">
                {Object.entries(details.specifications).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between items-start py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0"
                  >
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {key}:
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white font-semibold max-w-[60%] text-right">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product Details - Enhanced Layout */}
          <div className="space-y-6">
            {/* Basic Info Grid */}
            {(details.brand || details.model || details.color || details.warranty) && (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/50 dark:border-gray-700/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">Thông tin cơ bản</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {details.brand && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-600/50">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Thương hiệu</p>
                      <p className="font-bold text-gray-900 dark:text-white">{details.brand}</p>
                    </div>
                  )}
                  {details.model && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-600/50">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Model</p>
                      <p className="font-bold text-gray-900 dark:text-white">{details.model}</p>
                    </div>
                  )}
                  {details.color && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-600/50">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Màu sắc</p>
                      <p className="font-bold text-gray-900 dark:text-white">{details.color}</p>
                    </div>
                  )}
                  {details.warranty && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-600/50">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Bảo hành</p>
                      <p className="font-bold text-gray-900 dark:text-white">{details.warranty}</p>
                    </div>
                  )}
                  {details.storage && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-600/50">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Dung lượng</p>
                      <p className="font-bold text-gray-900 dark:text-white">{details.storage}</p>
                    </div>
                  )}
                  {details.type && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-600/50">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Loại</p>
                      <p className="font-bold text-gray-900 dark:text-white">{details.type}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Features */}
            {details.features && details.features.length > 0 && (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/50 dark:border-gray-700/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">Tính năng nổi bật</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {details.features.map((feature, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full text-sm font-medium">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Connectivity */}
            {details.connectivity && details.connectivity.length > 0 && (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/50 dark:border-gray-700/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">Kết nối</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {details.connectivity.map((conn, index) => (
                    <span key={index} className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full text-sm font-medium">
                      {conn}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Accessories */}
            {details.accessories && details.accessories.length > 0 && (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/50 dark:border-gray-700/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">Phụ kiện đi kèm</h3>
                </div>
                <ul className="space-y-2">
                  {details.accessories.map((accessory, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-700 dark:text-gray-300">{accessory}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dimensions & Weight */}
            {(details.dimensions || details.weight) && (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/50 dark:border-gray-700/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-700 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4a1 1 0 011-1h4m12 0v4m0 8v4a1 1 0 01-1 1h-4M4 16v4a1 1 0 001 1h4m-4-8h16" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">Kích thước & Trọng lượng</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {details.dimensions && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-600/50">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Kích thước</p>
                      <p className="font-bold text-gray-900 dark:text-white">{details.dimensions}</p>
                    </div>
                  )}
                  {details.weight && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-600/50">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Trọng lượng</p>
                      <p className="font-bold text-gray-900 dark:text-white">{details.weight}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Delivery & Return Policy */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 rounded-3xl p-6 border border-blue-100/50 dark:border-blue-800/30 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Giao hàng</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {details.deliveryTime || 'Giao trong 2-3 ngày'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Đổi trả</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {details.returnPolicy || 'Đổi trả trong 30 ngày'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quantity Selector - Modern Minimal */}
          {product.quantity > 0 && (
            <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl p-3 border border-blue-100/30 dark:border-blue-800/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Số lượng:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-600"
                  >
                    <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="w-12 text-center font-semibold text-gray-800 dark:text-white">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                    disabled={quantity >= product.quantity}
                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-600"
                  >
                    <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - Optimized Design - Compact */}
      {product.quantity > 0 && product.status === 'ACTIVE' && (
        <div className="relative border-t border-white/20 dark:border-gray-700/50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl p-4 shadow-2xl">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-purple-500/5 rounded-t-3xl"></div>

          {/* Success overlay */}
          {addToCartSuccess && (
            <div className="absolute inset-0 bg-green-500/90 backdrop-blur-sm rounded-t-3xl flex items-center justify-center z-10 animate-fade-in">
              <div className="flex items-center gap-3 text-white">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-lg font-bold">Đã thêm vào giỏ hàng!</span>
              </div>
            </div>
          )}

          <div className="relative space-y-4">
            {/* Price Summary Card - Hidden */}
            {false && (
            <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-100/50 dark:border-blue-800/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Tổng tiền</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                      {formatPrice(product.price * quantity)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {quantity} × {formatPrice(product.price)}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Tiết kiệm 0đ
                  </p>
                </div>
              </div>
            </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Add to Cart Button - Primary */}
              <button
                onClick={handleAddToCart}
                disabled={addingToCart || addToCartSuccess}
                className={`relative py-3 px-4 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white font-bold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl hover:shadow-green-500/30 hover:scale-[1.02] transform overflow-hidden group ${
                  addToCartSuccess ? 'bg-gradient-to-r from-green-600 to-emerald-600' : ''
                }`}
              >
                {/* Ripple effect */}
                <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                {addingToCart ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-semibold relative z-10">Đang thêm...</span>
                  </>
                ) : addToCartSuccess ? (
                  <>
                    <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-semibold relative z-10">Đã thêm!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-sm font-semibold relative z-10">Thêm vào giỏ</span>
                  </>
                )}
              </button>

              {/* Buy Now Button - Secondary */}
              <button
                onClick={() => {
                  handleAddToCart();
                  // Could navigate to checkout here
                  setTimeout(() => {
                    // Navigate to cart or checkout
                    window.location.href = '/cart';
                  }, 1000);
                }}
                disabled={addingToCart || addToCartSuccess}
                className="py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] transform border border-white/20 group"
              >
                <div className="absolute inset-0 bg-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-semibold relative z-10">Mua ngay</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-6 pt-2">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Giao hàng tận nơi</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Đổi trả 7 ngày</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Bảo hành chính hãng</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
