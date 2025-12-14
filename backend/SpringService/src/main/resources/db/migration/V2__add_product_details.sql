-- Migration: Add details column to products table
-- Filename: V2__add_product_details.sql
-- Description: Add JSON column to store detailed product information

-- Add the details column to products table
ALTER TABLE products 
ADD COLUMN details JSON 
COMMENT 'JSON field containing detailed product information like rating, specifications, features, etc.';

-- Update existing products with empty JSON object
UPDATE products 
SET details = JSON_OBJECT() 
WHERE details IS NULL;

-- Create indexes for common JSON queries
CREATE INDEX idx_products_details_brand ON products ((JSON_UNQUOTE(JSON_EXTRACT(details, '$.brand'))));
CREATE INDEX idx_products_details_rating ON products ((CAST(JSON_EXTRACT(details, '$.rating') AS DECIMAL(3,2))));
CREATE INDEX idx_products_details_discount ON products ((CAST(JSON_EXTRACT(details, '$.discount') AS DECIMAL(5,2))));
CREATE INDEX idx_products_details_featured ON products ((JSON_EXTRACT(details, '$.isFeatured')));

-- Sample data for testing (optional)
INSERT INTO products (name, description, price, quantity, image_urls, category_id, seller_id, details) 
VALUES 
(
  'iPhone 15 Pro Max',
  'Latest iPhone with powerful A17 Pro chip, advanced camera system, and titanium design',
  29999000,
  50,
  JSON_ARRAY(
    'https://example.com/iphone15-1.jpg',
    'https://example.com/iphone15-2.jpg',
    'https://example.com/iphone15-3.jpg'
  ),
  1,
  1,
  JSON_OBJECT(
    'rating', 4.8,
    'reviews', 234,
    'discount', 5,
    'originalPrice', 31578000,
    'sku', 'APPLE-IP15PM-256-BT',
    'brand', 'Apple',
    'warranty', '12 tháng',
    'weight', 0.221,
    'dimensions', '15.99 x 7.69 x 0.83 cm',
    'material', 'Titanium',
    'color', 'Blue Titanium',
    'deliveryTime', '1-2 ngày',
    'returnPolicy', '14 ngày đổi trả',
    'isFeatured', true,
    'specifications', JSON_OBJECT(
      'Chip', 'A17 Pro',
      'Display', '6.7" Super Retina XDR',
      'Camera', '48MP Main + 12MP Ultra Wide + 12MP 5x Telephoto',
      'Storage', '256GB',
      'Battery', 'Up to 29 hours video playback',
      'OS', 'iOS 17',
      'Connectivity', '5G, Wi-Fi 6E, Bluetooth 5.3'
    ),
    'features', JSON_ARRAY(
      'Titanium design - lightest Pro model ever',
      'A17 Pro chip with 6-core GPU',
      'Pro camera system with 5x optical zoom',
      'Action Button for quick actions',
      'USB-C connectivity',
      'Emergency SOS via satellite'
    )
  )
),
(
  'Samsung Galaxy S24 Ultra',
  'Premium Android flagship with S Pen, AI features, and 200MP camera',
  27999000,
  30,
  JSON_ARRAY(
    'https://example.com/galaxy-s24-1.jpg',
    'https://example.com/galaxy-s24-2.jpg',
    'https://example.com/galaxy-s24-3.jpg'
  ),
  1,
  2,
  JSON_OBJECT(
    'rating', 4.6,
    'reviews', 189,
    'discount', 8,
    'originalPrice', 30434000,
    'sku', 'SAMSUNG-S24U-512-TT',
    'brand', 'Samsung',
    'warranty', '12 tháng',
    'weight', 0.232,
    'dimensions', '16.26 x 7.90 x 0.86 cm',
    'material', 'Titanium frame with Gorilla Glass Victus 2',
    'color', 'Titanium Black',
    'deliveryTime', '2-3 ngày',
    'returnPolicy', '30 ngày đổi trả',
    'isFeatured', true,
    'specifications', JSON_OBJECT(
      'Processor', 'Snapdragon 8 Gen 3 for Galaxy',
      'Display', '6.8" Dynamic AMOLED 2X, 120Hz',
      'Camera', '200MP Main + 50MP Periscope + 12MP Ultra Wide + 10MP Telephoto',
      'Storage', '512GB',
      'RAM', '12GB',
      'Battery', '5000mAh with 45W fast charging',
      'OS', 'One UI 6.1 based on Android 14',
      'Connectivity', '5G, Wi-Fi 7, Bluetooth 5.3'
    ),
    'features', JSON_ARRAY(
      'Built-in S Pen with Air Actions',
      'Galaxy AI with Circle to Search',
      'Quad camera with 100x Space Zoom',
      'IP68 water and dust resistance',
      'Ultrasonic fingerprint sensor',
      'DeX desktop experience'
    )
  )
);

-- Create a view for easier querying of products with parsed details
CREATE VIEW products_with_details AS
SELECT 
  p.id,
  p.name,
  p.description,
  p.price,
  p.quantity,
  p.image_urls,
  p.status,
  p.category_id,
  c.name as category_name,
  p.seller_id,
  u.username as seller_username,
  p.details,
  -- Extract common detail fields
  JSON_UNQUOTE(JSON_EXTRACT(p.details, '$.brand')) as brand,
  JSON_UNQUOTE(JSON_EXTRACT(p.details, '$.sku')) as sku,
  CAST(JSON_EXTRACT(p.details, '$.rating') AS DECIMAL(3,2)) as rating,
  CAST(JSON_EXTRACT(p.details, '$.reviews') AS INTEGER) as reviews,
  CAST(JSON_EXTRACT(p.details, '$.discount') AS INTEGER) as discount,
  CAST(JSON_EXTRACT(p.details, '$.originalPrice') AS DECIMAL(12,2)) as original_price,
  JSON_EXTRACT(p.details, '$.isFeatured') as is_featured,
  p.created_at,
  p.updated_at
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN users u ON p.seller_id = u.id;

-- Add comments for documentation
ALTER TABLE products 
MODIFY COLUMN details JSON 
COMMENT 'JSON field storing detailed product information including:
- rating: Product rating (0-5)
- reviews: Number of reviews
- discount: Discount percentage
- originalPrice: Original price before discount
- sku: Stock Keeping Unit
- brand: Product brand
- warranty: Warranty period
- weight: Weight in kg
- dimensions: Product dimensions
- material: Material composition
- color: Product color
- specifications: Technical specifications (JSON object)
- deliveryTime: Estimated delivery time
- returnPolicy: Return policy description
- isFeatured: Whether product is featured
- features: Array of key features';

-- Example queries for reference:

-- Query products with specific brand
-- SELECT * FROM products WHERE JSON_UNQUOTE(JSON_EXTRACT(details, '$.brand')) = 'Apple';

-- Query products with rating >= 4.5
-- SELECT * FROM products WHERE CAST(JSON_EXTRACT(details, '$.rating') AS DECIMAL(3,2)) >= 4.5;

-- Query products with discount > 10%
-- SELECT * FROM products WHERE CAST(JSON_EXTRACT(details, '$.discount') AS INTEGER) > 10;

-- Query featured products
-- SELECT * FROM products WHERE JSON_EXTRACT(details, '$.isFeatured') = true;

-- Search in specifications
-- SELECT * FROM products WHERE JSON_SEARCH(details, 'one', 'A17 Pro', NULL, '$.specifications.*') IS NOT NULL;