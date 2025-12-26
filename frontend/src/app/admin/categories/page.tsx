'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

interface Category {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  status: string;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface CategoryStats {
  total: number;
  active: number;
  inactive: number;
  withProducts: number;
}

export default function CategoryManagement() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    status: 'ACTIVE'
  });

  // New state for enhanced features
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [stats, setStats] = useState<CategoryStats>({ total: 0, active: 0, inactive: 0, withProducts: 0 });
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'products' | 'updated'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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
    loadCategories();
  }, [router]);

  useEffect(() => {
    filterAndSortCategories();
  }, [categories, searchTerm, statusFilter, sortBy, sortOrder]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = (await apiClient.getAdminCategories()) as Category[];
      setCategories(data);
      calculateStats(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      alert('Không thể tải danh mục. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (cats: Category[]) => {
    const stats = {
      total: cats.length,
      active: cats.filter(c => c.status === 'ACTIVE').length,
      inactive: cats.filter(c => c.status === 'INACTIVE').length,
      withProducts: cats.filter(c => (c.productCount || 0) > 0).length
    };
    setStats(stats);
  };

  const filterAndSortCategories = () => {
    let filtered = categories.filter(category => {
      const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (category.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || category.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'products':
          aValue = a.productCount || 0;
          bValue = b.productCount || 0;
          break;
        case 'updated':
          aValue = new Date(a.updatedAt || a.createdAt || 0);
          bValue = new Date(b.updatedAt || b.createdAt || 0);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredCategories(filtered);
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', imageUrl: '', status: 'ACTIVE' });
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      status: category.status
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
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

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedCategories.length === 0) return;

    try {
      for (const id of selectedCategories) {
        await apiClient.updateCategoryStatus(id, newStatus);
      }
      alert(`Cập nhật trạng thái ${selectedCategories.length} danh mục thành công!`);
      setSelectedCategories([]);
      setShowBulkActions(false);
      loadCategories();
    } catch (error) {
      console.error('Failed to bulk update status:', error);
      alert('Không thể cập nhật trạng thái. Vui lòng thử lại.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCategories.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedCategories.length} danh mục đã chọn?`)) return;

    try {
      for (const id of selectedCategories) {
        await apiClient.deleteCategory(id);
      }
      alert(`Xóa ${selectedCategories.length} danh mục thành công!`);
      setSelectedCategories([]);
      setShowBulkActions(false);
      loadCategories();
    } catch (error) {
      console.error('Failed to bulk delete:', error);
      alert('Không thể xóa danh mục. Vui lòng thử lại.');
    }
  };

  const toggleCategorySelection = (id: number) => {
    setSelectedCategories(prev =>
      prev.includes(id)
        ? prev.filter(catId => catId !== id)
        : [...prev, id]
    );
  };

  const selectAllCategories = () => {
    setSelectedCategories(filteredCategories.map(cat => cat.id));
  };

  const clearSelection = () => {
    setSelectedCategories([]);
  };

  const exportCategories = () => {
    const dataStr = JSON.stringify(filteredCategories, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `categories_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (loading || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-slate-200 border-t-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">Đang tải danh mục...</p>
          <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout userData={userData} currentPage="categories">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header Section */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Quản lý danh mục</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Tổ chức và quản lý các danh mục sản phẩm của bạn
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportCategories}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Xuất dữ liệu
                </button>
                <button
                  onClick={openCreateModal}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Thêm danh mục
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Tổng danh mục</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Đang hoạt động</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{stats.active}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Tạm ngừng</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">{stats.inactive}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Có sản phẩm</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">{stats.withProducts}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Tìm kiếm danh mục..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Trạng thái:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white text-sm"
                  >
                    <option value="ALL">Tất cả</option>
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="INACTIVE">Tạm ngừng</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sắp xếp:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white text-sm"
                  >
                    <option value="name">Tên</option>
                    <option value="status">Trạng thái</option>
                    <option value="products">Số sản phẩm</option>
                    <option value="updated">Cập nhật</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <svg className={`w-4 h-4 text-slate-600 dark:text-slate-400 transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </button>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded ${viewMode === 'table' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedCategories.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Đã chọn {selectedCategories.length} danh mục
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBulkStatusChange('ACTIVE')}
                        className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 rounded text-sm font-medium transition-colors"
                      >
                        Kích hoạt
                      </button>
                      <button
                        onClick={() => handleBulkStatusChange('INACTIVE')}
                        className="px-3 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300 rounded text-sm font-medium transition-colors"
                      >
                        Tạm ngừng
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 rounded text-sm font-medium transition-colors"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={clearSelection}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm font-medium"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Categories Display */}
          {filteredCategories.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {searchTerm || statusFilter !== 'ALL' ? 'Không tìm thấy danh mục' : 'Chưa có danh mục nào'}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {searchTerm || statusFilter !== 'ALL'
                  ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                  : 'Bắt đầu bằng việc tạo danh mục đầu tiên cho cửa hàng của bạn'
                }
              </p>
              {(!searchTerm && statusFilter === 'ALL') && (
                <button
                  onClick={openCreateModal}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Tạo danh mục đầu tiên
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCategories.map(category => (
                <div
                  key={category.id}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all duration-200 group"
                >
                  {/* Selection Checkbox */}
                  <div className="p-4 pb-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => toggleCategorySelection(category.id)}
                          className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                        />
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${category.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          }`}>
                          {category.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm ngừng'}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(category)}
                          className="p-2 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleStatusChange(category.id, category.status)}
                          className={`p-2 transition-colors ${category.status === 'ACTIVE'
                              ? 'text-slate-600 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400'
                              : 'text-slate-600 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400'
                            }`}
                          title={category.status === 'ACTIVE' ? 'Tạm ngừng' : 'Kích hoạt'}
                        >
                          {category.status === 'ACTIVE' ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="p-2 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                          title="Xóa"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Category Image */}
                  {category.imageUrl && (
                    <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 overflow-hidden">
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 line-clamp-1">
                      {category.name}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-2">
                      {category.description || 'Không có mô tả'}
                    </p>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        {category.productCount || 0} sản phẩm
                      </div>
                      <div className="text-slate-400 dark:text-slate-500 text-xs">
                        {category.updatedAt ? new Date(category.updatedAt).toLocaleDateString('vi-VN') : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedCategories.length === filteredCategories.length && filteredCategories.length > 0}
                          onChange={selectedCategories.length === filteredCategories.length ? clearSelection : selectAllCategories}
                          className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Danh mục
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Mô tả
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Sản phẩm
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Cập nhật
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredCategories.map(category => (
                      <tr key={category.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category.id)}
                            onChange={() => toggleCategorySelection(category.id)}
                            className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {category.imageUrl && (
                              <img
                                src={category.imageUrl}
                                alt={category.name}
                                className="w-10 h-10 rounded-lg object-cover mr-3"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-slate-900 dark:text-white">
                                {category.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                            {category.description || 'Không có mô tả'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                          {category.productCount || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${category.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}>
                            {category.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm ngừng'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                          {category.updatedAt ? new Date(category.updatedAt).toLocaleDateString('vi-VN') : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(category)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleStatusChange(category.id, category.status)}
                              className={`${category.status === 'ACTIVE'
                                  ? 'text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300'
                                  : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                                }`}
                            >
                              {category.status === 'ACTIVE' ? 'Tạm ngừng' : 'Kích hoạt'}
                            </button>
                            <button
                              onClick={() => handleDelete(category.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Tên danh mục *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white text-lg font-medium"
                        placeholder="Nhập tên danh mục..."
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Mô tả
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white resize-vertical"
                        placeholder="Mô tả chi tiết về danh mục này..."
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        URL Hình ảnh
                      </label>
                      <input
                        type="url"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                      />
                      {formData.imageUrl && (
                        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Xem trước hình ảnh:</p>
                          <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-500 rounded-lg overflow-hidden flex items-center justify-center">
                            <img
                              src={formData.imageUrl}
                              alt="Preview"
                              className="max-h-full max-w-full object-contain rounded"
                              onError={(e) => {
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="flex flex-col items-center gap-2 text-red-500"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg><p class="text-sm">Không thể tải hình ảnh</p></div>';
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Trạng thái
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="ACTIVE"
                            checked={formData.status === 'ACTIVE'}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                            className="w-4 h-4 text-green-600 bg-slate-100 border-slate-300 focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                          />
                          <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">Hoạt động</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="INACTIVE"
                            checked={formData.status === 'INACTIVE'}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                            className="w-4 h-4 text-orange-600 bg-slate-100 border-slate-300 focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                          />
                          <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">Tạm ngừng</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {editingCategory ? 'Cập nhật danh mục' : 'Tạo danh mục'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-semibold"
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
    </AdminLayout>
  );
}
