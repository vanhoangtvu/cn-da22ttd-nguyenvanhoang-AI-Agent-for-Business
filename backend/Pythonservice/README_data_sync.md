# Data Synchronization Service

Service riêng biệt để đồng bộ dữ liệu từ Spring Service, cung cấp comprehensive analytics data cho AI/RAG services.

## Tổng quan

Data Sync Service được thiết kế để:
- Đồng bộ dữ liệu kinh doanh từ Spring Service
- Cung cấp API endpoints cho admin để lấy system analytics data
- Cache dữ liệu để tối ưu performance
- Xử lý lỗi và fallback khi Spring Service không khả dụng

## Endpoints

### GET `/admin/analytics/system-data`
Lấy comprehensive system analytics data bao gồm:
- **Products**: Tổng quan sản phẩm, danh mục, top-selling, low-stock
- **Orders**: Đơn hàng gần đây, phân bố trạng thái, xu hướng hàng tháng
- **Customers**: Phân khúc khách hàng, top customers, tỷ lệ retention
- **Revenue**: Doanh thu hàng tháng, doanh thu theo sản phẩm, tỷ lệ tăng trưởng

**Query Parameters:**
- `force_refresh` (boolean): Buộc refresh dữ liệu từ Spring Service (mặc định: false)

**Response:**
```json
{
  "timestamp": "2025-01-13T10:30:00",
  "data_source": "spring_service",
  "overview": {
    "total_products": 150,
    "total_orders": 1250,
    "total_customers": 320,
    "total_users": 350,
    "total_revenue": 250000000.0,
    "monthly_revenue": 25000000.0,
    "weekly_revenue": 6000000.0,
    "daily_revenue": 1000000.0,
    "last_updated": "2025-01-13T10:30:00"
  },
  "products": {
    "summary": {
      "total_products": 150,
      "active_products": 145
    },
    "categories": [...],
    "top_selling": [...],
    "low_stock": [...],
    "all_products": [...]
  },
  "orders": {
    "summary": {
      "total_orders": 1250,
      "delivered_orders": 1100,
      "pending_orders": 150
    },
    "recent_orders": [...],
    "status_distribution": {
      "delivered": 1100,
      "pending": 150,
      "total": 1250
    }
  },
  "customers": {
    "summary": {
      "total_customers": 320,
      "total_users": 350,
      "total_business_users": 30
    },
    "all_users": [...]
  },
  "revenue": {
    "summary": {
      "total_revenue": 250000000.0,
      "monthly_revenue": 25000000.0,
      "weekly_revenue": 6000000.0,
      "daily_revenue": 1000000.0
    },
    "revenue_by_business": [...]
  },
  "business_performance": [...],
  "business_documents": {
    "total_documents": 45,
    "documents": [...]
  },
  "metadata": {
    "cache_timestamp": "2025-01-13T10:30:00",
    "cache_duration": 300,
    "spring_service_url": "http://14.183.200.75:8089/api/v1",
    "data_freshness": "fresh"
  }
}
```

### GET `/admin/analytics/data-health`
Kiểm tra trạng thái health của data synchronization:
- Kết nối Spring Service
- Trạng thái cache
- Thời gian sync cuối cùng

### POST `/admin/analytics/clear-cache`
Xóa cache dữ liệu để force refresh lần sau.

### GET `/admin/analytics/cache-info`
Lấy thông tin về cache hiện tại.

## Cấu hình Environment Variables

```bash
# Spring Service Configuration (recommended approach)
SPRING_SERVICE_HOST=14.183.200.75
SPRING_SERVICE_PORT=8089
SPRING_SERVICE_CONTEXT=/api/v1
SPRING_API_KEY=your_api_key_here

# Alternative: Full URL (less flexible)
SPRING_SERVICE_URL=http://14.183.200.75:8089/api/v1

# Cache Configuration
DATA_CACHE_DURATION=300  # Cache duration in seconds (default: 300 = 5 minutes)
```

## Spring Service Endpoints Required

Service này yêu cầu Spring Service cung cấp endpoint sau:

- `GET /api/v1/admin/analytics/system-data` - Comprehensive system analytics data
  - Trả về `SystemAnalyticsDataDTO` bao gồm:
    - **Users**: totalUsers, totalCustomers, totalBusinessUsers, users list
    - **Products**: totalProducts, activeProducts, products list, categories
    - **Orders**: totalOrders, deliveredOrders, pendingOrders, orders list
    - **Revenue**: totalRevenue, monthlyRevenue, weeklyRevenue, dailyRevenue, revenueByBusiness
    - **Business Performance**: businessPerformance list
    - **Product Performance**: topSellingProducts, lowStockProducts
    - **Business Documents**: totalDocuments, businessDocuments list

## Caching Strategy

- **Cache Duration**: 5 phút mặc định (có thể cấu hình)
- **Fallback**: Nếu Spring Service không khả dụng, trả về cache cũ (nếu có)
- **Force Refresh**: Có thể bypass cache bằng query parameter

## Error Handling

- **Spring Service Down**: Trả về cache cũ hoặc error 503
- **Invalid Response**: Log error và raise HTTPException
- **Timeout**: 30 giây timeout cho mỗi request
- **Authentication**: Hỗ trợ API key cho Spring Service

## Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   FastAPI App   │────│  Data Sync       │
│                 │    │  Routes          │
└─────────────────┘    └──────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌──────────────────┐
│ Data Sync       │────│  Spring Service  │
│ Service         │    │  Endpoints       │
│ (Cached)        │    │                  │
└─────────────────┘    └──────────────────┘
```

## Usage Examples

### Python Client
```python
import requests

# Get system data
response = requests.get("http://localhost:5000/admin/analytics/system-data")
data = response.json()

# Force refresh
response = requests.get("http://localhost:5000/admin/analytics/system-data?force_refresh=true")

# Check health
health = requests.get("http://localhost:5000/admin/analytics/data-health").json()
```

### Frontend Integration
```javascript
// Fetch analytics data
const fetchAnalyticsData = async (forceRefresh = false) => {
  const params = forceRefresh ? '?force_refresh=true' : '';
  const response = await fetch(`/admin/analytics/system-data${params}`);
  return response.json();
};
```</content>
<parameter name="filePath">/home/hv/DuAn/CSN/AI-Agent-for-Business/backend/Pythonservice/services/README_data_sync.md