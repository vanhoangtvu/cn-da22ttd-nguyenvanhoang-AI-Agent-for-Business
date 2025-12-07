import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI Agent for Business
            </span>
          </div>
          <div className="flex gap-4">
            <Link
              href="/chat"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat AI
            </Link>
            <Link
              href="/shop"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Cửa hàng
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
            >
              Đăng ký
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Hệ thống AI thông minh
            <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Hỗ trợ doanh nghiệp
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Chăm sóc khách hàng tự động, tư vấn sản phẩm thông minh và đề xuất chiến lược kinh doanh dựa trên dữ liệu nội bộ với công nghệ AI tiên tiến
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link
              href="/shop"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all transform hover:scale-105"
            >
              Khám phá cửa hàng
            </Link>
            <Link
              href="/register"
              className="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-semibold hover:border-blue-600 dark:hover:border-blue-400 transition-all"
            >
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Tính năng nổi bật</h2>
          <p className="text-gray-600 dark:text-gray-400">Giải pháp AI toàn diện cho doanh nghiệp của bạn</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Chatbot thông minh</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Chăm sóc khách hàng tự động 24/7 với khả năng hiểu ngữ cảnh và trả lời chính xác dựa trên dữ liệu nội bộ
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Tư vấn sản phẩm</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Đề xuất sản phẩm phù hợp với nhu cầu khách hàng dựa trên knowledge base và lịch sử mua hàng
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Phân tích chiến lược</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Phân tích SWOT, đánh giá rủi ro và đề xuất chiến lược kinh doanh từ dữ liệu thực tế
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Tìm kiếm thông minh</h3>
            <p className="text-gray-600 dark:text-gray-400">
              RAG-powered search giúp tìm kiếm thông tin chính xác từ hàng nghìn tài liệu nội bộ
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Quản lý tài liệu</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Upload và xử lý tự động các loại tài liệu: PDF, DOC, DOCX, TXT, Excel với vector embeddings
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Báo cáo tự động</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Tạo báo cáo chi tiết với insights dựa trên AI về hiệu suất kinh doanh và xu hướng thị trường
            </p>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Công nghệ tiên tiến</h2>
          <p className="text-gray-600 dark:text-gray-400">Xây dựng trên nền tảng công nghệ hiện đại</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl text-center">
            <div className="flex justify-center mb-2">
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 0 1-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 0 0-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.25 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 0 0-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 0 1-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 0 1-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 0 1 .174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 0 0 4.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 0 0 2.466-2.163 11.944 11.944 0 0 0 2.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 0 0-2.499-.523A33.119 33.119 0 0 0 11.573 0zm4.069 7.217c.347 0 .408.005.486.047a.473.473 0 0 1 .237.277c.018.06.023 1.365.018 4.304l-.006 4.218-.744-1.14-.746-1.14v-3.066c0-1.982.01-3.097.023-3.15a.478.478 0 0 1 .233-.296c.096-.05.13-.054.5-.054z"/>
              </svg>
            </div>
            <h3 className="font-semibold mb-1">Next.js 14</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Frontend</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl text-center">
            <div className="flex justify-center mb-2">
              <svg className="w-12 h-12 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.205 16.392c-2.469 3.289-7.741 2.179-11.122 2.338 0 0-.599.034-1.201.133 0 0 .228-.097.519-.198 2.374-.821 3.496-.986 4.939-1.727 2.71-1.388 5.408-4.413 5.957-7.555-1.032 3.022-4.17 5.623-7.027 6.679-1.955.722-5.492 1.424-5.493 1.424a5.28 5.28 0 0 1-.143-.076c-2.405-1.17-2.475-6.38 1.894-8.059 1.916-.736 3.747-.332 5.818-.825 2.208-.525 4.766-2.18 5.805-4.344 1.165 3.458 2.565 8.866.054 12.21zm.042-13.28a9.212 9.212 0 0 1-1.065 1.89 9.982 9.982 0 0 0-7.167-3.031C6.492 1.971 2 6.463 2 11.985a9.983 9.983 0 0 0 3.205 7.334l.22.194a.856.856 0 1 1 .001.001l.149.132A9.96 9.96 0 0 0 12.015 22c5.278 0 9.613-4.108 9.984-9.292.274-2.539-.476-5.763-1.752-9.596"/>
              </svg>
            </div>
            <h3 className="font-semibold mb-1">Spring Boot 3</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Backend API</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl text-center">
            <div className="flex justify-center mb-2">
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z"/>
              </svg>
            </div>
            <h3 className="font-semibold mb-1">FastAPI + Python</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">AI Service</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl text-center">
            <div className="flex justify-center mb-2">
              <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-1">Gemini AI</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">LLM Engine</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p className="mb-2">
              <strong>Sinh viên thực hiện:</strong> Nguyễn Văn Hoàng - MSSV: 110122078
            </p>
            <p className="mb-2">
              <strong>Giáo viên hướng dẫn:</strong> ThS. TS. Nguyễn Bảo Ân
            </p>
            <p>
              Khoa Công Nghệ Thông Tin - Đại Học Trà Vinh
            </p>
            <p className="mt-4 text-sm">
              © 2025 AI Agent for Business. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
