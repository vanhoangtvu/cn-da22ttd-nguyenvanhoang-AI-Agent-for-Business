'use client';



import { useToast } from '@/components/ToastProvider';

export default function ToastDemo() {
  const { showToast } = useToast();

  const showSuccessToast = () => {
    showToast('Thao tác đã được thực hiện thành công.', 'success');
  };

  const showErrorToast = () => {
    showToast('Đã xảy ra lỗi trong quá trình xử lý.', 'error');
  };

  const showWarningToast = () => {
    showToast('Vui lòng kiểm tra lại thông tin.', 'warning');
  };

  const showInfoToast = () => {
    showToast('Đây là một thông báo thông tin.', 'info');
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