'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';

interface DiscountApplierProps {
  orderTotal: number;
  onDiscountApplied: (discount: any, newTotal: number) => void;
  onDiscountRemoved: () => void;
  appliedDiscount?: any;
}

export default function DiscountApplier({ 
  orderTotal, 
  onDiscountApplied, 
  onDiscountRemoved, 
  appliedDiscount 
}: DiscountApplierProps) {
  const [discountCode, setDiscountCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState('');

  const handleApplyDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!discountCode.trim()) return;
    
    setIsApplying(true);
    setError('');

    try {
      const result = await apiClient.applyDiscount(discountCode.toUpperCase(), orderTotal);
      
      if (result.success) {
        onDiscountApplied(result.discount, result.newTotal);
        setDiscountCode('');
      } else {
        setError(result.message || 'Mã giảm giá không hợp lệ');
      }
    } catch (error: any) {
      console.error('Failed to apply discount:', error);
      setError(error.message || 'Không thể áp dụng mã giảm giá');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemoveDiscount = () => {
    onDiscountRemoved();
    setError('');
  };

  const formatDiscountAmount = (discount: any) => {
    switch (discount.type) {
      case 'PERCENTAGE':
        return `${discount.value}%`;
      case 'FIXED_AMOUNT':
        return `${discount.discountAmount.toLocaleString('vi-VN')}đ`;
      case 'FREE_SHIPPING':
        return 'Miễn phí ship';
      default:
        return '';
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <h3 className="font-semibold text-gray-800 dark:text-white mb-4">
        <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        Mã giảm giá
      </h3>

      {!appliedDiscount ? (
        <form onSubmit={handleApplyDiscount} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              placeholder="Nhập mã giảm giá"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white text-sm"
              disabled={isApplying}
            />
            <button
              type="submit"
              disabled={isApplying || !discountCode.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
            >
              {isApplying ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                'Áp dụng'
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-sm">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Nhập mã giảm giá để được ưu đãi đặc biệt
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-green-800 dark:text-green-200 text-sm">
                  {appliedDiscount.code} - {appliedDiscount.name}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Giảm {formatDiscountAmount(appliedDiscount)}
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveDiscount}
              className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              title="Gỡ mã giảm giá"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">Tiết kiệm:</span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              -{(orderTotal - appliedDiscount.newTotal).toLocaleString('vi-VN')}đ
            </span>
          </div>
        </div>
      )}
    </div>
  );
}