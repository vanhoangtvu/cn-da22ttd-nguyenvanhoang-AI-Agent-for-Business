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
      router.push('/shop');
      return;
    }

    setUserData(user);
    loadData(user);
  }, [router]);

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
      categoryId: categories[0]?.id || 0,
      imageUrls: [''],
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
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || formData.price <= 0 || formData.categoryId === 0) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full my-8">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                {editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h2>
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
    </AdminLayout>
  );
}
