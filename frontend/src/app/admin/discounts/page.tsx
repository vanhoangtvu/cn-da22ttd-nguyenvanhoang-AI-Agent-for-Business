'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

interface Discount {
  id: number;
  code: string;
  name: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  discountValue: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usedCount: number;
  startDate?: string;
  endDate?: string;
  status: string;
  createdByUsername: string;
  isValid: boolean;
  isExpired: boolean;
  usagePercentage?: number;
  createdAt: string;
}

export default function DiscountsPage() {
  const router = useRouter();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING',
    discountValue: 0,
    minOrderValue: 0,
    maxDiscountAmount: 0,
    usageLimit: null as number | null,
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = apiClient.getUserData();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'BUSINESS')) {
      router.push('/');
      return;
    }

    setUserData(user);
    loadDiscounts();
  }, [router]);

  const loadDiscounts = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAdminDiscounts();
      setDiscounts(data as Discount[]);
    } catch (error) {
      console.error('Failed to load discounts:', error);
      alert('Không thể tải dữ liệu giảm giá. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingDiscount(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: 0,
      minOrderValue: 0,
      maxDiscountAmount: 0,
      usageLimit: null,
      startDate: '',
      endDate: '',
    });
    setShowModal(true);
  };

  const openEditModal = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code,
      name: discount.name,
      description: discount.description || '',
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      minOrderValue: discount.minOrderValue || 0,
      maxDiscountAmount: discount.maxDiscountAmount || 0,
      usageLimit: discount.usageLimit ?? null,
      startDate: discount.startDate ? new Date(discount.startDate).toISOString().slice(0, 16) : '',
      endDate: discount.endDate ? new Date(discount.endDate).toISOString().slice(0, 16) : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.name || formData.discountValue <= 0) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }

    try {
      const submitData = {
        ...formData,
        minOrderValue: formData.minOrderValue || null,
        maxDiscountAmount: formData.maxDiscountAmount || null,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      };

      if (editingDiscount) {
        await apiClient.updateDiscount(editingDiscount.id, submitData);
        alert('Cập nhật mã giảm giá thành công!');
      } else {
        await apiClient.createDiscount(submitData);
        alert('Tạo mã giảm giá thành công!');
      }

      setShowModal(false);
      loadDiscounts();
    } catch (error: any) {
      console.error('Failed to save discount:', error);
      alert(error.message || 'Không thể lưu mã giảm giá. Vui lòng thử lại.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mã giảm giá này?')) return;

    try {
      await apiClient.deleteDiscount(id);
      alert('Xóa mã giảm giá thành công!');
      loadDiscounts();
    } catch (error) {
      console.error('Failed to delete discount:', error);
      alert('Không thể xóa mã giảm giá. Vui lòng thử lại.');
    }
  };

  const handleStatusChange = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      await apiClient.updateDiscountStatus(id, newStatus);
      alert('Cập nhật trạng thái thành công!');
      loadDiscounts();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Không thể cập nhật trạng thái. Vui lòng thử lại.');
    }
  };

  const getStatusColor = (discount: Discount) => {
    if (!discount.isValid) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    if (discount.isExpired) return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
  };

  const getStatusText = (discount: Discount) => {
    if (!discount.isValid && !discount.isExpired) return 'Vô hiệu';
    if (discount.isExpired) return 'Hết hạn';
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) return 'Hết lượt';
    return 'Hoạt động';
  };

  const formatDiscountValue = (discount: Discount) => {
    switch (discount.discountType) {
      case 'PERCENTAGE':
        return `${discount.discountValue}%`;
      case 'FIXED_AMOUNT':
        return `${discount.discountValue.toLocaleString('vi-VN')}đ`;
      case 'FREE_SHIPPING':
        return 'Miễn phí ship';
      default:
        return discount.discountValue.toString();
    }
  };

  const filteredDiscounts = discounts.filter(discount => {
    const matchesSearch = discount.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      discount.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || discount.status === filterStatus;
    const matchesType = filterType === 'ALL' || discount.discountType === filterType;
    return matchesSearch && matchesStatus && matchesType;
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
    <AdminLayout userData={userData} currentPage="discounts">
      <main className="container mx-auto px-4 py-8">
        {/* Filters and Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <input
                type="text"
                placeholder="Tìm kiếm mã giảm giá..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white flex-1"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Vô hiệu hóa</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="ALL">Tất cả loại</option>
                <option value="PERCENTAGE">Phần trăm</option>
                <option value="FIXED_AMOUNT">Số tiền cố định</option>
                <option value="FREE_SHIPPING">Miễn phí ship</option>
              </select>
            </div>
            <div className="flex gap-3">

              <button
                onClick={openCreateModal}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold flex items-center gap-2 whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tạo mã giảm giá
              </button>
            </div>
          </div>
          <div className="mt-4 text-gray-600 dark:text-gray-400">
            Tổng số: <span className="font-semibold text-purple-600">{filteredDiscounts.length}</span> mã giảm giá
          </div>
        </div>

        {/* Discounts Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mã / Tên</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Loại / Giá trị</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sử dụng</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Thời hạn</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDiscounts.map(discount => (
                  <tr key={discount.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-purple-600 dark:text-purple-400 text-lg">{discount.code}</p>
                        <p className="font-semibold text-gray-800 dark:text-white">{discount.name}</p>
                        {discount.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{discount.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${discount.discountType === 'PERCENTAGE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                          discount.discountType === 'FIXED_AMOUNT' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                            'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                          }`}>
                          {discount.discountType === 'PERCENTAGE' ? 'Phần trăm' :
                            discount.discountType === 'FIXED_AMOUNT' ? 'Cố định' : 'Miễn phí ship'}
                        </span>
                        <p className="font-bold text-gray-800 dark:text-white mt-2">{formatDiscountValue(discount)}</p>
                        {discount.minOrderValue && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Tối thiểu: {discount.minOrderValue.toLocaleString('vi-VN')}đ
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-white">
                          {discount.usedCount} {discount.usageLimit ? `/ ${discount.usageLimit}` : '/ ∞'}
                        </p>
                        {discount.usagePercentage !== undefined && (
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                            <div
                              className={`h-2 rounded-full ${discount.usagePercentage >= 90 ? 'bg-red-500' :
                                discount.usagePercentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                              style={{ width: `${Math.min(discount.usagePercentage, 100)}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {discount.startDate && (
                        <p>Từ: {new Date(discount.startDate).toLocaleDateString('vi-VN')}</p>
                      )}
                      {discount.endDate && (
                        <p>Đến: {new Date(discount.endDate).toLocaleDateString('vi-VN')}</p>
                      )}
                      {!discount.startDate && !discount.endDate && (
                        <p className="text-gray-500">Không giới hạn</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleStatusChange(discount.id, discount.status)}
                        className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${getStatusColor(discount)}`}
                      >
                        {getStatusText(discount)}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(discount)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(discount.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredDiscounts.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">Không tìm thấy mã giảm giá nào</p>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full my-8">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                {editingDiscount ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                      Mã giảm giá <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      placeholder="VD: SAVE20, SUMMER2024"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                      Tên mã giảm giá <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Tên hiển thị cho khách hàng"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                      Mô tả
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Mô tả chi tiết về mã giảm giá"
                    />
                  </div>
                </div>

                {/* Discount Settings */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                      Loại giảm giá <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      required
                    >
                      <option value="PERCENTAGE">Phần trăm (%)</option>
                      <option value="FIXED_AMOUNT">Số tiền cố định (đ)</option>
                      <option value="FREE_SHIPPING">Miễn phí giao hàng</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                      Giá trị giảm <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      min="0"
                      max={formData.discountType === 'PERCENTAGE' ? 100 : undefined}
                      placeholder={formData.discountType === 'PERCENTAGE' ? '20' : '100000'}
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formData.discountType === 'PERCENTAGE' ? 'Phần trăm (0-100)' :
                        formData.discountType === 'FIXED_AMOUNT' ? 'Số tiền (VNĐ)' : 'Để 0 cho miễn phí ship'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                        Đơn tối thiểu
                      </label>
                      <input
                        type="number"
                        value={formData.minOrderValue}
                        onChange={(e) => setFormData({ ...formData, minOrderValue: Number(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        min="0"
                        placeholder="500000"
                      />
                    </div>

                    {formData.discountType === 'PERCENTAGE' && (
                      <div>
                        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                          Giảm tối đa
                        </label>
                        <input
                          type="number"
                          value={formData.maxDiscountAmount}
                          onChange={(e) => setFormData({ ...formData, maxDiscountAmount: Number(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                          min="0"
                          placeholder="200000"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Usage & Time Settings */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                    Giới hạn sử dụng
                  </label>
                  <input
                    type="number"
                    value={formData.usageLimit || ''}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    min="1"
                    placeholder="Không giới hạn"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                    Ngày kết thúc
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                >
                  {editingDiscount ? 'Cập nhật' : 'Tạo mã'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}