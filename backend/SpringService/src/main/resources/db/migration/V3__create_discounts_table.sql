-- Migration: Create discounts table
-- Filename: V3__create_discounts_table.sql
-- Description: Create table for managing discount codes

CREATE TABLE discounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã giảm giá (VD: SAVE20, SUMMER2024)',
    name VARCHAR(255) NOT NULL COMMENT 'Tên mã giảm giá',
    description TEXT COMMENT 'Mô tả chi tiết về mã giảm giá',
    discount_type ENUM('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING') NOT NULL COMMENT 'Loại giảm giá',
    discount_value DECIMAL(12,2) NOT NULL COMMENT 'Giá trị giảm (% hoặc số tiền)',
    min_order_value DECIMAL(12,2) COMMENT 'Giá trị đơn hàng tối thiểu để áp dụng',
    max_discount_amount DECIMAL(12,2) COMMENT 'Số tiền giảm tối đa (cho loại %)',
    usage_limit INT COMMENT 'Giới hạn số lần sử dụng (NULL = không giới hạn)',
    used_count INT DEFAULT 0 NOT NULL COMMENT 'Số lần đã sử dụng',
    start_date DATETIME COMMENT 'Ngày bắt đầu hiệu lực',
    end_date DATETIME COMMENT 'Ngày hết hiệu lực',
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE' NOT NULL,
    created_by BIGINT NOT NULL COMMENT 'ID người tạo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_discounts_code (code),
    INDEX idx_discounts_status (status),
    INDEX idx_discounts_created_by (created_by),
    INDEX idx_discounts_dates (start_date, end_date),
    INDEX idx_discounts_type (discount_type),
    INDEX idx_discounts_created_at (created_at)
);

-- Insert sample discount codes
INSERT INTO discounts (
    code, name, description, discount_type, discount_value, 
    min_order_value, max_discount_amount, usage_limit, 
    start_date, end_date, created_by
) VALUES 

-- Giảm giá theo phần trăm
(
    'SAVE20',
    'Giảm 20% cho đơn hàng đầu tiên',
    'Giảm giá 20% cho khách hàng mới mua lần đầu. Áp dụng cho đơn hàng từ 500,000đ',
    'PERCENTAGE',
    20.00,
    500000.00,
    200000.00,
    100,
    NOW(),
    DATE_ADD(NOW(), INTERVAL 30 DAY),
    1
),

-- Giảm giá số tiền cố định
(
    'FLAT100K',
    'Giảm 100,000đ cho đơn hàng trên 1 triệu',
    'Giảm trực tiếp 100,000đ cho đơn hàng có giá trị từ 1,000,000đ trở lên',
    'FIXED_AMOUNT',
    100000.00,
    1000000.00,
    NULL,
    50,
    NOW(),
    DATE_ADD(NOW(), INTERVAL 60 DAY),
    1
),

-- Miễn phí ship
(
    'FREESHIP',
    'Miễn phí giao hàng',
    'Miễn phí giao hàng cho tất cả đơn hàng từ 300,000đ',
    'FREE_SHIPPING',
    0.00,
    300000.00,
    NULL,
    200,
    NOW(),
    DATE_ADD(NOW(), INTERVAL 90 DAY),
    1
),

-- Flash sale
(
    'FLASH30',
    'Flash Sale - Giảm 30%',
    'Flash sale cuối tuần - Giảm 30% cho tất cả sản phẩm. Số lượng có hạn!',
    'PERCENTAGE',
    30.00,
    200000.00,
    500000.00,
    20,
    NOW(),
    DATE_ADD(NOW(), INTERVAL 7 DAY),
    1
),

-- VIP customer
(
    'VIP15',
    'Ưu đãi khách hàng VIP',
    'Giảm giá đặc biệt 15% dành cho khách hàng VIP',
    'PERCENTAGE',
    15.00,
    NULL,
    300000.00,
    NULL,
    NOW(),
    DATE_ADD(NOW(), INTERVAL 365 DAY),
    1
),

-- Seasonal discount
(
    'SUMMER2024',
    'Khuyến mãi mùa hè 2024',
    'Giảm giá mùa hè - Mua nhiều giảm nhiều!',
    'PERCENTAGE',
    25.00,
    800000.00,
    400000.00,
    150,
    NOW(),
    DATE_ADD(NOW(), INTERVAL 45 DAY),
    1
);

-- Create a view for analytics
CREATE VIEW discount_analytics AS
SELECT 
    d.id,
    d.code,
    d.name,
    d.discount_type,
    d.discount_value,
    d.usage_limit,
    d.used_count,
    CASE 
        WHEN d.usage_limit IS NULL THEN NULL
        ELSE ROUND((d.used_count * 100.0 / d.usage_limit), 2)
    END as usage_percentage,
    d.start_date,
    d.end_date,
    CASE
        WHEN d.status = 'INACTIVE' THEN 'Vô hiệu hóa'
        WHEN d.end_date IS NOT NULL AND d.end_date < NOW() THEN 'Hết hạn'
        WHEN d.start_date IS NOT NULL AND d.start_date > NOW() THEN 'Chưa bắt đầu'
        WHEN d.usage_limit IS NOT NULL AND d.used_count >= d.usage_limit THEN 'Hết lượt'
        ELSE 'Đang hoạt động'
    END as status_label,
    u.username as created_by_username,
    d.created_at,
    d.updated_at
FROM discounts d
LEFT JOIN users u ON d.created_by = u.id;

-- Function to check if discount is valid (MySQL 8.0+)
DELIMITER $$
CREATE FUNCTION is_discount_valid(discount_id BIGINT) 
RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE is_valid BOOLEAN DEFAULT FALSE;
    DECLARE discount_status VARCHAR(20);
    DECLARE start_dt DATETIME;
    DECLARE end_dt DATETIME;
    DECLARE usage_lmt INT;
    DECLARE used_cnt INT;
    
    SELECT status, start_date, end_date, usage_limit, used_count
    INTO discount_status, start_dt, end_dt, usage_lmt, used_cnt
    FROM discounts 
    WHERE id = discount_id;
    
    IF discount_status = 'ACTIVE' 
       AND (start_dt IS NULL OR start_dt <= NOW())
       AND (end_dt IS NULL OR end_dt >= NOW())
       AND (usage_lmt IS NULL OR used_cnt < usage_lmt) THEN
        SET is_valid = TRUE;
    END IF;
    
    RETURN is_valid;
END$$
DELIMITER ;

-- Example queries for reference:

-- Get all valid discounts
-- SELECT * FROM discounts WHERE is_discount_valid(id) = TRUE;

-- Get discounts expiring in next 7 days
-- SELECT * FROM discounts WHERE end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY);

-- Get most used discounts
-- SELECT code, name, used_count, usage_limit FROM discounts ORDER BY used_count DESC LIMIT 10;

-- Get discount usage analytics
-- SELECT * FROM discount_analytics ORDER BY usage_percentage DESC;