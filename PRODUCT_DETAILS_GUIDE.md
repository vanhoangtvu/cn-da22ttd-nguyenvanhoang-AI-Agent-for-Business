# Product Details Enhancement - Hướng dẫn sử dụng

## 📝 Tổng quan

Tính năng này mở rộng hệ thống quản lý sản phẩm bằng cách thêm trường `details` JSON để lưu trữ thông tin chi tiết về sản phẩm như đánh giá, thông số kỹ thuật, tính năng, v.v. mà không cần thay đổi cấu trúc database phức tạp.

## 🔧 Các thay đổi đã thực hiện

### Backend (Spring Boot)

1. **Entity Product** - Thêm trường `details` JSON
2. **ProductDTO** - Thêm field `details` 
3. **ProductDetailsDTO** - Class mới để quản lý chi tiết
4. **ProductCreateRequest** - Hỗ trợ field `details`
5. **ProductService** - Helper methods để xử lý JSON
6. **Migration SQL** - Thêm column và indexes

### Frontend (Next.js)

1. **ProductDetailPanel** - Component hiển thị chi tiết đầy đủ
2. **Product Utils** - Helper functions để parse JSON
3. **API Client** - Cập nhật interfaces hỗ trợ details

## 📊 Cấu trúc ProductDetails

```typescript
interface ProductDetails {
  rating?: number;           // Đánh giá 0-5
  reviews?: number;          // Số lượng đánh giá
  discount?: number;         // Phần trăm giảm giá
  originalPrice?: number;    // Giá gốc
  sku?: string;             // Mã sản phẩm
  brand?: string;           // Thương hiệu
  warranty?: string;        // Bảo hành
  weight?: number;          // Cân nặng (kg)
  dimensions?: string;      // Kích thước
  material?: string;        // Chất liệu
  color?: string;           // Màu sắc
  specifications?: Record<string, string>; // Thông số kỹ thuật
  deliveryTime?: string;    // Thời gian giao hàng
  returnPolicy?: string;    // Chính sách đổi trả
  isFeatured?: boolean;     // Sản phẩm nổi bật
  features?: string[];      // Tính năng chính
}
```

## 🚀 Cách sử dụng

### 1. Backend API

#### Tạo sản phẩm với details:

```bash
POST /admin/products
{
  "name": "iPhone 15 Pro",
  "description": "Latest iPhone...",
  "price": 25000000,
  "quantity": 50,
  "categoryId": 1,
  "imageUrls": ["url1", "url2"],
  "details": "{\"rating\":4.5,\"brand\":\"Apple\",\"specifications\":{\"CPU\":\"A17 Pro\"}}"
}
```

#### Cập nhật sản phẩm:

```bash
PATCH /admin/products/1
{
  "details": "{\"rating\":4.8,\"reviews\":150}"
}
```

### 2. Frontend Usage

#### Parse details từ API:

```typescript
import { parseProductDetails } from '@/utils/productUtils';

const details = parseProductDetails(product.details);
console.log(details.rating); // 4.5
console.log(details.specifications?.CPU); // "A17 Pro"
```

#### Hiển thị ProductDetailPanel:

```typescript
import ProductDetailPanel from '@/components/ProductDetailPanel';

<ProductDetailPanel
  product={product}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onAddToCart={handleAddToCart}
  isAuthenticated={isAuthenticated}
/>
```

### 3. Database Queries

#### Tìm sản phẩm theo brand:

```sql
SELECT * FROM products 
WHERE JSON_UNQUOTE(JSON_EXTRACT(details, '$.brand')) = 'Apple';
```

#### Tìm sản phẩm có đánh giá >= 4.5:

```sql
SELECT * FROM products 
WHERE CAST(JSON_EXTRACT(details, '$.rating') AS DECIMAL(3,2)) >= 4.5;
```

#### Tìm sản phẩm có discount:

```sql
SELECT * FROM products 
WHERE CAST(JSON_EXTRACT(details, '$.discount') AS INTEGER) > 0;
```

## 📱 Giao diện ProductDetailPanel

Component mới hiển thị:

