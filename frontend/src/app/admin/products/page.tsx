'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  imageUrls: string[];
  status: string;
  categoryId: number;
  categoryName: string;
  sellerId: number;
  sellerUsername: string;
  details?: string; // JSON string containing detailed product specifications
}

interface Category {
  id: number;
  name: string;
  description?: string;
}

export default function ProductManagement() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    quantity: 0,
    categoryId: 0,
    imageUrls: [''],
    details: '',
  });

  const addImageUrl = () => {
    setFormData({ ...formData, imageUrls: [...formData.imageUrls, ''] });
  };

  const removeImageUrl = (index: number) => {
    const newUrls = formData.imageUrls.filter((_, i) => i !== index);
    setFormData({ ...formData, imageUrls: newUrls.length > 0 ? newUrls : [''] });
  };

  const updateImageUrl = (index: number, value: string) => {
    const newUrls = [...formData.imageUrls];
    newUrls[index] = value;
    setFormData({ ...formData, imageUrls: newUrls });
  };

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
    loadData(user);
  }, [router]);

  // Thêm event listener cho phím ESC
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showModal) {
          setShowModal(false);
        }
        if (showPreviewModal) {
          setShowPreviewModal(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showModal, showPreviewModal]);

  const loadData = async (user: any) => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        user.role === 'ADMIN' 
          ? apiClient.getAdminProducts() 
          : apiClient.getProductsBySeller(user.userId),
        apiClient.getAdminCategories(),
      ]);
      setProducts(productsData as Product[]);
      setCategories(categoriesData as Category[]);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      quantity: 0,
      categoryId: 0,
      imageUrls: [''],
      details: '',
    });
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      categoryId: product.categoryId,
      imageUrls: product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls : [''],
      details: product.details || '',
    });
    setShowModal(true);
  };

  const openPreviewModal = (product: Product) => {
    setPreviewProduct(product);
    setShowPreviewModal(true);
  };

  const closePreviewModal = () => {
    setPreviewProduct(null);
    setShowPreviewModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || formData.price <= 0 || formData.categoryId === 0) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    // Validate JSON format for details if provided
    if (formData.details && formData.details.trim()) {
      try {
        JSON.parse(formData.details);
      } catch (error) {
        alert('Định dạng JSON cho chi tiết sản phẩm không hợp lệ. Vui lòng kiểm tra lại!');
        return;
      }
    }

    try {
      if (editingProduct) {
        await apiClient.updateProduct(editingProduct.id, formData);
        alert('Cập nhật sản phẩm thành công!');
      } else {
        await apiClient.createProduct(formData);
        alert('Tạo sản phẩm thành công!');
      }
      setShowModal(false);
      loadData(userData);
    } catch (error: any) {
      console.error('Failed to save product:', error);
      alert(error.message || 'Không thể lưu sản phẩm. Vui lòng thử lại.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;

    try {
      await apiClient.deleteProduct(id);
      alert('Xóa sản phẩm thành công!');
      loadData(userData);
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Không thể xóa sản phẩm. Vui lòng thử lại.');
    }
  };

  const handleStatusChange = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    try {
      await apiClient.updateProductStatus(id, newStatus);
      alert('Cập nhật trạng thái thành công!');
      loadData(userData);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Không thể cập nhật trạng thái. Vui lòng thử lại.');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.categoryId === filterCategory;
    const matchesStatus = filterStatus === 'ALL' || product.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
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
    <AdminLayout userData={userData} currentPage="products">
      <main className="container mx-auto px-4 py-8">
        {/* Filters and Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white flex-1"
              />
              <select
                value={filterCategory || ''}
                onChange={(e) => setFilterCategory(e.target.value ? Number(e.target.value) : null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Tất cả danh mục</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Vô hiệu hóa</option>
              </select>
            </div>
            <button
              onClick={openCreateModal}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Thêm sản phẩm mới
            </button>
          </div>
          <div className="mt-4 text-gray-600 dark:text-gray-400">
            Tổng số: <span className="font-semibold text-purple-600">{filteredProducts.length}</span> sản phẩm
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sản phẩm</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Danh mục</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Giá</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Kho</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Chi tiết</th>
                  {userData.role === 'ADMIN' && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Người bán</th>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img src={product.imageUrls?.[0] || '/placeholder.png'} alt={product.name} className="w-16 h-16 object-cover rounded-lg" />
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">{product.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{product.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{product.categoryName}</td>
                    <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        product.quantity > 10 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 
                        product.quantity > 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : 
                        'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {product.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {product.details && product.details.trim() ? (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-medium rounded-md">
                              Có thông tin
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              try {
                                const parsedDetails = JSON.parse(product.details!);
                                const formattedDetails = JSON.stringify(parsedDetails, null, 2);
                                
                                // Tạo modal để hiển thị chi tiết
                                const modal = document.createElement('div');
                                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
                                modal.innerHTML = `
                                  <div class="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
                                    <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Chi tiết sản phẩm: ${product.name}</h3>
                                      <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                      </button>
                                    </div>
                                    <div class="p-4 overflow-y-auto max-h-[60vh]">
                                      <pre class="text-sm text-gray-700 dark:text-gray-300 font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">${formattedDetails}</pre>
                                    </div>
                                  </div>
                                `;
                                document.body.appendChild(modal);
                              } catch {
                                alert('Không thể hiển thị dữ liệu chi tiết - định dạng JSON không hợp lệ');
                              }
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline font-medium transition-colors"
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span className="px-2 py-1 bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 text-xs font-medium rounded-md">
                            Chưa có thông tin
                          </span>
                        </div>
                      )}
                    </td>
                    {userData.role === 'ADMIN' && (
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{product.sellerUsername}</td>
                    )}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleStatusChange(product.id, product.status)}
                        className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                          product.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {product.status === 'ACTIVE' ? 'Hoạt động' : 'Vô hiệu'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openPreviewModal(product)}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg transition-colors"
                          title="Xem trước"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
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
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">Không tìm thấy sản phẩm nào</p>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => {
            // Đóng modal khi click vào backdrop
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full mt-4 mb-8">
            {/* Modal Header with Close Button */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                {editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Đóng"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Form */}
                <div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                        Tên sản phẩm <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Nhập tên sản phẩm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                        Mô tả <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Nhập mô tả chi tiết về sản phẩm"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                          Giá (VNĐ) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                          min="0"
                          placeholder="0"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                          Số lượng <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                          min="0"
                          placeholder="0"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                        Danh mục <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        required
                      >
                        <option value={0}>Chọn danh mục</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Product Details Section - Enhanced UI */}
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                        Chi tiết sản phẩm
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 font-normal">
                          - Tùy chọn (dễ dàng nhập thông tin)
                        </span>
                      </label>

                      {/* Template Selection */}
                      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center mb-3">
                          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                            T
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                              Template thông tin chi tiết
                            </h4>
                            <p className="text-xs text-blue-600 dark:text-blue-300">
                              Chọn template phù hợp với loại sản phẩm để điền thông tin nhanh chóng
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                details: JSON.stringify({
                                  "brand": "Samsung",
                                  "model": "Galaxy S24",
                                  "storage": "256GB",
                                  "color": "Đen titan",
                                  "warranty": "24 tháng",
                                  "features": ["5G", "Camera 200MP", "Sạc nhanh 45W", "Chống nước IP68"],
                                  "specifications": {
                                    "screen": "6.8 inch Dynamic AMOLED",
                                    "processor": "Snapdragon 8 Gen 3",
                                    "ram": "12GB",
                                    "camera": "200MP + 50MP + 12MP",
                                    "battery": "5000mAh",
                                    "os": "Android 14"
                                  },
                                  "connectivity": ["WiFi 7", "Bluetooth 5.3", "NFC", "USB-C"],
                                  "dimensions": "162.3 x 79 x 8.6 mm",
                                  "weight": "232g"
                                }, null, 2)
                              });
                            }}
                            className="p-3 text-left bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-800/20 transition-all duration-200 group"
                          >
                            <div className="flex items-center mb-2">
                              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded text-white flex items-center justify-center text-xs font-bold mr-2">
                                P
                              </div>
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Điện thoại</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Thông số kỹ thuật cho smartphone
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                details: JSON.stringify({
                                  "brand": "Apple",
                                  "model": "MacBook Air M3",
                                  "storage": "512GB SSD",
                                  "color": "Xanh không gian",
                                  "warranty": "12 tháng",
                                  "features": ["Touch ID", "Magic Keyboard", "Force Touch trackpad", "Thunderbolt 4"],
                                  "specifications": {
                                    "screen": "13.6 inch Liquid Retina",
                                    "processor": "Apple M3",
                                    "ram": "16GB",
                                    "graphics": "10-core GPU",
                                    "battery": "18 giờ",
                                    "os": "macOS Sonoma"
                                  },
                                  "connectivity": ["WiFi 6E", "Bluetooth 5.3", "2x Thunderbolt 4"],
                                  "dimensions": "304 x 215 x 11.3 mm",
                                  "weight": "1.24kg"
                                }, null, 2)
                              });
                            }}
                            className="p-3 text-left bg-white dark:bg-gray-700 border border-green-200 dark:border-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-800/20 transition-all duration-200 group"
                          >
                            <div className="flex items-center mb-2">
                              <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded text-white flex items-center justify-center text-xs font-bold mr-2">
                                L
                              </div>
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Laptop</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Thông số laptop và máy tính
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                details: JSON.stringify({
                                  "brand": "Sony",
                                  "model": "WH-1000XM5",
                                  "type": "Over-ear",
                                  "color": "Đen",
                                  "warranty": "12 tháng",
                                  "features": ["Chống ồn chủ động", "LDAC", "Quick Charge", "Multipoint"],
                                  "specifications": {
                                    "driver": "30mm",
                                    "frequency": "4Hz - 40kHz",
                                    "battery": "30 giờ",
                                    "charging": "USB-C",
                                    "weight": "250g"
                                  },
                                  "connectivity": ["Bluetooth 5.2", "NFC", "3.5mm jack", "USB-C"],
                                  "accessories": ["Cáp USB-C", "Cáp 3.5mm", "Túi đựng"]
                                }, null, 2)
                              });
                            }}
                            className="p-3 text-left bg-white dark:bg-gray-700 border border-purple-200 dark:border-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-800/20 transition-all duration-200 group"
                          >
                            <div className="flex items-center mb-2">
                              <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded text-white flex items-center justify-center text-xs font-bold mr-2">
                                A
                              </div>
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Tai nghe</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Thông số âm thanh và phụ kiện
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, details: '' })}
                            className="p-3 text-left bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 group"
                          >
                            <div className="flex items-center mb-2">
                              <div className="w-6 h-6 bg-gradient-to-br from-gray-400 to-gray-500 rounded text-white flex items-center justify-center text-xs font-bold mr-2">
                                ×
                              </div>
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Xóa</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Xóa nội dung hiện tại
                            </p>
                          </button>
                        </div>
                      </div>

                      {/* Enhanced Form Interface */}
                      <div className="space-y-4">
                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Thương hiệu
                            </label>
                            <input
                              type="text"
                              value={(() => {
                                try {
                                  const details = JSON.parse(formData.details || '{}');
                                  return details.brand || '';
                                } catch {
                                  return '';
                                }
                              })()}
                              onChange={(e) => {
                                try {
                                  const details = JSON.parse(formData.details || '{}');
                                  details.brand = e.target.value;
                                  setFormData({ ...formData, details: JSON.stringify(details, null, 2) });
                                } catch {
                                  const details = { brand: e.target.value };
                                  setFormData({ ...formData, details: JSON.stringify(details, null, 2) });
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                              placeholder="Ví dụ: Samsung, Apple, Sony..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Model/SKU
                            </label>
                            <input
                              type="text"
                              value={(() => {
                                try {
                                  const details = JSON.parse(formData.details || '{}');
                                  return details.model || '';
                                } catch {
                                  return '';
                                }
                              })()}
                              onChange={(e) => {
                                try {
                                  const details = JSON.parse(formData.details || '{}');
                                  details.model = e.target.value;
                                  setFormData({ ...formData, details: JSON.stringify(details, null, 2) });
                                } catch {
                                  const details = { model: e.target.value };
                                  setFormData({ ...formData, details: JSON.stringify(details, null, 2) });
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                              placeholder="Ví dụ: Galaxy S24, MacBook Air M3..."
                            />
                          </div>
                        </div>

                        {/* Color and Warranty */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Màu sắc
                            </label>
                            <input
                              type="text"
                              value={(() => {
                                try {
                                  const details = JSON.parse(formData.details || '{}');
                                  return details.color || '';
                                } catch {
                                  return '';
                                }
                              })()}
                              onChange={(e) => {
                                try {
                                  const details = JSON.parse(formData.details || '{}');
                                  details.color = e.target.value;
                                  setFormData({ ...formData, details: JSON.stringify(details, null, 2) });
                                } catch {
                                  const details = { color: e.target.value };
                                  setFormData({ ...formData, details: JSON.stringify(details, null, 2) });
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                              placeholder="Ví dụ: Đen, Trắng, Xanh..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Bảo hành
                            </label>
                            <input
                              type="text"
                              value={(() => {
                                try {
                                  const details = JSON.parse(formData.details || '{}');
                                  return details.warranty || '';
                                } catch {
                                  return '';
                                }
                              })()}
                              onChange={(e) => {
                                try {
                                  const details = JSON.parse(formData.details || '{}');
                                  details.warranty = e.target.value;
                                  setFormData({ ...formData, details: JSON.stringify(details, null, 2) });
                                } catch {
                                  const details = { warranty: e.target.value };
                                  setFormData({ ...formData, details: JSON.stringify(details, null, 2) });
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                              placeholder="Ví dụ: 12 tháng, 24 tháng..."
                            />
                          </div>
                        </div>

                        {/* Features */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tính năng nổi bật
                          </label>
                          <div className="space-y-2">
                            {(() => {
                              try {
                                const details = JSON.parse(formData.details || '{}');
                                const features = details.features || [];
                                return features.map((feature: string, index: number) => (
                                  <div key={index} className="flex gap-2">
                                    <input
                                      type="text"
                                      value={feature}
                                      onChange={(e) => {
                                        const newFeatures = [...features];
                                        newFeatures[index] = e.target.value;
                                        details.features = newFeatures;
                                        setFormData({ ...formData, details: JSON.stringify(details, null, 2) });
                                      }}
                                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                      placeholder={`Tính năng ${index + 1}`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newFeatures = features.filter((_: string, i: number) => i !== index);
                                        details.features = newFeatures;
                                        setFormData({ ...formData, details: JSON.stringify(details, null, 2) });
                                      }}
                                      className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 rounded-lg transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                ));
                              } catch {
                                return null;
                              }
                            })()}
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  const details = JSON.parse(formData.details || '{}');
                                  const features = details.features || [];
                                  details.features = [...features, ''];
                                  setFormData({ ...formData, details: JSON.stringify(details, null, 2) });
                                } catch {
                                  const details = { features: [''] };
                                  setFormData({ ...formData, details: JSON.stringify(details, null, 2) });
                                }
                              }}
                              className="w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-green-500 hover:text-green-500 transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Thêm tính năng
                            </button>
                          </div>
                        </div>

                        {/* Specifications */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Thông số kỹ thuật
                          </label>
                          <div className="space-y-2">
                            {(() => {
                              try {
                                const details = JSON.parse(formData.details || '{}');
                                const specs = details.specifications || {};
                                return Object.entries(specs).map(([key, value]: [string, any], index: number) => (
                                  <div key={index} className="flex gap-2">
                                    <input
                                      type="text"
                                      value={key}
                                      onChange={(e) => {
                                        const newSpecs = { ...specs };
                                        delete newSpecs[key];
                                        newSpecs[e.target.value] = value;
                                        details.specifications = newSpecs;
                                        setFormData({ ...formData, details: JSON.stringify(details, null, 2) });
                                      }}
                                      className="w-1/3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                      placeholder="Tên thông số"
                                    />
                                    <input
                                      type="text"
                                      value={value}
                                      onChange={(e) => {
                                        const newSpecs = { ...specs };
                                        newSpecs[key] = e.target.value;
                                        details.specifications = newSpecs;
                                        setFormData({ ...formData, details: JSON.stringify(details, null, 2) });
                                      }}
                                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                      placeholder="Giá trị"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newSpecs = { ...specs };
                                        delete newSpecs[key];
                                        details.specifications = newSpecs;
                                        setFormData({ ...formData, details: JSON.stringify(details, null, 2) });
                                      }}
                                      className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 rounded-lg transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                ));
                              } catch {
                                return null;
                              }
                            })()}
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  const details = JSON.parse(formData.details || '{}');
                                  const specs = details.specifications || {};
                                  details.specifications = { ...specs, '': '' };
                                  setFormData({ ...formData, details: JSON.stringify(details, null, 2) });
                                } catch {
                                  const details = { specifications: { '': '' } };
                                  setFormData({ ...formData, details: JSON.stringify(details, null, 2) });
                                }
                              }}
                              className="w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-green-500 hover:text-green-500 transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Thêm thông số
                            </button>
                          </div>
                        </div>

                        {/* Raw JSON Editor (Advanced) */}
                        <div className="mt-6">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              JSON nâng cao (cho người dùng có kinh nghiệm)
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  const parsed = JSON.parse(formData.details || '{}');
                                  setFormData({ ...formData, details: JSON.stringify(parsed, null, 2) });
                                } catch (e) {
                                  alert('JSON không hợp lệ: ' + e);
                                }
                              }}
                              className="px-3 py-1 bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 rounded text-xs font-medium transition-colors"
                            >
                              Format JSON
                            </button>
                          </div>
                          <textarea
                            value={formData.details}
                            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                            rows={8}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm resize-vertical"
                            placeholder='Nhập thông tin chi tiết dưới dạng JSON...

Ví dụ cấu trúc JSON:
{
  "brand": "Tên thương hiệu",
  "model": "Tên model",
  "color": "Màu sắc",
  "warranty": "Thời gian bảo hành",
  "features": ["Tính năng 1", "Tính năng 2"],
  "specifications": {
    "key": "value"
  }
}'
                          />
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                        <div className="flex items-start gap-2">
                          <div className="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                            i
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                              Lợi ích của việc nhập thông tin chi tiết
                            </h5>
                            <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                              <li>• Hệ thống AI có thể tư vấn khách hàng chính xác hơn</li>
                              <li>• Khách hàng dễ dàng so sánh các sản phẩm</li>
                              <li>• Tăng độ tin cậy và chuyên nghiệp của cửa hàng</li>
                              <li>• Hỗ trợ tìm kiếm và lọc sản phẩm hiệu quả</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Images Section */}
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                        Hình ảnh sản phẩm
                      </label>
                      <div className="space-y-3">
                        {formData.imageUrls.map((url, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="url"
                              value={url}
                              onChange={(e) => updateImageUrl(index, e.target.value)}
                              placeholder={`URL hình ảnh ${index + 1}`}
                              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                            />
                            {formData.imageUrls.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeImageUrl(index)}
                                className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 rounded-lg transition-colors"
                                title="Xóa"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addImageUrl}
                          className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-purple-500 hover:text-purple-500 transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Thêm hình ảnh
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Hình ảnh đầu tiên sẽ là hình đại diện. Bạn có thể thêm tối đa 5 hình ảnh.
                      </p>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="submit"
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                      >
                        {editingProduct ? 'Cập nhật' : 'Tạo mới'}
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

                {/* Right Column - Preview */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Xem trước</h3>
                  
                  {/* Product Card Preview */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 space-y-4">
                    {/* Image Preview */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                      {formData.imageUrls.filter(url => url.trim()).length > 0 ? (
                        <div>
                          <img 
                            src={formData.imageUrls[0] || '/placeholder.png'} 
                            alt="Preview" 
                            className="w-full h-64 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.png';
                            }}
                          />
                          {formData.imageUrls.filter(url => url.trim()).length > 1 && (
                            <div className="grid grid-cols-4 gap-2 p-2 bg-gray-100 dark:bg-gray-700">
                              {formData.imageUrls.filter(url => url.trim()).slice(0, 4).map((url, idx) => (
                                <img 
                                  key={idx}
                                  src={url || '/placeholder.png'} 
                                  alt={`Preview ${idx + 1}`}
                                  className="w-full h-16 object-cover rounded"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder.png';
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-64 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                          <div className="text-center text-gray-400">
                            <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm">Chưa có hình ảnh</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Product Info Preview */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                        {formData.name || 'Tên sản phẩm'}
                      </h4>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded-full text-sm font-semibold">
                          {categories.find(c => c.id === formData.categoryId)?.name || 'Danh mục'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          formData.quantity > 10 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 
                          formData.quantity > 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : 
                          'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          Kho: {formData.quantity}
                        </span>
                      </div>

                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-3">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(formData.price)}
                      </p>

                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">
                        {formData.description || 'Mô tả sản phẩm sẽ hiển thị ở đây...'}
                      </p>

                      <button className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold">
                        Thêm vào giỏ hàng
                      </button>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                      <p className="text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span><strong>Lưu ý:</strong> Đây là giao diện xem trước. Khách hàng sẽ thấy sản phẩm của bạn như thế này.</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Preview Modal */}
      {showPreviewModal && previewProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Xem trước sản phẩm</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Giao diện hiển thị cho khách hàng
                </p>
              </div>
              <button
                onClick={closePreviewModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Product Images */}
                <div className="space-y-4">
                  {/* Main Image */}
                  <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden">
                    {previewProduct.imageUrls && previewProduct.imageUrls.length > 0 && previewProduct.imageUrls[0] ? (
                      <img
                        src={previewProduct.imageUrls[0]}
                        alt={previewProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-lg">Chưa có hình ảnh</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Images */}
                  {previewProduct.imageUrls && previewProduct.imageUrls.length > 1 && (
                    <div className="flex gap-3 overflow-x-auto">
                      {previewProduct.imageUrls.map((url, index) => (
                        url && (
                          <div key={index} className="flex-shrink-0 w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border-2 border-transparent hover:border-purple-500 cursor-pointer transition-colors">
                            <img
                              src={url}
                              alt={`${previewProduct.name} ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column - Product Info */}
                <div className="space-y-6">
                  {/* Product Title & Category */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded-full text-sm font-semibold">
                        {previewProduct.categoryName}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        previewProduct.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {previewProduct.status === 'ACTIVE' ? 'Có sẵn' : 'Không khả dụng'}
                      </span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {previewProduct.name}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {previewProduct.description}
                    </p>
                  </div>

                  {/* Price & Stock */}
                  <div className="border-t border-b border-gray-200 dark:border-gray-700 py-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(previewProduct.price)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Đã bao gồm VAT
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${
                          previewProduct.quantity > 10 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : previewProduct.quantity > 0 
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <span className="font-semibold">Kho: {previewProduct.quantity}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Người bán: <span className="font-medium text-gray-700 dark:text-gray-300">{previewProduct.sellerUsername}</span>
                    </div>
                  </div>

                  {/* Product Details JSON */}
                  {previewProduct.details && previewProduct.details.trim() && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Thông số kỹ thuật</h3>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <ProductDetailsDisplay details={previewProduct.details} />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-6">
                    <button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l-2.5 5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
                      </svg>
                      Thêm vào giỏ hàng
                    </button>
                    <button className="px-6 py-3 border border-purple-300 text-purple-600 dark:border-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// Component to display formatted product details
function ProductDetailsDisplay({ details }: { details: string }) {
  try {
    const parsedDetails = JSON.parse(details);
    
    return (
      <div className="space-y-4">
        {/* Basic Info */}
        {(parsedDetails.brand || parsedDetails.model || parsedDetails.color) && (
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Thông tin cơ bản</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {parsedDetails.brand && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Thương hiệu:</span>
                  <span className="font-medium">{parsedDetails.brand}</span>
                </div>
              )}
              {parsedDetails.model && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Model:</span>
                  <span className="font-medium">{parsedDetails.model}</span>
                </div>
              )}
              {parsedDetails.color && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Màu sắc:</span>
                  <span className="font-medium">{parsedDetails.color}</span>
                </div>
              )}
              {parsedDetails.warranty && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Bảo hành:</span>
                  <span className="font-medium">{parsedDetails.warranty}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Features */}
        {parsedDetails.features && Array.isArray(parsedDetails.features) && (
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Tính năng nổi bật</h4>
            <div className="flex flex-wrap gap-2">
              {parsedDetails.features.map((feature: string, index: number) => (
                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-md text-xs">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Specifications */}
        {parsedDetails.specifications && typeof parsedDetails.specifications === 'object' && (
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Thông số kỹ thuật</h4>
            <div className="space-y-2 text-sm">
              {Object.entries(parsedDetails.specifications).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <span className="text-gray-500 dark:text-gray-400 capitalize">{key}:</span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connectivity */}
        {parsedDetails.connectivity && Array.isArray(parsedDetails.connectivity) && (
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Kết nối</h4>
            <div className="flex flex-wrap gap-2">
              {parsedDetails.connectivity.map((conn: string, index: number) => (
                <span key={index} className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-md text-xs">
                  {conn}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Accessories */}
        {parsedDetails.accessories && Array.isArray(parsedDetails.accessories) && (
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Phụ kiện đi kèm</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              {parsedDetails.accessories.map((accessory: string, index: number) => (
                <li key={index} className="text-gray-600 dark:text-gray-400">{accessory}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Dimensions & Weight */}
        {(parsedDetails.dimensions || parsedDetails.weight) && (
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Kích thước & Trọng lượng</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {parsedDetails.dimensions && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Kích thước:</span>
                  <span className="font-medium">{parsedDetails.dimensions}</span>
                </div>
              )}
              {parsedDetails.weight && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Trọng lượng:</span>
                  <span className="font-medium">{parsedDetails.weight}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
        Không thể hiển thị thông tin chi tiết - dữ liệu không hợp lệ
      </div>
    );
  }
}
