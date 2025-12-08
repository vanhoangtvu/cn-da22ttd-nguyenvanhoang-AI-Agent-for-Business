'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import OrderDetailPanel from '@/components/OrderDetailPanel';

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  subtotal: number;
}

interface Order {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  totalAmount: number;
  status: string;
  note: string;
  orderItems: OrderItem[];
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PROCESSING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  SHIPPING: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  RETURNED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã hủy',
  RETURNED: 'Đã trả hàng',
};

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Check for orderId in URL params and open detail panel
  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    if (orderIdParam) {
      const orderId = parseInt(orderIdParam);
      if (!isNaN(orderId)) {
        setSelectedOrderId(orderId);
        // Remove the orderId param from URL after reading it
        const url = new URL(window.location.href);
        url.searchParams.delete('orderId');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getMyOrders();
      setOrders(data.sort((a: Order, b: Order) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (err) {
      setError('Không thể tải danh sách đơn hàng');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;

    try {
      await apiClient.cancelOrder(orderId);
      alert('Đơn hàng đã được hủy');
      loadOrders();
      setSelectedOrder(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể hủy đơn hàng');
    }
  };

  const canCancel = (status: string) => {
    return status === 'PENDING' || status === 'CONFIRMED';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Đang tải đơn hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/shop" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Tiếp tục mua sắm
            </Link>
            <h1 className="text-2xl font-bold">Đơn hàng của tôi</h1>
            <Link href="/cart" className="text-blue-600 dark:text-blue-400 hover:underline">
              Giỏ hàng
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Orders List */}
        <div 
          className={`flex-1 overflow-y-auto transition-all duration-500 ease-in-out ${
            selectedOrderId ? 'w-1/2' : 'w-full'
          }`}
        >
          <div className="container mx-auto px-4 py-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {orders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <svg className="w-24 h-24 text-gray-400 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-2xl font-bold mb-4">Chưa có đơn hàng nào</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Hãy đặt hàng ngay để trải nghiệm dịch vụ của chúng tôi
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Order Header */}
                <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Mã đơn hàng</p>
                      <p className="font-bold text-lg">#{order.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Ngày đặt</p>
                      <p className="font-semibold">
                        {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Trạng thái</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tổng tiền</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {order.totalAmount.toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-6">
                  <div className="space-y-4 mb-4">
                    {order.orderItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.productName}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {item.productPrice.toLocaleString('vi-VN')}đ x {item.quantity}
                          </p>
                        </div>
                        <p className="font-bold text-lg">
                          {item.subtotal.toLocaleString('vi-VN')}đ
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Shipping Info */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 mb-1">Thông tin nhận hàng</p>
                        <p className="font-semibold">{order.customerName}</p>
                        <p>{order.customerPhone}</p>
                        <p>{order.customerEmail}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 mb-1">Địa chỉ giao hàng</p>
                        <p className="font-semibold">{order.shippingAddress}</p>
                        {order.note && (
                          <>
                            <p className="text-gray-600 dark:text-gray-400 mt-2 mb-1">Ghi chú</p>
                            <p className="italic">{order.note}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => {
                        console.log('View order details clicked:', order.id);
                        setSelectedOrderId(selectedOrderId === order.id ? null : order.id);
                      }}
                      className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-semibold"
                    >
                      Xem chi tiết
                    </button>
                    {canCancel(order.status) && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                      >
                        Hủy đơn hàng
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
          </div>
        </div>

        {/* Order Detail Panel - Slide in from right */}
        {selectedOrderId && (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-500"
              onClick={() => {
                console.log('Overlay clicked, closing panel');
                setSelectedOrderId(null);
              }}
            />
            
            {/* Detail Panel */}
            <div className="fixed top-0 right-0 h-full w-1/2 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 animate-slide-in-right bg-white dark:bg-gray-900">
              <OrderDetailPanel
                orderId={selectedOrderId}
                onClose={() => {
                  console.log('Close button clicked');
                  setSelectedOrderId(null);
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
