# 🚀 Kế hoạch cải thiện trang Quản lý AI Agent Chat

## 📋 Tổng quan
File hiện tại: `frontend/src/app/admin/ai-agent-chat/page.tsx` (1228 dòng)
Mục tiêu: Refactor và nâng cấp toàn diện với UI/UX hiện đại, performance tốt hơn, và features mới.

---

## 🎯 Phase 1: Component Restructuring (Ưu tiên cao)

### 1.1. Tách components nhỏ
Tạo folder: `frontend/src/components/admin/chat-agent/`

```
chat-agent/
├── StatsCards.tsx          # 4 stat cards
├── TabNavigation.tsx       # Tab switcher
├── RedisTab/
│   ├── index.tsx
│   ├── UserTable.tsx
│   ├── SessionDetails.tsx
│   └── SearchBar.tsx
├── ChromaTab/
│   ├── index.tsx
│   ├── CollectionsTable.tsx
│   └── CollectionDetails.tsx
├── ModalConfigTab/
│   ├── index.tsx
│   └── ConfigForm.tsx
├── RAGTab/
│   ├── index.tsx
│   └── RAGStats.tsx
└── shared/
    ├── LoadingSkeleton.tsx
    ├── EmptyState.tsx
    └── ConfirmDialog.tsx
```

---

## 🎨 Phase 2: UI/UX Enhancements

### 2.1. Stats Cards với Trends
```tsx
// StatsCards.tsx
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: { value: number; direction: 'up' | 'down' };
}

// Thêm trend indicators
<div className="flex items-center gap-2 mt-2">
  {trend && (
    <span className={`flex items-center text-sm ${
      trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
    }`}>
      {trend.direction === 'up' ? '↗️' : '↘️'} {trend.value}%
    </span>
  )}
</div>
```

### 2.2. Loading Skeletons
```tsx
// LoadingSkeleton.tsx
export const TableSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
    ))}
  </div>
);

export const CardSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
  </div>
);
```

### 2.3. Empty States
```tsx
// EmptyState.tsx
export const EmptyState = ({ 
  icon, 
  title, 
  description, 
  action 
}: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="w-24 h-24 mb-4 text-gray-300">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      {title}
    </h3>
    <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
      {description}
    </p>
    {action}
  </div>
);
```

### 2.4. Modern Confirm Dialog
```tsx
// ConfirmDialog.tsx
export const ConfirmDialog = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  type = 'danger' 
}: ConfirmDialogProps) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          {type === 'danger' && (
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          )}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white transition-colors ${
              type === 'danger' 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 📊 Phase 3: Data Visualization

### 3.1. Install Chart Library
```bash
npm install recharts
# hoặc
npm install chart.js react-chartjs-2
```

### 3.2. Messages Over Time Chart
```tsx
// components/admin/chat-agent/charts/MessagesChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const MessagesChart = ({ data }: { data: any[] }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
      📈 Tin nhắn theo thời gian
    </h3>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line 
          type="monotone" 
          dataKey="messages" 
          stroke="#8b5cf6" 
          strokeWidth={2}
          dot={{ fill: '#8b5cf6' }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);
```

### 3.3. Top Users Chart
```tsx
// components/admin/chat-agent/charts/TopUsersChart.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const TopUsersChart = ({ users }: { users: UserChatHistory[] }) => {
  const topUsers = users
    .sort((a, b) => b.total_messages - a.total_messages)
    .slice(0, 10)
    .map(u => ({
      userId: u.user_id.slice(0, 8) + '...',
      messages: u.total_messages
    }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        👥 Top 10 người dùng tích cực
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={topUsers}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="userId" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="messages" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
```

---

## 🔍 Phase 4: Advanced Search & Filters

### 4.1. Enhanced Search Component
```tsx
// components/admin/chat-agent/RedisTab/AdvancedSearch.tsx
import { useState } from 'react';
import { Search, Filter, Calendar } from 'lucide-react';

interface SearchFilters {
  query: string;
  minMessages: number;
  maxMessages: number;
  dateFrom: string;
  dateTo: string;
  sessionStatus: 'all' | 'active' | 'inactive';
}

export const AdvancedSearch = ({ onFilter }: { onFilter: (filters: SearchFilters) => void }) => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    minMessages: 0,
    maxMessages: 1000,
    dateFrom: '',
    dateTo: '',
    sessionStatus: 'all'
  });
  
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm theo User ID..."
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 rounded-lg border transition-colors ${
            showFilters 
              ? 'bg-blue-600 text-white border-blue-600' 
              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
          }`}
        >
          <Filter size={20} />
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Min Messages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tin nhắn tối thiểu
              </label>
              <input
                type="number"
                value={filters.minMessages}
                onChange={(e) => setFilters({ ...filters, minMessages: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Max Messages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tin nhắn tối đa
              </label>
              <input
                type="number"
                value={filters.maxMessages}
                onChange={(e) => setFilters({ ...filters, maxMessages: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Từ ngày
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Đến ngày
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Session Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Trạng thái phiên
            </label>
            <div className="flex gap-2">
              {['all', 'active', 'inactive'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilters({ ...filters, sessionStatus: status as any })}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filters.sessionStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {status === 'all' ? 'Tất cả' : status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                </button>
              ))}
            </div>
          </div>

          {/* Apply Filters */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setFilters({
                  query: '',
                  minMessages: 0,
                  maxMessages: 1000,
                  dateFrom: '',
                  dateTo: '',
                  sessionStatus: 'all'
                });
                onFilter({
                  query: '',
                  minMessages: 0,
                  maxMessages: 1000,
                  dateFrom: '',
                  dateTo: '',
                  sessionStatus: 'all'
                });
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Xóa bộ lọc
            </button>
            <button
              onClick={() => onFilter(filters)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## ⚡ Phase 5: Performance Optimization

### 5.1. Pagination Component
```tsx
// components/admin/chat-agent/shared/Pagination.tsx
export const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: PaginationProps) => (
  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
    <div className="text-sm text-gray-600 dark:text-gray-400">
      Trang {currentPage} / {totalPages}
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
      >
        ← Trước
      </button>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
      >
        Sau →
      </button>
    </div>
  </div>
);
```

### 5.2. Use Pagination in UserTable
```tsx
// Trong RedisTab/UserTable.tsx
const ITEMS_PER_PAGE = 20;
const [currentPage, setCurrentPage] = useState(1);

