'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useState } from 'react';
import React from 'react';

interface AnalyticsInsightsPanelProps {
  insights: string;
  statistics: any;
  analysisType: string;
  onRegenerate?: () => void;
  onPrint?: () => void;
}

export default function AnalyticsInsightsPanel({
  insights,
  statistics,
  analysisType,
  onRegenerate,
  onPrint,
}: AnalyticsInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<'insights' | 'statistics' | 'forecasts'>('insights');

  const analysisTypeIcons: { [key: string]: React.ReactElement } = {
    general: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    pricing: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    inventory: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    sales: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  };

  const analysisTypeLabels: { [key: string]: string } = {
    general: 'Phân Tích Tổng Quan',
    pricing: 'Chiến Lược Giá',
    inventory: 'Quản Lý Tồn Kho',
    sales: 'Tăng Trưởng Bán Hàng',
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
              {analysisTypeIcons[analysisType] || analysisTypeIcons.general}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {analysisTypeLabels[analysisType] || 'AI Analysis Report'}
              </h2>
              <p className="text-violet-100 text-sm">Powered by RAG + Statistical Forecasting</p>
            </div>
          </div>

          <div className="flex gap-2">
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Phân tích lại
              </button>
            )}
            {onPrint && (
              <button
                onClick={onPrint}
                className="px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                In báo cáo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex">
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-all relative ${
              activeTab === 'insights'
                ? 'text-violet-600 dark:text-violet-400 bg-white dark:bg-gray-800'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Insights
            </div>
            {activeTab === 'insights' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 dark:bg-violet-400" />
            )}
          </button>

          {statistics && (
            <button
              onClick={() => setActiveTab('statistics')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-all relative ${
                activeTab === 'statistics'
                  ? 'text-violet-600 dark:text-violet-400 bg-white dark:bg-gray-800'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Statistics
              </div>
              {activeTab === 'statistics' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 dark:bg-violet-400" />
              )}
            </button>
          )}

          {statistics?.forecasts && (
            <button
              onClick={() => setActiveTab('forecasts')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-all relative ${
                activeTab === 'forecasts'
                  ? 'text-violet-600 dark:text-violet-400 bg-white dark:bg-gray-800'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Forecasts
              </div>
              {activeTab === 'forecasts' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 dark:bg-violet-400" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* AI Insights Tab */}
        {activeTab === 'insights' && (
          <div className="prose prose-violet dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm] as any}
              rehypePlugins={[rehypeRaw] as any}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 pb-3 border-b-2 border-violet-200 dark:border-violet-800">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-8 mb-4 flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-full"></span>
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-semibold text-fuchsia-600 dark:text-fuchsia-400 mt-6 mb-3 flex items-center gap-2">
                    <span className="w-1 h-6 bg-fuchsia-500 rounded-full"></span>
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mt-4 mb-2">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="space-y-2 my-4">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-2 my-4">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                    <span className="text-violet-500 mt-1 flex-shrink-0">●</span>
                    <span className="text-gray-700 dark:text-gray-300 flex-1">{children}</span>
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold text-violet-700 dark:text-violet-300">
                    {children}
                  </strong>
                ),
                table: ({ children }) => (
                  <div className="my-6 overflow-hidden rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        {children}
                      </table>
                    </div>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-gradient-to-r from-violet-600 to-fuchsia-600">
                    {children}
                  </thead>
                ),
                th: ({ children }) => (
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    {children}
                  </th>
                ),
                tbody: ({ children }) => (
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {children}
                  </tbody>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors">
                    {children}
                  </tr>
                ),
                td: ({ children }) => (
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {children}
                  </td>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-violet-500 bg-violet-50 dark:bg-violet-900/20 p-4 my-4 rounded-r-lg">
                    <div className="text-gray-700 dark:text-gray-300 italic">
                      {children}
                    </div>
                  </blockquote>
                ),
                hr: () => (
                  <hr className="my-8 border-t-2 border-gray-200 dark:border-gray-700" />
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code className="px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-sm font-mono">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className={className}>
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                    {children}
                  </pre>
                ),
              }}
            >
              {insights}
            </ReactMarkdown>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'statistics' && statistics && (
          <div className="space-y-6">
            {/* Overview Cards */}
            {statistics.overview && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Tổng Quan Kinh Doanh
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Sản phẩm</span>
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {statistics.overview.total_products?.toLocaleString() || 0}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">Đơn hàng</span>
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {statistics.overview.total_orders?.toLocaleString() || 0}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Doanh thu</span>
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {formatCurrency(statistics.overview.total_revenue || 0)}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-300">AOV</span>
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                      {formatCurrency(statistics.overview.avg_order_value || 0)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Inventory Analysis */}
            {statistics.inventory_analysis && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Phân Tích Tồn Kho
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {statistics.inventory_analysis.table_data && Object.entries(statistics.inventory_analysis.table_data).map(([key, value]: [string, any]) => {
                    const labels: { [key: string]: { label: string; color: string; icon: string } } = {
                      good: { label: 'Tốt (≥30)', color: 'green', icon: '✓' },
                      average: { label: 'TB (10-29)', color: 'yellow', icon: '●' },
                      low: { label: 'Thấp (1-9)', color: 'orange', icon: '⚠' },
                      out: { label: 'Hết hàng', color: 'red', icon: '✗' },
                    };
                    const config = labels[key] || { label: key, color: 'gray', icon: '○' };

                    return (
                      <div key={key} className={`bg-gradient-to-br from-${config.color}-50 to-${config.color}-100 dark:from-${config.color}-900/20 dark:to-${config.color}-800/20 p-4 rounded-xl border border-${config.color}-200 dark:border-${config.color}-800`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium text-${config.color}-700 dark:text-${config.color}-300`}>
                            {config.label}
                          </span>
                          <span className={`text-lg text-${config.color}-600`}>{config.icon}</span>
                        </div>
                        <div className={`text-2xl font-bold text-${config.color}-900 dark:text-${config.color}-100 mb-1`}>
                          {value.count || 0} SP
                        </div>
                        <div className={`text-sm text-${config.color}-700 dark:text-${config.color}-300`}>
                          {formatCurrency(value.value || 0)}
                        </div>
                        <div className={`text-xs text-${config.color}-600 dark:text-${config.color}-400 mt-1`}>
                          {(value.percent || 0).toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Products */}
            {statistics.top_products && statistics.top_products.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Top Sản Phẩm Bán Chạy
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Sản phẩm</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Đã bán</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Tồn kho</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {statistics.top_products.slice(0, 10).map((product: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                              {product.name || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                              {(product.total_sold || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                (product.available_stock || 0) >= 30
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : (product.available_stock || 0) >= 10
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                  : (product.available_stock || 0) > 0
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              }`}>
                                {(product.available_stock || 0).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(product.revenue || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Forecasts Tab */}
        {activeTab === 'forecasts' && statistics?.forecasts && (
          <div className="space-y-6">
            {/* Revenue Forecast */}
            {statistics.forecasts.revenue && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Dự Báo Doanh Thu 7 Ngày Tới
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tổng dự báo</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(statistics.forecasts.revenue.next_7_days_total || 0)}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Trung bình/ngày</div>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(statistics.forecasts.revenue.daily_average || 0)}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Xu hướng</div>
                    <div className={`text-lg font-bold ${
                      statistics.forecasts.revenue.trend === 'increasing'
                        ? 'text-green-600 dark:text-green-400'
                        : statistics.forecasts.revenue.trend === 'decreasing'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {statistics.forecasts.revenue.trend === 'increasing' ? '📈 Tăng' : statistics.forecasts.revenue.trend === 'decreasing' ? '📉 Giảm' : '➡️ Ổn định'}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Độ tin cậy:</span>{' '}
                  <span className={`font-bold ${
                    (statistics.forecasts.revenue.confidence || 0) > 0.7
                      ? 'text-green-600 dark:text-green-400'
                      : (statistics.forecasts.revenue.confidence || 0) > 0.4
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {((statistics.forecasts.revenue.confidence || 0) * 100).toFixed(0)}%
                  </span>
                  {' • '}
                  <span className="font-medium">Phương pháp:</span> {statistics.forecasts.revenue.method || 'N/A'}
                </div>
              </div>
            )}

            {/* Product Forecasts */}
            {statistics.forecasts.product_forecasts && statistics.forecasts.product_forecasts.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Dự Báo Theo Sản Phẩm
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Sản phẩm</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Tồn hiện tại</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Bán thực tế (30d)</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Dự báo (7d)</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Đủ dùng</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {statistics.forecasts.product_forecasts.map((forecast: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                              <div>{forecast.product_name || 'N/A'}</div>
                              {forecast.days_of_data > 0 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  📊 {forecast.days_of_data} ngày có dữ liệu
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                              {(forecast.current_stock || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className="font-medium text-blue-600 dark:text-blue-400">
                                {(forecast.actual_30day_sales || 0).toLocaleString()}
                              </span>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                ≈ {((forecast.actual_30day_sales || 0) / 30).toFixed(1)}/ngày
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className="font-semibold text-violet-600 dark:text-violet-400">
                                {(forecast.forecast_7day_sales || 0).toLocaleString()}
                              </span>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                ≈ {(forecast.daily_forecast || 0).toFixed(1)}/ngày
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                (forecast.stock_coverage_days || 0) >= 14
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : (forecast.stock_coverage_days || 0) >= 7
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              }`}>
                                {forecast.stock_coverage_days || 0} ngày
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {forecast.needs_restock ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full text-xs font-medium">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                  Cần nhập
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-xs font-medium">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Đủ hàng
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Inventory Reorder */}
            {statistics.forecasts.inventory_reorder && statistics.forecasts.inventory_reorder.length > 0 && (
              <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-6 rounded-xl border border-orange-200 dark:border-orange-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Khuyến Nghị Nhập Hàng
                </h3>
                <div className="space-y-3">
                  {statistics.forecasts.inventory_reorder.map((reorder: any, index: number) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {reorder.product_name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Tồn hiện tại: <span className="font-semibold">{reorder.current_stock || 0}</span>
                          {' • '}
                          Bán TB/ngày: <span className="font-semibold">{(reorder.avg_daily_sales || 0).toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold mb-1 ${
                          reorder.urgency === 'high' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
                        }`}>
                          Nhập: {reorder.recommended_order_quantity || 0} SP
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                          reorder.urgency === 'high'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                        }`}>
                          {reorder.urgency === 'high' ? '🔥 Khẩn cấp' : '⚠️ Quan trọng'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
