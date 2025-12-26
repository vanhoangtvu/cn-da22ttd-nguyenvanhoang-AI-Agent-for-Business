'use client';

'use client';

import { useToast } from '@/components/ToastProvider';

export default function ToastDemo() {
  const { addToast } = useToast();

  const showSuccessToast = () => {
    addToast({
      type: 'success',
      title: 'Thành công!',
      message: 'Thao tác đã được thực hiện thành công.',
      duration: 4000
    });
  };

  const showErrorToast = () => {
    addToast({
      type: 'error',
      title: 'Lỗi!',
      message: 'Đã xảy ra lỗi trong quá trình xử lý.',
      duration: 5000
    });
  };

  const showWarningToast = () => {
    addToast({
      type: 'warning',
      title: 'Cảnh báo!',
      message: 'Vui lòng kiểm tra lại thông tin.',
      duration: 6000
    });
  };

  const showInfoToast = () => {
    addToast({
      type: 'info',
      title: 'Thông tin',
      message: 'Đây là một thông báo thông tin.',
      duration: 3000
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
          Toast Notifications Demo
        </h1>

        <div className="space-y-4">
          <button
            onClick={showSuccessToast}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            ✅ Success Toast
          </button>

          <button
            onClick={showErrorToast}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            ❌ Error Toast
          </button>

          <button
            onClick={showWarningToast}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-medium py-3 px-4 rounded-lg transition-colors"
          >
            ⚠️ Warning Toast
          </button>

          <button
            onClick={showInfoToast}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            ℹ️ Info Toast
          </button>
        </div>

        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400 text-center">
          Click các button để xem toast notifications hiện đại!
        </div>
      </div>
    </div>
  );
}