'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import AddressSelector from '@/components/AddressSelector';

interface User {
  id: number;
  username: string;
  email: string;
  address: string;
  phoneNumber: string;
  avatarUrl?: string;
  role: string;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    address: '',
    phoneNumber: '',
    avatarUrl: '',
  });

  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = (await apiClient.getProfile()) as User;
      setUser(data);
      setFormData({
        username: data.username || '',
        email: data.email || '',
        address: data.address || '',
        phoneNumber: data.phoneNumber || '',
        avatarUrl: data.avatarUrl || '',
      });
    } catch (err) {
      setError('Không thể tải thông tin profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const updatedUser = (await apiClient.updateProfile(formData)) as User;
      setUser(updatedUser);
      setIsEditing(false);
      setSuccess('Cập nhật profile thành công!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật thất bại');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Mật khẩu mới không khớp');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.changePassword(passwordData.oldPassword, passwordData.newPassword);
      setShowPasswordModal(false);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Đổi mật khẩu thành công!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đổi mật khẩu thất bại');
    } finally {
      setUpdating(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        address: user.address || '',
        phoneNumber: user.phoneNumber || '',
        avatarUrl: user.avatarUrl || '',
      });
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

  if (!user) return null;

  const getRoleBadge = (role: string) => {
    const badges = {
      ADMIN: { bg: 'bg-gradient-to-r from-purple-500 to-pink-500', text: 'Quản trị viên', iconPath: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
      BUSINESS: { bg: 'bg-gradient-to-r from-blue-500 to-indigo-500', text: 'Doanh nghiệp', iconPath: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
      CUSTOMER: { bg: 'bg-gradient-to-r from-green-500 to-emerald-500', text: 'Khách hàng', iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    };
    return badges[role as keyof typeof badges] || badges.CUSTOMER;
  };

  const roleBadge = getRoleBadge(user.role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Trang cá nhân
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span className="hidden sm:inline">Cửa hàng</span>
              </Link>
              {(user.role === 'ADMIN' || user.role === 'BUSINESS') && (
                <Link
                  href="/admin"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="hidden sm:inline">Quản lý</span>
                </Link>
              )}
              <button
                onClick={() => apiClient.logout()}
                className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Notifications */}
        {success && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl shadow-lg animate-slide-up">
            <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
              <div className="p-2 bg-green-100 dark:bg-green-800/50 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-medium">{success}</span>
            </div>
          </div>
        )}

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

        {/* Profile Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-8 animate-slide-up">
          <div className="bg-white dark:bg-gray-800 p-8 text-gray-900 dark:text-white relative overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="relative group">
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 flex items-center justify-center text-5xl font-bold overflow-hidden ring-4 ring-blue-200 dark:ring-blue-800 shadow-2xl border border-blue-300 dark:border-blue-700">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <span className="text-blue-600 dark:text-blue-400 font-extrabold">{user.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      const avatarInput = document.getElementById('avatarUrlInput');
                      if (avatarInput) {
                        avatarInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        avatarInput.focus();
                      }
                    }}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    title="Click để chỉnh sửa avatar"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-4xl font-bold mb-3 drop-shadow-lg">{user.username}</h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                  <span className="px-4 py-1.5 bg-white/30 backdrop-blur-sm rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={roleBadge.iconPath} />
                    </svg>
                    <span>{roleBadge.text}</span>
                  </span>
                  <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Tham gia: {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-sm opacity-90">
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {user.email}
                  </div>
                  {user.phoneNumber && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {user.phoneNumber}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-6 py-4 font-semibold transition-all relative ${activeTab === 'info'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Thông tin cá nhân</span>
                </div>
                {activeTab === 'info' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-full"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`px-6 py-4 font-semibold transition-all relative ${activeTab === 'security'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Bảo mật</span>
                </div>
                {activeTab === 'security' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-full"></div>
                )}
              </button>
            </div>
          </div>

          {/* Tab Content: Info */}
          {activeTab === 'info' && (
            <form onSubmit={handleUpdateProfile} className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Thông tin chi tiết
                </h3>
                <div className="flex gap-3">
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Chỉnh sửa
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={updating}
                        className="px-6 py-2.5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 font-semibold"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={updating}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 font-semibold"
                      >
                        {updating ? (
                          <>
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Đang lưu...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Lưu thay đổi
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Username */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Tên đăng nhập
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-all"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-all"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    disabled={!isEditing}
                    placeholder="0123456789"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-all"
                  />
                </div>

                {/* Avatar URL */}
                <div className="space-y-2">
                  <label htmlFor="avatarUrlInput" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Avatar URL
                  </label>
                  <input
                    id="avatarUrlInput"
                    type="url"
                    value={formData.avatarUrl}
                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                    disabled={!isEditing}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-all"
                  />
                  {formData.avatarUrl && isEditing && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Xem trước avatar:</p>
                      <div className="flex items-center gap-3">
                        <img
                          src={formData.avatarUrl}
                          alt="Preview"
                          className="w-16 h-16 rounded-xl object-cover ring-2 ring-blue-200 dark:ring-blue-800"
                          onError={(e) => {
                            e.currentTarget.src = '';
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex-1 break-all">{formData.avatarUrl}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Address */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Địa chỉ
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={!isEditing}
                    rows={3}
                    placeholder="Nhập địa chỉ đầy đủ của bạn"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed resize-none transition-all"
                  />
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setShowAddressModal(true)}
                      className="mt-2 px-4 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg flex items-center gap-2 transition-colors font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Chọn địa chỉ từ danh sách tỉnh/thành
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}

          {/* Tab Content: Security */}
          {activeTab === 'security' && (
            <div className="p-8">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Cài đặt bảo mật
                </h3>

                <div className="space-y-6">
                  {/* Password Change Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-600 text-white rounded-xl">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-2">Đổi mật khẩu</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Bảo vệ tài khoản của bạn bằng cách thay đổi mật khẩu định kỳ. Mật khẩu phải có ít nhất 6 ký tự.
                        </p>
                        <button
                          onClick={() => setShowPasswordModal(true)}
                          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          Đổi mật khẩu
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Account Info Card */}
                  <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gray-600 text-white rounded-xl">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-2">Thông tin tài khoản</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">ID tài khoản:</span>
                            <span className="font-mono font-semibold">#{user.id}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">Vai trò:</span>
                            <span className={`px-3 py-1 ${roleBadge.bg} text-white rounded-full text-xs font-bold flex items-center gap-1`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={roleBadge.iconPath} />
                              </svg>
                              {roleBadge.text}
                            </span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-gray-600 dark:text-gray-400">Ngày tạo:</span>
                            <span className="font-semibold">{new Date(user.createdAt).toLocaleDateString('vi-VN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Address Selector Modal */}
          {showAddressModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Chọn địa chỉ
                    </h3>
                    <button
                      onClick={() => setShowAddressModal(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <AddressSelector
                    onAddressChange={(address) => {
                      setFormData({ ...formData, address: address.fullAddress });
                    }}
                    initialStreet=""
                    required={true}
                  />
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddressModal(false)}
                      className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-semibold"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.address) {
                          setShowAddressModal(false);
                        }
                      }}
                      disabled={!formData.address}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Xác nhận
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-8 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Liên kết nhanh
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <Link
                href="/orders"
                className="group flex items-center gap-4 p-5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all"
              >
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-xl group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-lg group-hover:text-blue-600 transition-colors">Đơn hàng</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Xem lịch sử mua hàng</p>
                </div>
              </Link>

              <Link
                href="/cart"
                className="group flex items-center gap-4 p-5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-green-500 dark:hover:border-green-500 hover:shadow-lg transition-all"
              >
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-xl group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-lg group-hover:text-green-600 transition-colors">Giỏ hàng</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Xem giỏ hàng của bạn</p>
                </div>
              </Link>

              <Link
                href="/"
                className="group flex items-center gap-4 p-5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-lg transition-all"
              >
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-lg group-hover:text-purple-600 transition-colors">Cửa hàng</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Mua sắm ngay</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 animate-slide-up">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold">Đổi mật khẩu</h2>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                  setError('');
                }}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                  required
                  placeholder="Nhập mật khẩu hiện tại"
                  className="w-full px-4 py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={6}
                  placeholder="Ít nhất 6 ký tự"
                  className="w-full px-4 py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-4 py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={updating}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 font-bold text-lg flex items-center justify-center gap-2"
                >
                  {updating ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Đổi mật khẩu
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
