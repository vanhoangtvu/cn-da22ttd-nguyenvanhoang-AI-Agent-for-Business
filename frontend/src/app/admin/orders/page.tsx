'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  price?: number; // For backward compatibility
  productPrice?: number; // Backend uses this field
  subtotal?: number; // Backend provides this
}

interface Order {
  id: number;
  createdAt: string;
  orderDate?: string; // For backward compatibility
  totalAmount: number;
  status: string;
  note?: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  orderItems: OrderItem[];
  items?: OrderItem[]; // For backward compatibility
}

export default function OrderManagement() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'RETURNED'];
  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    PROCESSING: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    SHIPPING: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
    DELIVERED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    RETURNED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };

  const statusNames: Record<string, string> = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    PROCESSING: 'Đang xử lý',
    SHIPPING: 'Đang giao',
    DELIVERED: 'Đã giao',
    CANCELLED: 'Đã hủy',
    RETURNED: 'Trả hàng',
  };

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = apiClient.getUserData();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'BUSINESS')) {
      router.push('/shop');
      return;
    }

    setUserData(user);
    loadOrders();
  }, [router]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAdminOrders();
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
      alert('Không thể tải đơn hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    if (!confirm(`Bạn có chắc chắn muốn chuyển trạng thái đơn hàng sang "${statusNames[newStatus]}"?`)) return;

    try {
      await apiClient.updateOrderStatus(orderId, newStatus);
      alert('Cập nhật trạng thái thành công!');
      loadOrders();
      if (selectedOrder?.id === orderId) {
        const updated = await apiClient.getOrder(orderId);
        setSelectedOrder(updated);
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Không thể cập nhật trạng thái. Vui lòng thử lại.');
    }
  };

  const viewOrderDetail = async (order: Order) => {
    try {
      const fullOrder = await apiClient.getOrder(order.id);
      console.log('Order details from API:', fullOrder);
      
      // Normalize data from backend to match frontend interface
      if (!fullOrder.orderItems && !fullOrder.items) {
        fullOrder.orderItems = [];
      }
      
      // Use orderItems as primary source, fallback to items for backward compatibility
      if (!fullOrder.orderItems && fullOrder.items) {
        fullOrder.orderItems = fullOrder.items;
      }
      
      // Set orderDate from createdAt for backward compatibility
      if (!fullOrder.orderDate && fullOrder.createdAt) {
        fullOrder.orderDate = fullOrder.createdAt;
      }
      
      setSelectedOrder(fullOrder);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load order details:', error);
      alert('Không thể tải chi tiết đơn hàng.');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'ALL' || order.status === filterStatus;
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toString().includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  if (loading || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout userData={userData} currentPage="orders">
      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <input
              type="text"
              placeholder="Tìm kiếm theo mã đơn, tên khách hàng, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            />
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  filterStatus === 'ALL' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Tất cả
              </button>
              {statuses.map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                    filterStatus === status 
                      ? statusColors[status] 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {statusNames[status]}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 text-gray-600 dark:text-gray-400">
            Tổng số: <span className="font-semibold text-purple-600">{filteredOrders.length}</span> đơn hàng
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mã đơn</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Khách hàng</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ngày đặt</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tổng tiền</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 font-semibold text-purple-600 dark:text-purple-400">#{order.id}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-white">{order.customerName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{order.customerEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {new Date(order.orderDate).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[order.status]} cursor-pointer focus:ring-2 focus:ring-purple-500`}
                      >
                        {statuses.map(status => (
                          <option key={status} value={status}>{statusNames[status]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => viewOrderDetail(order)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">Không tìm thấy đơn hàng nào</p>
            </div>
          )}
        </div>
      </main>

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Chi tiết đơn hàng #{selectedOrder.id}</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Thông tin khách hàng</h3>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Tên:</span> {selectedOrder.customerName}</p>
                  <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Email:</span> {selectedOrder.customerEmail}</p>
                  <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Địa chỉ:</span> {selectedOrder.shippingAddress}</p>
                </div>
              </div>

              {/* Order Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Thông tin đơn hàng</h3>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Ngày đặt:</span> {
                      (selectedOrder.createdAt || selectedOrder.orderDate)
                        ? new Date(selectedOrder.createdAt || selectedOrder.orderDate!).toLocaleString('vi-VN', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Không xác định'
                    }
                  </p>
                  <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Trạng thái:</span> <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[selectedOrder.status]}`}>{statusNames[selectedOrder.status]}</span></p>
                  {selectedOrder.note && <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Ghi chú:</span> {selectedOrder.note}</p>}
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Sản phẩm</h3>
                <div className="space-y-2">
                  {((selectedOrder.orderItems && selectedOrder.orderItems.length > 0) || (selectedOrder.items && selectedOrder.items.length > 0)) ? (
                    (selectedOrder.orderItems || selectedOrder.items || []).map(item => {
                      // Use subtotal if available, otherwise calculate from productPrice or price
                      const itemTotal = item.subtotal || (item.productPrice || item.price || 0) * item.quantity;
                      const itemPrice = item.productPrice || item.price || 0;
                      
                      return (
                        <div key={item.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800 dark:text-white">{item.productName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Số lượng: {item.quantity} × {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(itemPrice)}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-800 dark:text-white">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(itemTotal)}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">Không có sản phẩm trong đơn hàng</p>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <div className="flex items-center justify-between text-xl font-bold">
                  <span className="text-gray-800 dark:text-white">Tổng cộng:</span>
                  <span className="text-purple-600 dark:text-purple-400">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Status Change */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">Cập nhật trạng thái</label>
                <div className="flex gap-2 flex-wrap">
                  {statuses.map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(selectedOrder.id, status)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        selectedOrder.status === status 
                          ? statusColors[status] 
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                    >
                      {statusNames[status]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
