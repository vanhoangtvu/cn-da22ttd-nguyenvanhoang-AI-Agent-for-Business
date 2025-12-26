'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { apiClient } from '@/lib/api';

interface OrderDetailPanelProps {
  orderId: number;
  onClose: () => void;
}

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  subtotal: number;
}

interface OrderDetail {
  id: number;
  customerId: number;
  customerUsername: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  totalAmount: number;
  status: string;
  note?: string;
  paymentMethod?: string;
  qrCodeUrl?: string;
  orderItems: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

const ORDER_STATUS_CONFIG = {
  PENDING: {
    label: 'Chờ xác nhận',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: 'from-yellow-500 to-orange-500'
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: 'from-blue-500 to-cyan-500'
  },
  PROCESSING: {
    label: 'Đang xử lý',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    gradient: 'from-purple-500 to-pink-500'
  },
  SHIPPING: {
    label: 'Đang giao hàng',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
    gradient: 'from-indigo-500 to-blue-500'
  },
  DELIVERED: {
    label: 'Đã giao hàng',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    gradient: 'from-green-500 to-emerald-500'
  },
  CANCELLED: {
    label: 'Đã hủy',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: 'from-red-500 to-pink-500'
  },
  RETURNED: {
    label: 'Đã trả hàng',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ),
    gradient: 'from-gray-500 to-slate-500'
  }
};

