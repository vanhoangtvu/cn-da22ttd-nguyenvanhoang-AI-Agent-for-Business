'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';

interface CartItem {
  id: number;
  productId: number;
  productName: string;
  productPrice: number;
  productImageUrl: string;
  quantity: number;
  subtotal: number;
}

interface Cart {
  id: number;
  userId: number;
  items: CartItem[];
  totalPrice: number;
}

export default function CartPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadCart();
  }, []);

  const loadCart = async () => {
    setLoading(true);
    try {
      const data = (await apiClient.getCart()) as Cart;
      setCart(data);
    } catch (err) {
      setError('Không thể tải giỏ hàng');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    setUpdating(true);
    try {
      const updatedCart = (await apiClient.updateCartItem(itemId, newQuantity)) as Cart;
      setCart(updatedCart);
    } catch (err) {
      showToast('Không thể cập nhật số lượng', 'error');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveItem = async (productId: number) => {
    const confirmed = await confirm({
      title: 'Xóa sản phẩm',
      message: 'Bạn có chắc muốn xóa sản phẩm này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      type: 'danger'
    });

    if (!confirmed) return;

    setUpdating(true);
    try {
      const updatedCart = (await apiClient.removeCartItem(productId)) as Cart;
      setCart(updatedCart);
    } catch (err) {
      showToast('Không thể xóa sản phẩm', 'error');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleClearCart = async () => {
    const confirmed = await confirm({
      title: 'Xóa giỏ hàng',
      message: 'Bạn có chắc muốn xóa toàn bộ giỏ hàng?',
      confirmText: 'Xóa tất cả',
      cancelText: 'Hủy',
      type: 'danger'
    });

    if (!confirmed) return;

    setUpdating(true);
    try {
      await apiClient.clearCart();
      setCart({ ...cart!, items: [], totalPrice: 0 });
    } catch (err) {
      showToast('Không thể xóa giỏ hàng', 'error');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleCheckout = () => {
    if (!cart || cart.items.length === 0) {
      showToast('Giỏ hàng trống', 'warning');
      return;
    }
    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Đang tải giỏ hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Tiếp tục mua sắm
            </Link>
            <h1 className="text-2xl font-bold">Giỏ hàng của bạn</h1>
            <Link href="/orders" className="text-blue-600 dark:text-blue-400 hover:underline">
              Đơn hàng của tôi
            </Link>
          </div>
        </div>
      </header>

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

        {!cart || cart.items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <svg className="w-24 h-24 text-gray-400 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="text-2xl font-bold mb-4">Giỏ hàng trống</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Header */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Sản phẩm ({cart.items.length})
                </h2>
                <button
                  onClick={handleClearCart}
                  disabled={updating}
                  className="text-red-600 dark:text-red-400 hover:underline text-sm disabled:opacity-50"
                >
                  Xóa tất cả
                </button>
              </div>

              {/* Items List */}
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex gap-6"
                >
                  {/* Image */}
                  <img
                    src={item.productImageUrl || 'https://via.placeholder.com/150'}
                    alt={item.productName}
                    className="w-32 h-32 object-cover rounded-lg"
                  />

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{item.productName}</h3>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {item.productPrice.toLocaleString('vi-VN')}đ
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      {/* Quantity Control */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={updating || item.quantity <= 1}
                          className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={updating}
                          className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>

                      {/* Subtotal & Remove */}
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Tạm tính</p>
                          <p className="text-lg font-bold">{item.subtotal.toLocaleString('vi-VN')}đ</p>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={updating}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 sticky top-24">
                <h2 className="text-xl font-bold mb-6">Tóm tắt đơn hàng</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tạm tính</span>
                    <span className="font-semibold">{cart.totalPrice.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Phí vận chuyển</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">Miễn phí</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">Tổng cộng</span>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {cart.totalPrice.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={updating}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tiến hành đặt hàng
                </button>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Miễn phí vận chuyển toàn quốc
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Đổi trả trong vòng 7 ngày
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Bảo hành chính hãng
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
