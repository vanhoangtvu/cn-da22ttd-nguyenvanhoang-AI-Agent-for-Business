'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';

interface Category {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  status: string;
}

export default function CategoryManagement() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '', imageUrl: '' });

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
    loadCategories();
  }, [router]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAdminCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      alert('Không thể tải danh mục. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', imageUrl: '' });
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({ 
      name: category.name, 
      description: category.description || '', 
      imageUrl: category.imageUrl || '' 
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      alert('Vui lòng nhập tên danh mục!');
      return;
    }

    try {
      if (editingCategory) {
        await apiClient.updateCategory(editingCategory.id, formData);
        alert('Cập nhật danh mục thành công!');
      } else {
        await apiClient.createCategory(formData);
        alert('Tạo danh mục thành công!');
      }
      setShowModal(false);
      loadCategories();
    } catch (error: any) {
      console.error('Failed to save category:', error);
      alert(error.message || 'Không thể lưu danh mục. Vui lòng thử lại.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa danh mục này? Các sản phẩm trong danh mục có thể bị ảnh hưởng.')) return;

    try {
      await apiClient.deleteCategory(id);
      alert('Xóa danh mục thành công!');
      loadCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Không thể xóa danh mục. Vui lòng thử lại.');
    }
  };

  const handleStatusChange = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    try {
      await apiClient.updateCategoryStatus(id, newStatus);
      alert('Cập nhật trạng thái thành công!');
      loadCategories();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Không thể cập nhật trạng thái. Vui lòng thử lại.');
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Quản lý Danh mục
            </h1>
            <div className="flex items-center gap-4">
              <Link href="/shop" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors">
                Cửa hàng
              </Link>
              <button onClick={() => apiClient.logout()} className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors">
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            <Link href="/admin" className="px-6 py-4 text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors whitespace-nowrap">
              Tổng quan
            </Link>
            <Link href="/admin/products" className="px-6 py-4 text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors whitespace-nowrap">
              Sản phẩm
            </Link>
            <Link href="/admin/orders" className="px-6 py-4 text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors whitespace-nowrap">
              Đơn hàng
            </Link>
            <Link href="/admin/categories" className="px-6 py-4 font-semibold border-b-4 border-purple-600 text-purple-600 whitespace-nowrap">
              Danh mục
            </Link>
            <Link href="/admin/revenue" className="px-6 py-4 text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors whitespace-nowrap">
              Doanh thu
            </Link>
            <Link href="/admin/reports" className="px-6 py-4 text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors whitespace-nowrap">
              Báo cáo
            </Link>
            {userData.role === 'ADMIN' && (
              <Link href="/admin/users" className="px-6 py-4 text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors whitespace-nowrap">
                Người dùng
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Header Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-gray-600 dark:text-gray-400">
              Tổng số: <span className="font-semibold text-purple-600">{categories.length}</span> danh mục
            </div>
            <button
              onClick={openCreateModal}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Thêm danh mục mới
            </button>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(category => (
            <div key={category.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              {/* Category Image */}
              {category.imageUrl && (
                <div className="h-48 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 overflow-hidden">
                  <img 
                    src={category.imageUrl} 
                    alt={category.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{category.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                      {category.description || 'Không có mô tả'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleStatusChange(category.id, category.status)}
                    className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                      category.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {category.status === 'ACTIVE' ? 'Hoạt động' : 'Vô hiệu'}
                  </button>
                </div>
                
                <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => openEditModal(category)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">Chưa có danh mục nào</p>
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                {editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">Tên danh mục *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">URL Hình ảnh</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                  {formData.imageUrl && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Xem trước:</p>
                      <div className="relative h-32 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg overflow-hidden flex items-center justify-center">
                        <img
                          src={formData.imageUrl}
                          alt="Preview"
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML = '<p class="text-red-500 text-sm flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> Không thể tải hình ảnh</p>';
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                  >
                    {editingCategory ? 'Cập nhật' : 'Tạo mới'}
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
        </div>
      )}
    </div>
  );
}
