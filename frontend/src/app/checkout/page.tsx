'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import AddressSelector from '@/components/AddressSelector';
import DiscountApplier from '@/components/DiscountApplier';

interface CartItem {
  id: number;
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  subtotal: number;
}

interface Cart {
  items: CartItem[];
  totalPrice: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [note, setNote] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [useProfileAddress, setUseProfileAddress] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // Default to CASH
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  // Discount state
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [finalTotal, setFinalTotal] = useState(0);

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
      if (!data || data.items.length === 0) {
        showToast('Giỏ hàng trống', 'warning');
        router.push('/cart');
        return;
      }
      setCart(data);
      setFinalTotal(data.totalPrice);
    } catch (err) {
      setError('Không thể tải giỏ hàng');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscountApplied = (discount: any, newTotal: number) => {
    setAppliedDiscount(discount);
    setFinalTotal(newTotal);
    setError('');
  };

  const handleDiscountRemoved = () => {
    setAppliedDiscount(null);
    setFinalTotal(cart?.totalPrice || 0);
  };

  const handleSubmitOrder = async () => {
    if (!cart || cart.items.length === 0) {
      showToast('Giỏ hàng trống', 'warning');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const orderData = {
        note: note.trim() || undefined,
        paymentMethod: paymentMethod,
        discountCode: appliedDiscount?.code || undefined,
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const order = await apiClient.createOrder(orderData);

      // If payment method is BANK_TRANSFER, show QR modal
      if (paymentMethod === 'BANK_TRANSFER') {
        setCreatedOrder(order);
        setShowSuccessModal(true);
      } else {
        showToast('Đặt hàng thành công!', 'success');
        router.push(`/orders`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đặt hàng thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (!cart) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Modern Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/cart" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Quay lại giỏ hàng</span>
            </Link>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Thanh toán
            </h1>
            <div className="w-40"></div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-xl shadow-lg animate-slide-up">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-2 bg-red-100 dark:bg-red-800/50 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 hover:shadow-2xl transition-all duration-300">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Địa chỉ giao hàng</span>
              </h2>

              {/* Toggle between profile address and custom address */}
              <div className="mb-8 space-y-4">
                <label className={`flex items-center gap-4 p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group relative ${useProfileAddress ? 'ring-2 ring-blue-500/50 shadow-xl' : ''}`} style={{
                  borderColor: useProfileAddress ? 'rgb(59 130 246)' : 'rgb(209 213 219)',
                  backgroundColor: useProfileAddress ? 'rgb(219 234 254)' : 'transparent'
                }}>
                  <div className="flex-shrink-0">
                    <input
                      type="radio"
                      name="addressOption"
                      checked={useProfileAddress}
                      onChange={() => setUseProfileAddress(true)}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                    />
                    {useProfileAddress && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-lg mb-1 transition-colors ${useProfileAddress ? 'text-blue-800' : 'group-hover:text-blue-700'}`}>Sử dụng địa chỉ từ profile</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Lấy thông tin từ trang cá nhân của bạn</p>
                  </div>
                  <Link
                    href="/profile"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium hover:underline transition-colors px-3 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Xem/Sửa
                  </Link>
                </label>

                <label className={`flex items-center gap-4 p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group relative ${!useProfileAddress ? 'ring-2 ring-blue-500/50 shadow-xl' : ''}`} style={{
                  borderColor: !useProfileAddress ? 'rgb(59 130 246)' : 'rgb(209 213 219)',
                  backgroundColor: !useProfileAddress ? 'rgb(219 234 254)' : 'transparent'
                }}>
                  <div className="flex-shrink-0">
                    <input
                      type="radio"
                      name="addressOption"
                      checked={!useProfileAddress}
                      onChange={() => setUseProfileAddress(false)}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                    />
                    {!useProfileAddress && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-lg mb-1 transition-colors ${!useProfileAddress ? 'text-blue-800' : 'group-hover:text-blue-700'}`}>Nhập địa chỉ mới</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Giao hàng đến địa chỉ khác</p>
                  </div>
                </label>
              </div>

              {/* Custom Address Form */}
              {!useProfileAddress && (
                <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-700/50 dark:to-blue-900/10 rounded-2xl border border-gray-200/50 dark:border-gray-600/50 shadow-inner">
                  <AddressSelector
                    onAddressChange={(address) => {
                      setShippingAddress(address.fullAddress);
                    }}
                    required={!useProfileAddress}
                  />
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 hover:shadow-2xl transition-all duration-300">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Sản phẩm đặt hàng ({cart.items.length})</span>
              </h2>
              <div className="space-y-6">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-6 pb-6 border-b border-gray-200/50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 rounded-xl p-4 transition-all duration-200">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{item.productName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.productPrice.toLocaleString('vi-VN')}đ x {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        {item.subtotal.toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Note */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 hover:shadow-2xl transition-all duration-300">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Ghi chú đơn hàng</span>
              </h2>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Thêm ghi chú cho đơn hàng (không bắt buộc)
Ví dụ: Giao hàng buổi chiều, gọi trước khi giao..."
                className="w-full h-32 px-6 py-4 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white resize-none shadow-inner transition-all duration-200 focus:shadow-lg"
              ></textarea>
            </div>

            {/* Payment Method Selection */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 hover:shadow-2xl transition-all duration-300">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Phương thức thanh toán</span>
              </h2>

              <div className="space-y-4">
                {/* Cash on Delivery */}
                <label className={`flex items-center gap-4 p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group relative ${paymentMethod === 'CASH' ? 'ring-2 ring-emerald-500/50 shadow-xl' : ''
                  }`} style={{
                    borderColor: paymentMethod === 'CASH' ? 'rgb(16 185 129)' : 'rgb(209 213 219)',
                    backgroundColor: paymentMethod === 'CASH' ? 'rgb(209 250 229)' : 'transparent'
                  }}>
                  <div className="flex-shrink-0">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="CASH"
                      checked={paymentMethod === 'CASH'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-5 h-5 text-emerald-600 focus:ring-emerald-500"
                    />
                    {paymentMethod === 'CASH' && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-lg mb-1 transition-colors flex items-center gap-2 ${paymentMethod === 'CASH' ? 'text-emerald-800' : 'group-hover:text-emerald-700'
                      }`}>
                      💵 Tiền mặt khi nhận hàng (COD)
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Thanh toán trực tiếp cho đơn vị vận chuyển</p>
                  </div>
                </label>

                {/* Bank Transfer */}
                <label className={`flex items-center gap-4 p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group relative ${paymentMethod === 'BANK_TRANSFER' ? 'ring-2 ring-blue-500/50 shadow-xl' : ''
                  }`} style={{
                    borderColor: paymentMethod === 'BANK_TRANSFER' ? 'rgb(59 130 246)' : 'rgb(209 213 219)',
                    backgroundColor: paymentMethod === 'BANK_TRANSFER' ? 'rgb(219 234 254)' : 'transparent'
                  }}>
                  <div className="flex-shrink-0">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="BANK_TRANSFER"
                      checked={paymentMethod === 'BANK_TRANSFER'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                    />
                    {paymentMethod === 'BANK_TRANSFER' && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-lg mb-1 transition-colors flex items-center gap-2 ${paymentMethod === 'BANK_TRANSFER' ? 'text-blue-800' : 'group-hover:text-blue-700'
                      }`}>
                      🏦 Chuyển khoản ngân hàng
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Quét mã VietQR để thanh toán nhanh chóng</p>
                  </div>
                </label>

                {/* VietQR Info */}
                {paymentMethod === 'BANK_TRANSFER' && (
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-700/50 shadow-inner">
                    <div className="flex items-start gap-3 mb-3">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-semibold mb-2">📱 Sau khi đặt hàng, bạn sẽ nhận được mã QR:</p>
                        <ul className="space-y-1 list-disc list-inside">
                          <li>Mã VietQR tự động điền số tiền và nội dung</li>
                          <li>Ngân hàng: <strong>MB Bank - 0889559357</strong></li>
                          <li>Quét bằng app ngân hàng bất kỳ để thanh toán</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 hover:shadow-2xl transition-all duration-300 sticky top-24">
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Tóm tắt đơn hàng</span>
              </h2>

              <div className="space-y-6 mb-8">
                <div className="flex justify-between items-center py-3 px-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Tạm tính</span>
                  <span className="font-semibold text-lg">{cart.totalPrice.toLocaleString('vi-VN')}đ</span>
                </div>

                {/* Discount section */}
                <DiscountApplier
                  orderTotal={cart.totalPrice}
                  onDiscountApplied={handleDiscountApplied}
                  onDiscountRemoved={handleDiscountRemoved}
                  appliedDiscount={appliedDiscount}
                />

                {appliedDiscount && (
                  <div className="flex justify-between items-center py-3 px-4 bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Giảm giá</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      -{(cart.totalPrice - finalTotal).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-3 px-4 bg-green-50/50 dark:bg-green-900/10 rounded-xl">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Phí vận chuyển</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {appliedDiscount?.type === 'FREE_SHIPPING' ? 'Miễn phí (ưu đãi)' : 'Miễn phí'}
                  </span>
                </div>
                <div className="border-t-2 border-gray-200/50 dark:border-gray-700/50 pt-6">
                  <div className="flex justify-between items-center py-4 px-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl border border-blue-200/50 dark:border-blue-800/50">
                    <span className="text-xl font-bold text-gray-800 dark:text-gray-200">Tổng cộng</span>
                    <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {finalTotal.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  {appliedDiscount && (
                    <div className="mt-3 text-center">
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        🎉 Bạn đã tiết kiệm {(cart.totalPrice - finalTotal).toLocaleString('vi-VN')}đ!
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleSubmitOrder}
                disabled={submitting}
                className="w-full py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-3 group transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Xác nhận đặt hàng</span>
                  </>
                )}
              </button>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-xl border border-green-200/50 dark:border-green-800/50">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-300">Thanh toán an toàn & bảo mật</p>
                    <p className="text-sm text-green-600 dark:text-green-400">SSL 256-bit encryption</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-800 dark:text-blue-300">Cam kết hoàn tiền 100%</p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Không hài lòng? Hoàn tiền ngay</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment QR Code Modal */}
      {showSuccessModal && createdOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full animate-slide-up">
            <div className="p-6">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Chờ thanh toán</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Đơn hàng <span className="font-bold text-blue-600">#{createdOrder.id}</span></p>
              </div>

              {/* QR Code Section */}
              {createdOrder.qrCodeUrl && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 mb-4 border border-blue-200 dark:border-blue-700">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 text-center">📱 Quét mã QR để thanh toán</p>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-md mb-3">
                    <img
                      src={createdOrder.qrCodeUrl}
                      alt="VietQR Code"
                      className="w-48 h-48 mx-auto object-contain"
                    />
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2 bg-white/50 dark:bg-gray-700/50 rounded">
                      <span className="text-gray-600 dark:text-gray-400">Ngân hàng:</span>
                      <span className="font-semibold text-gray-800 dark:text-white">MB Bank</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white/50 dark:bg-gray-700/50 rounded">
                      <span className="text-gray-600 dark:text-gray-400">STK:</span>
                      <span className="font-semibold text-gray-800 dark:text-white">0889559357</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white/50 dark:bg-gray-700/50 rounded">
                      <span className="text-gray-600 dark:text-gray-400">Số tiền:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {createdOrder.totalAmount?.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-white/50 dark:bg-gray-700/50 rounded">
                      <span className="text-gray-600 dark:text-gray-400">Nội dung:</span>
                      <span className="font-semibold text-gray-800 dark:text-white">DH{createdOrder.id}</span>
                    </div>
                  </div>

                  <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded border border-yellow-300 dark:border-yellow-700">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200 text-center">
                      ⚠️ Vui lòng thanh toán để hoàn tất đơn hàng
                    </p>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={async () => {
                  // Auto-confirm order for testing (simulate payment)
                  try {
                    await apiClient.updateOrderStatus(createdOrder.id, 'CONFIRMED');
                  } catch (error) {
                    console.error('Failed to update order status:', error);
                  }
                  setShowSuccessModal(false);
                  showToast('Đặt hàng thành công! Đơn hàng đã được xác nhận.', 'success');
                  router.push('/orders');
                }}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Đã hiểu, đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
