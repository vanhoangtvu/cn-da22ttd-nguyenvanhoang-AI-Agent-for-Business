'use client';

import Image from 'next/image';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useState } from 'react';

interface ProductCardProps {
  id?: number | string;
  name: string;
  price?: string | number;
  imageUrl?: string;
  description?: string;
  stock?: number;
  categoryName?: string;
  onClick?: () => void;
  showAddToCart?: boolean;
}

export default function ProductCard({ 
  id,
  name, 
  price, 
  imageUrl, 
  description, 
  stock,
  categoryName,
  onClick,
  showAddToCart = true
}: ProductCardProps) {
  const [addingToCart, setAddingToCart] = useState(false);

  const formatPrice = (priceValue: string | number | undefined): string => {
    if (!priceValue) return '';
    const numPrice = typeof priceValue === 'string' ? parseFloat(priceValue.replace(/[^0-9.]/g, '')) : priceValue;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numPrice);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id || !apiClient.isAuthenticated()) {
      alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
      return;
    }

    setAddingToCart(true);
    try {
      await apiClient.addToCart(Number(id), 1);
      alert('Đã thêm sản phẩm vào giỏ hàng!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Không thể thêm vào giỏ hàng');
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer group relative"
      onClick={(e) => {
        console.log('Card clicked, onClick exists?', !!onClick);
        if (onClick) {
          onClick();
        }
      }}
    >
      {/* Product Image */}
      <div className="relative h-56 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-20 h-20 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Stock badge */}
        {stock !== undefined && (
          <div className={`absolute top-3 right-3 ${stock > 0 ? 'bg-green-500' : 'bg-red-500'} text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg`}>
            {stock > 0 ? `Còn ${stock} sp` : 'Hết hàng'}
          </div>
        )}
        
        {/* Category badge */}
        {categoryName && (
          <div className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
            {categoryName}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-5">
        <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors min-h-[3.5rem]">
          {name}
        </h3>
        
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-3 min-h-[4rem]">
            {description}
          </p>
        )}

        {price && (
          <div className="mb-4">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {formatPrice(price)}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {onClick ? (
            // In chat mode - use onClick handler (don't stopPropagation so card onClick works)
            <button 
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-xl"
              onClick={(e) => {
                console.log('Detail button clicked in chat mode');
                onClick();
              }}
            >
              Xem chi tiết
            </button>
          ) : id ? (
            // In shop mode - use Link
            <Link
              href={`/?productId=${id}`}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-xl text-center"
              onClick={(e) => e.stopPropagation()}
            >
              Xem chi tiết
            </Link>
          ) : (
            <button 
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-xl"
            >
              Xem chi tiết
            </button>
          )}
          
          {showAddToCart && id && stock && stock > 0 && (
            <button
              onClick={handleAddToCart}
              disabled={addingToCart}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white p-2.5 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-xl"
              title="Thêm vào giỏ hàng"
            >
              {addingToCart ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