const paginatedUsers = useMemo(() => {
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
}, [filteredUsers, currentPage]);

const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
```

---

## 🎁 Phase 6: New Features

### 6.1. Export to CSV
```tsx
// utils/exportCSV.ts
export const exportToCSV = (data: any[], filename: string) => {
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => row[h]).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString()}.csv`;
  link.click();
};

// Sử dụng
<button
  onClick={() => exportToCSV(users, 'chat_users')}
  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
>
  📥 Export CSV
</button>
```

### 6.2. Bulk Actions
```tsx
// components/admin/chat-agent/RedisTab/BulkActions.tsx
const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

const handleSelectAll = () => {
  if (selectedUsers.size === users.length) {
    setSelectedUsers(new Set());
  } else {
    setSelectedUsers(new Set(users.map(u => u.user_id)));
  }
};

const handleBulkDelete = async () => {
  // Delete all selected users
  for (const userId of selectedUsers) {
    await handleDeleteUserData(userId);
  }
  setSelectedUsers(new Set());
};

// UI
{selectedUsers.size > 0 && (
  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center justify-between">
    <span className="text-blue-700 dark:text-blue-300">
      Đã chọn {selectedUsers.size} người dùng
    </span>
    <button
      onClick={handleBulkDelete}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
    >
      🗑️ Xóa tất cả
    </button>
  </div>
)}
```

---

## 📱 Phase 7: Responsive Design

### 7.1. Mobile-friendly Tables
```tsx
// Thay table bằng card layout trên mobile
<div className="hidden md:block">
  {/* Desktop table */}
  <table>...</table>
</div>

<div className="md:hidden space-y-4">
  {/* Mobile cards */}
  {users.map(user => (
    <div key={user.user_id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <div className="flex justify-between items-start mb-2">
        <span className="font-semibold text-gray-900 dark:text-white">
          {user.user_id}
        </span>
        <button className="text-red-600">🗑️</button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Phiên:</span>
          <span className="ml-2 font-medium">{user.total_sessions}</span>
        </div>
        <div>
          <span className="text-gray-500">Tin nhắn:</span>
          <span className="ml-2 font-medium">{user.total_messages}</span>
        </div>
      </div>
    </div>
  ))}
</div>
```

---

## 🚀 Deployment Steps

### Bước 1: Backup file hiện tại
```bash
cp frontend/src/app/admin/ai-agent-chat/page.tsx frontend/src/app/admin/ai-agent-chat/page.backup.tsx
```

### Bước 2: Tạo components folder
```bash
mkdir -p frontend/src/components/admin/chat-agent/{RedisTab,ChromaTab,ModalConfigTab,RAGTab,charts,shared}
```

### Bước 3: Install dependencies
```bash
cd frontend
npm install recharts lucide-react
```

### Bước 4: Implement từng phase
- Phase 1: Tách components (1-2 giờ)
- Phase 2: UI/UX (1 giờ)
- Phase 3: Charts (30 phút)
- Phase 4: Search/Filter (1 giờ)
- Phase 5: Pagination (30 phút)
- Phase 6: Features (1 giờ)
- Phase 7: Responsive (30 phút)

**Tổng thời gian ước tính: 5-6 giờ**

---

## ✅ Checklist

- [ ] Phase 1: Component restructuring
- [ ] Phase 2: UI/UX enhancements
- [ ] Phase 3: Data visualization
- [ ] Phase 4: Advanced search
- [ ] Phase 5: Performance optimization
- [ ] Phase 6: New features
- [ ] Phase 7: Responsive design
- [ ] Testing
- [ ] Documentation

---

## 📝 Notes

- Tất cả components đều support dark mode
- Sử dụng TypeScript cho type safety
- Follow best practices: separation of concerns, DRY, SOLID
- Performance: lazy loading, memoization, pagination
- Accessibility: ARIA labels, keyboard navigation
- Mobile-first approach

---

**Tác giả**: AI Assistant
**Ngày tạo**: 2025-12-26
**Version**: 1.0
