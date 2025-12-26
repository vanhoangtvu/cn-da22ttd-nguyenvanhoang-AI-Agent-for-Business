'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmProvider';
import { useToast } from '@/components/ToastProvider';
import OrderDetailPanel from '@/components/OrderDetailPanel';
import {
  Package,
  ShoppingBag,
  ChevronLeft,
  ShoppingCart,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  RotateCcw,
  MapPin,
  Phone,
  Mail,
  FileText,
  CreditCard,
  Eye,
  X as XIcon
} from 'lucide-react';

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
  paymentMethod?: string;
  qrCodeUrl?: string;
  orderItems: OrderItem[];
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  PENDING: {
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: Clock,
    label: 'Chờ xác nhận'
  },
  CONFIRMED: {
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: CheckCircle,
    label: 'Đã xác nhận'
  },
  PROCESSING: {
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: Package,
    label: 'Đang xử lý'
  },
  SHIPPING: {
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    icon: Truck,
    label: 'Đang giao hàng'
  },
  DELIVERED: {
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: CheckCircle,
    label: 'Đã giao hàng'
  },
  CANCELLED: {
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: XCircle,
    label: 'Đã hủy'
  },
  RETURNED: {
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    icon: RotateCcw,
    label: 'Đã trả hàng'
  },
};

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    if (orderIdParam) {
      const orderId = parseInt(orderIdParam);
      if (!isNaN(orderId)) {
        setSelectedOrderId(orderId);
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
      const data = (await apiClient.getMyOrders()) as Order[];
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
    const confirmed = await confirm({
      title: 'Hủy đơn hàng',
      message: 'Bạn có chắc muốn hủy đơn hàng này?',
      confirmText: 'Hủy đơn',
      cancelText: 'Không',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await apiClient.cancelOrder(orderId);
      showToast('Đơn hàng đã được hủy', 'success');
      loadOrders();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể hủy đơn hàng', 'error');
    }
  };

  const canCancel = (status: string) => {
    return status === 'PENDING' || status === 'CONFIRMED';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Đang tải đơn hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 font-sans selection:bg-blue-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl sticky top-0">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Tiếp tục mua sắm</span>
          </Link>

          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Đơn hàng của tôi
          </h1>

          <Link href="/cart" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors">
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Giỏ hàng</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Orders List */}
        <div className={`flex-1 overflow-y-auto transition-all duration-500 ease-in-out ${selectedOrderId ? 'w-1/2' : 'w-full'}`}>
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="text-red-400 font-medium">{error}</span>
              </div>
            )}

            {orders.length === 0 ? (
              <div className="bg-[#1A1D2D]/60 backdrop-blur-md border border-white/5 rounded-2xl p-12 text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-12 h-12 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Chưa có đơn hàng nào</h2>
                <p className="text-gray-400 mb-6">
                  Hãy đặt hàng ngay để trải nghiệm dịch vụ của chúng tôi
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Khám phá sản phẩm
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => {
                  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div
                      key={order.id}
                      className="bg-[#1A1D2D]/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all group"
                    >
                      {/* Order Header */}
                      <div className="bg-white/5 px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/5">
                        <div className="flex flex-wrap items-center gap-6">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Mã đơn</p>
                            <p className="font-bold text-lg text-white">#{order.id}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Ngày đặt</p>
                            <p className="font-medium text-gray-300">
                              {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Trạng thái</p>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                              <StatusIcon className="w-4 h-4" />
                              {statusConfig.label}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tổng tiền</p>
                          <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            {order.totalAmount.toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="p-6">
                        <div className="space-y-3 mb-4">
                          {order.orderItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                              <div className="flex-1">
                                <h3 className="font-semibold text-white mb-1">{item.productName}</h3>
                                <p className="text-sm text-gray-400">
                                  {item.productPrice.toLocaleString('vi-VN')}đ × {item.quantity}
                                </p>
                              </div>
                              <p className="font-bold text-lg text-blue-400">
                                {item.subtotal.toLocaleString('vi-VN')}đ
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Shipping Info */}
                        <div className="border-t border-white/5 pt-4 mt-4">
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <p className="text-gray-500 font-medium mb-2 flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                Thông tin nhận hàng
                              </p>
                              <p className="font-semibold text-white">{order.customerName}</p>
                              <p className="text-gray-400">{order.customerPhone}</p>
                              <p className="text-gray-400">{order.customerEmail}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-gray-500 font-medium mb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                Địa chỉ giao hàng
                              </p>
                              <p className="font-semibold text-white">{order.shippingAddress}</p>
                              {order.note && (
                                <>
                                  <p className="text-gray-500 mt-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Ghi chú
                                  </p>
                                  <p className="italic text-gray-400">{order.note}</p>
                                </>
                              )}
                              {order.paymentMethod && (
                                <>
                                  <p className="text-gray-500 mt-3 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    Thanh toán
                                  </p>
                                  <p className="font-semibold text-white">
                                    {order.paymentMethod === 'BANK_TRANSFER' ? '🏦 Chuyển khoản' : '💵 Tiền mặt (COD)'}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
                          <button
                            onClick={() => setSelectedOrderId(selectedOrderId === order.id ? null : order.id)}
                            className="flex-1 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors font-medium text-white flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Xem chi tiết
                          </button>
                          {canCancel(order.status) && (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="px-6 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-xl transition-colors font-medium flex items-center gap-2"
                            >
                              <XIcon className="w-4 h-4" />
                              Hủy đơn
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Order Detail Panel */}
        {selectedOrderId && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-500"
              onClick={() => setSelectedOrderId(null)}
            />
            <div className="fixed top-0 right-0 h-full w-1/2 border-l border-white/10 shadow-2xl z-50 animate-slide-in-right bg-[#0A0A0A]">
              <OrderDetailPanel
                orderId={selectedOrderId}
                onClose={() => setSelectedOrderId(null)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Đang tải...</p>
        </div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}