export default function OrderDetailPanel({ orderId, onClose }: OrderDetailPanelProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderDetail();
  }, [orderId]);

  const loadOrderDetail = async () => {
    try {
      setLoading(true);
      console.log('Loading order detail for ID:', orderId);
      const data = await apiClient.getOrder(orderId);
      console.log('Order data received:', data);
      setOrder(data);
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Đang tải thông tin đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Không tìm thấy đơn hàng</p>
        </div>
      </div>
    );
  }

  const statusConfig = ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG] || ORDER_STATUS_CONFIG.PENDING;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Chi tiết đơn hàng #{order.id}
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors group"
          title="Đóng"
        >
          <svg className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Order Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status Banner */}
        <div className={`bg-gradient-to-r ${statusConfig.gradient} rounded-2xl p-6 text-white shadow-2xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl">
                {statusConfig.icon}
              </div>
              <div>
                <p className="text-sm opacity-90">Trạng thái đơn hàng</p>
                <h3 className="text-2xl font-bold">{statusConfig.label}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Order Progress Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Tiến độ đơn hàng
          </h3>

          <div className="space-y-4">
            {/* PENDING */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED'].includes(order.status)
                  ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                  }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                {order.status !== 'PENDING' && order.status !== 'CANCELLED' && order.status !== 'RETURNED' && (
                  <div className={`w-0.5 h-12 ${['CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED'].includes(order.status)
                    ? 'bg-gradient-to-b from-yellow-500 to-blue-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                    }`}></div>
                )}
              </div>
              <div className="flex-1 pb-4">
                <h4 className="font-semibold text-gray-800 dark:text-white">Chờ xác nhận</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Đơn hàng đã được tạo</p>
                {order.status === 'PENDING' && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">● Đang chờ xác nhận</p>
                )}
              </div>
            </div>

            {/* CONFIRMED */}
            {order.status !== 'CANCELLED' && order.status !== 'RETURNED' && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${['CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED'].includes(order.status)
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  {order.status !== 'CONFIRMED' && (
                    <div className={`w-0.5 h-12 ${['PROCESSING', 'SHIPPING', 'DELIVERED'].includes(order.status)
                      ? 'bg-gradient-to-b from-blue-500 to-purple-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                      }`}></div>
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <h4 className="font-semibold text-gray-800 dark:text-white">Đã xác nhận</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Đơn hàng đã được xác nhận</p>
                  {order.status === 'CONFIRMED' && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">● Đang chuẩn bị</p>
                  )}
                </div>
              </div>
            )}

            {/* PROCESSING */}
            {order.status !== 'CANCELLED' && order.status !== 'RETURNED' && order.status !== 'PENDING' && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${['PROCESSING', 'SHIPPING', 'DELIVERED'].includes(order.status)
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  {order.status !== 'PROCESSING' && (
                    <div className={`w-0.5 h-12 ${['SHIPPING', 'DELIVERED'].includes(order.status)
                      ? 'bg-gradient-to-b from-purple-500 to-indigo-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                      }`}></div>
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <h4 className="font-semibold text-gray-800 dark:text-white">Đang xử lý</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Đang đóng gói sản phẩm</p>
                  {order.status === 'PROCESSING' && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">● Đang đóng gói</p>
                  )}
                </div>
              </div>
            )}

            {/* SHIPPING */}
            {order.status !== 'CANCELLED' && order.status !== 'RETURNED' && !['PENDING', 'CONFIRMED'].includes(order.status) && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${['SHIPPING', 'DELIVERED'].includes(order.status)
                    ? 'bg-gradient-to-br from-indigo-500 to-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                  </div>
                  {order.status !== 'SHIPPING' && (
                    <div className={`w-0.5 h-12 ${order.status === 'DELIVERED'
                      ? 'bg-gradient-to-b from-indigo-500 to-green-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                      }`}></div>
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <h4 className="font-semibold text-gray-800 dark:text-white">Đang giao hàng</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Đơn hàng đang được vận chuyển</p>
                  {order.status === 'SHIPPING' && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">● Đang trên đường giao</p>
                  )}
                </div>
              </div>
            )}

            {/* DELIVERED */}
            {order.status === 'DELIVERED' && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 pb-4">
                  <h4 className="font-semibold text-gray-800 dark:text-white">Đã giao hàng</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Giao hàng thành công</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Hoàn thành</p>
                </div>
              </div>
            )}

            {/* CANCELLED */}
            {order.status === 'CANCELLED' && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-red-500 to-pink-500 text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 pb-4">
                  <h4 className="font-semibold text-gray-800 dark:text-white">Đã hủy</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Đơn hàng đã bị hủy</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">✕ Đã hủy</p>
                </div>
              </div>
            )}

            {/* RETURNED */}
            {order.status === 'RETURNED' && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-500 to-slate-500 text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 pb-4">
                  <h4 className="font-semibold text-gray-800 dark:text-white">Đã trả hàng</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Đơn hàng đã được hoàn trả</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">↩ Đã hoàn trả</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 space-y-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Thông tin đơn hàng
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ngày đặt</p>
              <p className="font-semibold text-gray-900 dark:text-white">{formatDate(order.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cập nhật</p>
              <p className="font-semibold text-gray-900 dark:text-white">{formatDate(order.updatedAt)}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Tổng tiền</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {formatPrice(order.totalAmount)}
            </p>
          </div>

          {order.note && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Ghi chú</p>
              <p className="text-gray-900 dark:text-white italic">"{order.note}"</p>
            </div>
          )}

          {order.paymentMethod && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Phương thức thanh toán</p>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {order.paymentMethod === 'BANK_TRANSFER' ? '🏦 Chuyển khoản ngân hàng' : '💵 Tiền mặt (COD)'}
                </p>
                {order.paymentMethod === 'BANK_TRANSFER' && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${order.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                    {order.status === 'PENDING' ? '⏳ Chưa thanh toán' : '✓ Đã thanh toán'}
                  </span>
                )}
              </div>

              {/* Only show QR code for BANK_TRANSFER with PENDING status */}
              {order.paymentMethod === 'BANK_TRANSFER' && order.status === 'PENDING' && order.qrCodeUrl && (
                <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">📱 Quét mã QR để thanh toán</p>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg inline-block">
                    <img src={order.qrCodeUrl} alt="VietQR Code" className="w-48 h-48 object-contain" />
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <p><strong>Ngân hàng:</strong> MB Bank</p>
                    <p><strong>STK:</strong> 0889559357</p>
                    <p><strong>Tên TK:</strong> NGUYEN VAN HOANG</p>
                    <p><strong>Số tiền:</strong> <span className="text-blue-600 dark:text-blue-400 font-bold">{order.totalAmount.toLocaleString('vi-VN')}đ</span></p>
                    <p><strong>Nội dung:</strong> DH{order.id}</p>
                    <p className="text-blue-600 dark:text-blue-400 mt-2 text-xs">ℹ️ Số tiền và nội dung sẽ tự động điền khi quét QR</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Customer Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 space-y-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Thông tin khách hàng
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tên khách hàng</p>
                <p className="font-semibold text-gray-900 dark:text-white">{order.customerName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Số điện thoại</p>
                <p className="font-semibold text-gray-900 dark:text-white">{order.customerPhone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                <p className="font-semibold text-gray-900 dark:text-white">{order.customerEmail}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Địa chỉ giao hàng</p>
                <p className="font-semibold text-gray-900 dark:text-white">{order.shippingAddress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Sản phẩm ({order.orderItems.length})
          </h3>

          <div className="space-y-4">
            {order.orderItems.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{item.productName}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatPrice(item.productPrice)} × {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Thành tiền</p>
                  <p className="font-bold text-lg text-blue-600 dark:text-blue-400">
                    {formatPrice(item.subtotal)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-6 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-800 dark:text-white">Tổng cộng:</span>
              <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