- ✅ **Image Gallery** - Carousel với thumbnails
- ✅ **Rating & Reviews** - Hiển thị sao và số đánh giá  
- ✅ **Price & Discount** - Giá gốc, giá sale, % giảm
- ✅ **Specifications** - Bảng thông số kỹ thuật
- ✅ **Product Details** - SKU, brand, color, warranty, etc.
- ✅ **Features List** - Các tính năng chính
- ✅ **Delivery Info** - Thời gian giao, chính sách đổi trả
- ✅ **Quantity Selector** - Chọn số lượng trước thêm giỏ
- ✅ **Responsive Design** - Mobile & Desktop friendly

## 🎨 Utils Functions

```typescript
// Parse JSON string to object
const details = parseProductDetails(product.details);

// Calculate discounted price  
const salePrice = calculateDiscountedPrice(product.price, details);

// Check if has discount
const hasDiscount = hasDiscount(details);

// Format Vietnamese currency
const formattedPrice = formatPrice(price);

// Create sample data for testing
const sampleDetails = createSampleDetails();

// Validate details structure
const isValid = validateProductDetails(details);
```

## 🗄️ Database Migration

Run migration để thêm column:

```sql
-- For MySQL
ALTER TABLE products ADD COLUMN details JSON;

-- Add indexes for common queries
CREATE INDEX idx_products_details_brand ON products ((JSON_UNQUOTE(JSON_EXTRACT(details, '$.brand'))));
CREATE INDEX idx_products_details_rating ON products ((CAST(JSON_EXTRACT(details, '$.rating') AS DECIMAL(3,2))));
```

## 📋 Sample Data

```json
{
  "rating": 4.5,
  "reviews": 128,
  "discount": 10,
  "originalPrice": 27000000,
  "sku": "APPLE-IP15-256-BT",
  "brand": "Apple", 
  "warranty": "12 tháng",
  "weight": 0.221,
  "dimensions": "15.99 x 7.69 x 0.83 cm",
  "material": "Titanium",
  "color": "Blue Titanium",
  "deliveryTime": "1-2 ngày",
  "returnPolicy": "14 ngày",
  "isFeatured": true,
  "specifications": {
    "Chip": "A17 Pro",
    "Display": "6.7\" Super Retina XDR",
    "Camera": "48MP Main + 12MP Ultra Wide",
    "Storage": "256GB",
    "Battery": "Up to 29 hours",
    "OS": "iOS 17"
  },
  "features": [
    "Titanium design - lightest Pro model ever",
    "A17 Pro chip with 6-core GPU", 
    "Pro camera system with 5x optical zoom",
    "Action Button for quick actions",
    "USB-C connectivity",
    "Emergency SOS via satellite"
  ]
}
```

## ⚡ Performance Tips

1. **Index thường dùng** - Tạo index cho brand, rating, discount
2. **Cache parsed details** - Sử dụng useMemo trong React
3. **Validate JSON** - Kiểm tra structure trước lưu
4. **Lazy load specs** - Chỉ hiển thị khi người dùng click

## 🔍 Testing

```bash
# Test backend APIs
curl -X POST http://localhost:8089/api/v1/admin/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name":"Test Product","details":"{\"rating\":4.0}"}'

# Test frontend component
npm run dev
# Navigate to /shop and click on a product
```

## 🚨 Lưu ý quan trọng

- ⚠️ **JSON Validation** - Luôn validate JSON trước khi lưu
- ⚠️ **Error Handling** - Handle parse errors gracefully  
- ⚠️ **Performance** - Tránh query JSON phức tạp với large datasets
- ⚠️ **Backup** - Backup database trước khi chạy migration

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shop/products` | Lấy tất cả sản phẩm (có details) |
| GET | `/shop/products/{id}` | Lấy chi tiết sản phẩm |
| POST | `/admin/products` | Tạo sản phẩm (với details) |
| PATCH | `/admin/products/{id}` | Cập nhật sản phẩm |

## 📞 Support

Nếu gặp vấn đề:

1. Check server logs trong Spring Boot
2. Check browser console trong frontend
3. Verify JSON structure với `validateProductDetails()`
4. Test API endpoints với Postman/curl

---

**Phiên bản**: 1.0  
**Ngày cập nhật**: 14/12/2025  
**Tác giả**: BizOps Development Team