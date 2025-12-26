'use client';

interface OrderCardProps {
  id: number;
  customerName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  orderItemsCount: number;
  onClick?: () => void;
  inChatMode?: boolean;
  productName?: string; // Optional: product name from minimal format
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PROCESSING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  SHIPPING: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  RETURNED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã hủy',
  RETURNED: 'Đã trả hàng',
};

const STATUS_ICONS: Record<string, any> = {
  PENDING: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  CONFIRMED: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  PROCESSING: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  SHIPPING: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  ),
  DELIVERED: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  CANCELLED: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  RETURNED: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  ),
};

export default function OrderCard({
  id,
  customerName,
  totalAmount,
  status,
  createdAt,
  orderItemsCount,
  onClick,
  inChatMode = false,
  productName
}: OrderCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const cardContent = (
    <div
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 group cursor-pointer"
    >
      {/* Status Banner */}
      <div className={`px-4 py-2 flex items-center justify-between ${status ? STATUS_COLORS[status] : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'} border-b border-gray-200 dark:border-gray-700`}>
        <div className="flex items-center gap-2">
          {status && STATUS_ICONS[status]}
          <span className="font-semibold text-sm">{status ? (STATUS_LABELS[status] || status) : 'Đơn hàng'}</span>
        </div>
        <span className="text-xs font-medium opacity-75">#{id}</span>
      </div>

      {/* Order Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1">
              Đơn hàng #{id}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {customerName || 'Khách hàng'}
            </p>
            {productName && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                📦 {productName}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tổng tiền</p>
            {totalAmount > 0 ? (
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {totalAmount.toLocaleString('vi-VN')}đ
              </p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                Xem chi tiết
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
            {orderItemsCount > 0 && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>{orderItemsCount} sản phẩm</span>
              </div>
            )}
            {createdAt && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{new Date(createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 font-medium group-hover:gap-2 transition-all">
            <span>Xem chi tiết</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );

  return cardContent;
}
