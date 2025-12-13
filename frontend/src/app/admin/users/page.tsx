'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  accountStatus?: string;
  phoneNumber?: string;
  address?: string;
  avatarUrl?: string;
  createdAt: string;
}

export default function UserManagement() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newRole, setNewRole] = useState('');

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    BUSINESS: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    CUSTOMER: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  };

  const roleNames: Record<string, string> = {
    ADMIN: 'Quản trị viên',
    BUSINESS: 'Chủ doanh nghiệp',
    CUSTOMER: 'Khách hàng',
  };

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = apiClient.getUserData();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'BUSINESS')) {
      router.push('/admin');
      return;
    }

    setUserData(user);
    loadUsers();
  }, [router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('Không thể tải người dùng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, username: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa người dùng "${username}"? Hành động này không thể hoàn tác.`)) return;

    try {
      await apiClient.deleteUser(id);
      alert('Xóa người dùng thành công!');
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Không thể xóa người dùng. Vui lòng thử lại.');
    }
  };

  const handleViewDetail = (user: User) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  const handleChangeStatus = (user: User) => {
    setSelectedUser(user);
    setNewStatus(user.accountStatus || 'ACTIVE');
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedUser) return;

    try {
      await apiClient.updateAccountStatus(selectedUser.id, newStatus);
      alert('Cập nhật trạng thái thành công!');
      setShowStatusModal(false);
      loadUsers();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Không thể cập nhật trạng thái. Vui lòng thử lại.');
    }
  };

  const handleChangeRole = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    try {
      await apiClient.updateUserRole(selectedUser.id, newRole);
      alert('Cập nhật vai trò thành công!');
      setShowRoleModal(false);
      loadUsers();
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Không thể cập nhật vai trò. Vui lòng thử lại.');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phoneNumber && user.phoneNumber.includes(searchTerm));
    const matchesRole = filterRole === 'ALL' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const roleStats = {
    ADMIN: users.filter(u => u.role === 'ADMIN').length,
    BUSINESS: users.filter(u => u.role === 'BUSINESS').length,
    CUSTOMER: users.filter(u => u.role === 'CUSTOMER').length,
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
    <AdminLayout userData={userData} currentPage="users">
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Tổng người dùng</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{users.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Quản trị viên</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{roleStats.ADMIN}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Chủ doanh nghiệp</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{roleStats.BUSINESS}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Khách hàng</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{roleStats.CUSTOMER}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email, số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setFilterRole('ALL')}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  filterRole === 'ALL' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilterRole('ADMIN')}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  filterRole === 'ADMIN' 
                    ? roleColors.ADMIN 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => setFilterRole('BUSINESS')}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  filterRole === 'BUSINESS' 
                    ? roleColors.BUSINESS 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Business
              </button>
              <button
                onClick={() => setFilterRole('CUSTOMER')}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  filterRole === 'CUSTOMER' 
                    ? roleColors.CUSTOMER 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Customer
              </button>
            </div>
          </div>
          <div className="mt-4 text-gray-600 dark:text-gray-400">
            Tổng số: <span className="font-semibold text-purple-600">{filteredUsers.length}</span> người dùng
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Người dùng</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Số điện thoại</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Vai trò</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ngày tạo</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.avatarUrl || '/placeholder-avatar.png'} 
                          alt={user.username} 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">{user.username}</p>
                          {user.address && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{user.address}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{user.email}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{user.phoneNumber || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${roleColors[user.role]}`}>
                        {roleNames[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleViewDetail(user)}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                          title="Xem chi tiết"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {userData.role === 'ADMIN' && (
                          <button
                            onClick={() => handleChangeRole(user)}
                            disabled={user.id === userData.userId}
                            className={`px-3 py-2 rounded-lg transition-colors text-sm font-semibold ${
                              user.id === userData.userId
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700'
                            }`}
                            title="Đổi vai trò"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleChangeStatus(user)}
                          disabled={user.id === userData.userId}
                          className={`px-3 py-2 rounded-lg transition-colors text-sm font-semibold ${
                            user.id === userData.userId
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-yellow-600 text-white hover:bg-yellow-700'
                          }`}
                          title="Đổi trạng thái"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.username)}
                          disabled={user.id === userData.userId}
                          className={`px-3 py-2 rounded-lg transition-colors text-sm font-semibold ${
                            user.id === userData.userId
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                          title="Xóa"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">Không tìm thấy người dùng nào</p>
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Chi tiết người dùng</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <img 
                  src={selectedUser.avatarUrl || '/placeholder-avatar.png'} 
                  alt={selectedUser.username} 
                  className="w-24 h-24 rounded-full object-cover border-4 border-purple-500"
                />
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{selectedUser.username}</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${roleColors[selectedUser.role]}`}>
                    {roleNames[selectedUser.role]}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email</p>
                  <p className="font-semibold text-gray-800 dark:text-white">{selectedUser.email}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Số điện thoại</p>
                  <p className="font-semibold text-gray-800 dark:text-white">{selectedUser.phoneNumber || 'Chưa cập nhật'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Trạng thái tài khoản</p>
                  <p className="font-semibold text-gray-800 dark:text-white">{selectedUser.accountStatus || 'ACTIVE'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ngày tạo</p>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {new Date(selectedUser.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>

              {selectedUser.address && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Địa chỉ</p>
                  <p className="font-semibold text-gray-800 dark:text-white">{selectedUser.address}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Thay đổi vai trò</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Người dùng: <span className="font-semibold">{selectedUser.username}</span>
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Chọn vai trò mới
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="CUSTOMER">CUSTOMER - Khách hàng</option>
                  <option value="BUSINESS">BUSINESS - Chủ doanh nghiệp</option>
                  <option value="ADMIN">ADMIN - Quản trị viên</option>
                </select>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <div className="flex gap-2">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-red-800 dark:text-red-300">
                    <p className="font-semibold">Cảnh báo quan trọng!</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>ADMIN: Toàn quyền quản trị hệ thống</li>
                      <li>BUSINESS: Quản lý sản phẩm và đơn hàng</li>
                      <li>CUSTOMER: Chỉ có thể mua hàng</li>
                      <li>Thay đổi vai trò có thể ảnh hưởng đến quyền truy cập</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateRole}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Thay đổi trạng thái</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Người dùng: <span className="font-semibold">{selectedUser.username}</span>
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Chọn trạng thái mới
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="ACTIVE">ACTIVE - Hoạt động</option>
                  <option value="INACTIVE">INACTIVE - Không hoạt động</option>
                  <option value="SUSPENDED">SUSPENDED - Tạm khóa</option>
                  <option value="BANNED">BANNED - Cấm vĩnh viễn</option>
                </select>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <div className="flex gap-2">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-yellow-800 dark:text-yellow-300">
                    <p className="font-semibold">Lưu ý:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>SUSPENDED: Người dùng tạm thời không thể đăng nhập</li>
                      <li>BANNED: Người dùng bị cấm vĩnh viễn</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateStatus}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
