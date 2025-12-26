'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import {
  Trash2,
  Minus,
  Plus,
  ArrowLeft,
  ShoppingBag,
  CreditCard,
  ShieldCheck,
  Truck,
  RefreshCw,
  ShoppingCart
} from 'lucide-react';

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
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-slate-400 font-medium">Đang tải giỏ hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 selection:bg-blue-500/30">

      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-[#050505] to-[#050505]"></div>
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-fuchsia-600/5 rounded-full blur-[100px] animate-pulse delay-700"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/10 transition-all duration-300">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
              <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 border border-white/10">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <span className="font-medium">Tiếp tục mua sắm</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">Giỏ hàng</h1>
            </div>

            <Link href="/orders" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium">
              <span>Đơn hàng</span>
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Truck className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 relative z-10">
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Trash2 className="w-5 h-5" />
            </div>
            <span>{error}</span>
          </div>
        )}

        {!cart || cart.items.length === 0 ? (
          <div className="max-w-2xl mx-auto bg-[#1A1D2D]/50 backdrop-blur-md border border-white/10 rounded-2xl p-16 text-center shadow-2xl">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 animate-float">
              <ShoppingCart className="w-10 h-10 text-slate-500" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Giỏ hàng trống</h2>
            <p className="text-slate-400 mb-8 text-lg">
              Hãy khám phá các giải pháp AI tiên tiến của chúng tôi
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/25 transition-all hover:scale-105"
            >
              <ShoppingBag className="w-5 h-5" />
              Khám phá ngay
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* List Header */}
              <div className="bg-[#1A1D2D]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex items-center justify-between shadow-xl">
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-blue-400" />
                  Sản phẩm ({cart.items.length})
                </h2>
                <button
                  onClick={handleClearCart}
                  disabled={updating}
                  className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 px-4 py-2 rounded-lg transition-all text-sm font-medium disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa tất cả
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="group bg-[#1A1D2D]/60 backdrop-blur-sm border border-white/5 hover:border-blue-500/30 rounded-2xl p-5 flex gap-6 transition-all duration-300 hover:bg-[#1A1D2D]"
                  >
                    {/* Image */}
                    <div className="relative shrink-0 w-32 h-32 rounded-xl overflow-hidden bg-[#050505] border border-white/10">
                      <img
                        src={item.productImageUrl || 'https://via.placeholder.com/150'}
                        alt={item.productName}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{item.productName}</h3>
                        <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                          {item.productPrice.toLocaleString('vi-VN')}đ
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        {/* Quantity Control */}
                        <div className="flex items-center gap-1 bg-[#050505] rounded-xl p-1 border border-white/10">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            disabled={updating || item.quantity <= 1}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center font-bold text-white">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            disabled={updating}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Subtotal & Remove */}
                        <div className="flex items-center gap-6">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Tạm tính</p>
                            <p className="text-lg font-bold text-white">{item.subtotal.toLocaleString('vi-VN')}đ</p>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={updating}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all disabled:opacity-50"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-[#1A1D2D]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sticky top-24 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-400" />
                  Tóm tắt đơn hàng
                </h2>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Tạm tính</span>
                    <span className="font-semibold text-white">{cart.totalPrice.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Phí vận chuyển</span>
                    <span className="font-semibold text-green-400">Miễn phí</span>
                  </div>

                  <div className="h-[1px] bg-white/10 my-4"></div>

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-white">Tổng cộng</span>
                    <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                      {cart.totalPrice.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={updating}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                >
                  Tiến hành thanh toán
                </button>

                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3 text-sm text-slate-400 bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                    <div className="p-1.5 bg-green-500/10 rounded-full">
                      <Truck className="w-4 h-4 text-green-400" />
                    </div>
                    Miễn phí vận chuyển toàn quốc
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400 bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                    <div className="p-1.5 bg-blue-500/10 rounded-full">
                      <RefreshCw className="w-4 h-4 text-blue-400" />
                    </div>
                    Đổi trả trong vòng 7 ngày
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400 bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                    <div className="p-1.5 bg-purple-500/10 rounded-full">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                    </div>
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
