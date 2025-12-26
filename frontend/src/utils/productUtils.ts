// Utility functions for handling product details

export interface ProductDetails {
  rating?: number;
  reviews?: number;
  discount?: number;
  originalPrice?: number;
  sku?: string;
  brand?: string;
  warranty?: string;
  weight?: number;
  dimensions?: string;
  material?: string;
  color?: string;
  specifications?: Record<string, string>;
  deliveryTime?: string;
  returnPolicy?: string;
  isFeatured?: boolean;
  features?: string[];
  [key: string]: any;
}

/**
 * Parse JSON string from product.details to ProductDetails object
 */
export function parseProductDetails(detailsJson?: string): ProductDetails {
  if (!detailsJson) return {};

  try {
    return JSON.parse(detailsJson) as ProductDetails;
  } catch (error) {
    console.error('Error parsing product details:', error);
    return {};
  }
}

/**
 * Convert ProductDetails object to JSON string
 */
export function stringifyProductDetails(details: ProductDetails): string {
  try {
    return JSON.stringify(details, null, 2);
  } catch (error) {
    console.error('Error stringifying product details:', error);
    return '{}';
  }
}

/**
 * Get a specific value from details JSON
 */
export function getDetailValue(key: string, detailsJson?: string, defaultValue: any = null) {
  const details = parseProductDetails(detailsJson);
  return details[key] ?? defaultValue;
}

/**
 * Update a specific value in details JSON
 */
export function updateDetailValue(
  key: string,
  value: any,
  detailsJson?: string
): string {
  const details = parseProductDetails(detailsJson);
  details[key] = value;
  return stringifyProductDetails(details);
}

/**
 * Calculate discounted price
 */
export function calculateDiscountedPrice(
  originalPrice: number,
  details: ProductDetails
): number {
  if (!details.discount || details.discount <= 0) {
    return originalPrice;
  }

  return Math.round(originalPrice * (1 - details.discount / 100));
}

/**
 * Check if product has discount
 */
export function hasDiscount(details: ProductDetails): boolean {
  return !!(details.discount && details.discount > 0 && details.originalPrice);
}

/**
 * Format price in Vietnamese currency
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price);
}

/**
 * Create sample product details for testing
 */
export function createSampleDetails(): ProductDetails {
  return {
    rating: 4.5,
    reviews: 128,
    discount: 10,
    originalPrice: 27000000,
    sku: 'PRODUCT-001',
    brand: 'Sample Brand',
    warranty: '12 tháng',
    weight: 2.5,
    dimensions: '30 x 20 x 10 cm',
    material: 'Nhôm',
    color: 'Bạc',
    deliveryTime: '2-3 ngày',
    returnPolicy: '30 ngày',
    isFeatured: true,
    specifications: {
      'Processor': 'Intel Core i7',
      'RAM': '16GB DDR4',
      'Storage': '512GB SSD',
      'Display': '13.3 inch FHD',
      'Battery': '60Wh',
      'OS': 'Windows 11'
    },
    features: [
      'Thiết kế mỏng nhẹ',
      'Pin lâu 15 giờ',
      'Màn hình sắc nét',
      'Xử lý nhanh'
    ]
  };
}

/**
 * Validate product details structure
 */
export function validateProductDetails(details: any): boolean {
  try {
    if (!details || typeof details !== 'object') return false;

    // Check optional numeric fields
    const numericFields = ['rating', 'reviews', 'discount', 'originalPrice', 'weight'];
    for (const field of numericFields) {
      if (details[field] !== undefined && typeof details[field] !== 'number') {
        return false;
      }
    }

    // Check rating range
    if (details.rating !== undefined && (details.rating < 0 || details.rating > 5)) {
      return false;
    }

    // Check discount range
    if (details.discount !== undefined && (details.discount < 0 || details.discount > 100)) {
      return false;
    }

    // Check specifications object
    if (details.specifications !== undefined && typeof details.specifications !== 'object') {
      return false;
    }

    // Check features array
    if (details.features !== undefined && !Array.isArray(details.features)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating product details:', error);
    return false;
  }
}

/**
 * Merge two ProductDetails objects
 */
export function mergeProductDetails(
  existing: ProductDetails,
  updates: Partial<ProductDetails>
): ProductDetails {
  return {
    ...existing,
    ...updates,
    specifications: {
      ...existing.specifications,
      ...updates.specifications
    },
    features: updates.features || existing.features
  };
}

/**
 * Extract key information for search indexing
 */
export function extractSearchableText(details: ProductDetails): string {
  const searchableFields = [
    details.brand,
    details.sku,
    details.material,
    details.color,
    ...(details.features || []),
    ...Object.values(details.specifications || {}),
    ...Object.keys(details.specifications || {})
  ];

  return searchableFields
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}