'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import AddressSelector from '@/components/AddressSelector';
import {
  User,
  MapPin,
  Phone,
  Mail,
  Camera,
  ShieldCheck,
  Edit3,
  Save,
  X,
  LogOut,
  Store,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Key,
  CreditCard,
  ChevronRight,
  Loader2,
  Calendar,
  Settings
} from 'lucide-react';

interface UserProfile {
  id: number;
  username: string;
  fullName?: string;
  email: string;
  address: string;
  phoneNumber: string;
  avatarUrl?: string;
  role: string;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
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
      const data = (await apiClient.getProfile()) as UserProfile;
      setUser(data);
      setFormData({
        username: data.username || '',
        fullName: data.fullName || '',
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
      const updatedUser = (await apiClient.updateProfile(formData)) as UserProfile;
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
        fullName: user.fullName || '',
        email: user.email || '',
        address: user.address || '',
        phoneNumber: user.phoneNumber || '',
        avatarUrl: user.avatarUrl || '',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const getRoleBadge = (role: string) => {
    const badges = {
      ADMIN: { bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30', text: 'Quản trị viên', icon: ShieldCheck },
      BUSINESS: { bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', text: 'Doanh nghiệp', icon: Store },
      CUSTOMER: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', text: 'Khách hàng', icon: User },
    };
    return badges[role as keyof typeof badges] || badges.CUSTOMER;
  };

  const roleBadge = getRoleBadge(user.role);
  const RoleIcon = roleBadge.icon;

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
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Link>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Hồ sơ cá nhân
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="hidden sm:flex px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all items-center gap-2">
              <Store className="w-4 h-4" />
              Cửa hàng
            </Link>

            {(user.role === 'ADMIN' || user.role === 'BUSINESS') && (
              <Link href="/admin" className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg transition-all flex items-center gap-2 text-sm font-medium">
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Quản lý</span>
              </Link>
            )}

            <button
              onClick={() => apiClient.logout()}
              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">
        {/* Notifications */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <div className="p-2 bg-emerald-500/20 rounded-full">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-emerald-400 font-medium">{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <div className="p-2 bg-red-500/20 rounded-full">
              <X className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-red-400 font-medium">{error}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Sidebar Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#1A1D2D]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-50" />

              <div className="relative flex flex-col items-center text-center">
                <div className="relative mb-4 group-hover:scale-105 transition-transform duration-300">
                  <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-blue-500 to-purple-500">
                    <div className="w-full h-full rounded-full bg-[#050505] flex items-center justify-center overflow-hidden relative">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => document.getElementById('avatarUrlInput')?.focus()}
                      className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-500 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <h2 className="text-2xl font-bold text-white mb-1">{user.fullName || user.username}</h2>
                <p className="text-gray-400 mb-4">{user.email}</p>

                <div className={`px-4 py-1.5 rounded-full border ${roleBadge.bg} flex items-center gap-2 text-sm font-medium mb-6`}>
                  <RoleIcon className="w-4 h-4" />
                  {roleBadge.text}
                </div>

                <div className="w-full grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tham gia</p>
                    <p className="font-medium text-gray-300">
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-center border-l border-white/5">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Trạng thái</p>
                    <p className="font-medium text-emerald-400">Hoạt động</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats / Menu */}
            <div className="bg-[#1A1D2D]/60 backdrop-blur-md border border-white/5 rounded-2xl p-4 space-y-2">
              <button
                onClick={() => setActiveTab('info')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'info'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <User className="w-5 h-5" />
                <span className="font-medium">Thông tin cá nhân</span>
                {activeTab === 'info' && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'security'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <ShieldCheck className="w-5 h-5" />
                <span className="font-medium">Bảo mật & Mật khẩu</span>
                {activeTab === 'security' && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>

              <div className="h-px bg-white/5 my-2" />

              <Link
                href="/orders"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all"
              >
                <Package className="w-5 h-5" />
                <span className="font-medium">Đơn hàng của tôi</span>
              </Link>

              <Link
                href="/cart"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="font-medium">Giỏ hàng</span>
              </Link>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-8">
            <div className="bg-[#1A1D2D]/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden min-h-[600px]">
              {/* Info Tab */}
              {activeTab === 'info' && (
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">Thông tin chi tiết</h3>
                      <p className="text-gray-400">Quản lý thông tin cá nhân của bạn</p>
                    </div>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors flex items-center gap-2 font-medium"
                      >
                        <Edit3 className="w-4 h-4" />
                        Chỉnh sửa
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={cancelEdit}
                          disabled={updating}
                          className="px-4 py-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors font-medium"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handleUpdateProfile}
                          disabled={updating}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 font-medium shadow-lg shadow-blue-500/20"
                        >
                          {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Lưu
                        </button>
                      </div>
                    )}
                  </div>

                  <form className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Tên đăng nhập</label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                          <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            disabled={!isEditing}
                            className="w-full bg-[#050505]/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Họ và tên</label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-500 group-focus-within:text-blue-400">Aa</span>
                          </div>
                          <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            disabled={!isEditing}
                            placeholder="Chưa cập nhật"
                            className="w-full bg-[#050505]/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all placeholder:text-gray-600"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Email</label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            disabled={!isEditing}
                            className="w-full bg-[#050505]/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Số điện thoại</label>
                        <div className="relative group">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                          <input
                            type="tel"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            disabled={!isEditing}
                            placeholder="Chưa cập nhật"
                            className="w-full bg-[#050505]/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all placeholder:text-gray-600"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-medium text-gray-400">Avatar URL</label>
                        <div className="relative group">
                          <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                          <input
                            id="avatarUrlInput"
                            type="url"
                            value={formData.avatarUrl}
                            onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                            disabled={!isEditing}
                            placeholder="https://example.com/avatar.jpg"
                            className="w-full bg-[#050505]/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all placeholder:text-gray-600"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-400">Địa chỉ</label>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => setShowAddressModal(true)}
                              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                            >
                              <MapPin className="w-3 h-3" />
                              Chọn từ bản đồ
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <textarea
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            disabled={!isEditing}
                            rows={3}
                            placeholder="Chưa cập nhật địa chỉ"
                            className="w-full bg-[#050505]/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all placeholder:text-gray-600 resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="p-8">
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-white mb-2">Bảo mật & Mật khẩu</h3>
                    <p className="text-gray-400">Cập nhật mật khẩu và bảo vệ tài khoản</p>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl flex items-start gap-4">
                      <div className="p-3 bg-blue-500/20 rounded-lg shrink-0">
                        <Key className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-white mb-2">Đổi mật khẩu</h4>
                        <p className="text-sm text-gray-400 mb-4">
                          Nên thay đổi mật khẩu định kỳ để bảo đảm an toàn cho tài khoản. Mật khẩu mạnh cần có ít nhất 6 ký tự.
                        </p>
                        <button
                          onClick={() => setShowPasswordModal(true)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
                        >
                          Thay đổi ngay
                        </button>
                      </div>
                    </div>

                    <div className="p-6 bg-[#050505]/50 border border-white/5 rounded-xl">
                      <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-gray-400" />
                        Thông tin tài khoản
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-white/5">
                          <span className="text-gray-400">ID Tài khoản</span>
                          <span className="font-mono text-gray-200">#{user.id}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-white/5">
                          <span className="text-gray-400">Ngày tạo</span>
                          <span className="text-gray-200">{new Date(user.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-400">Lần đăng nhập cuối</span>
                          <span className="text-gray-200">Vừa mới truy cập</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in">
            <div className="bg-[#1A1D2D] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-white">Đổi mật khẩu</h2>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    value={passwordData.oldPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                    required
                    className="w-full bg-[#050505]/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Mật khẩu mới</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    className="w-full bg-[#050505]/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                    placeholder="Ít nhất 6 ký tự"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Xác nhận mật khẩu</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    className="w-full bg-[#050505]/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 px-4 py-3 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-medium shadow-lg shadow-blue-500/20"
                  >
                    Xác nhận
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Address Modal */}
        {showAddressModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in">
            <div className="bg-[#1A1D2D] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-8">
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#1A1D2D]">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  Chọn địa chỉ
                </h3>
                <button
                  onClick={() => setShowAddressModal(false)}
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-[#050505]/30">
                <div className="dark text-gray-200">
                  <AddressSelector
                    onAddressChange={(address) => {
                      setFormData({ ...formData, address: address.fullAddress });
                    }}
                    initialStreet=""
                    required={true}
                  />
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddressModal(false)}
                    className="flex-1 px-6 py-3 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.address) setShowAddressModal(false);
                    }}
                    disabled={!formData.address}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-medium shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Xác nhận địa chỉ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
