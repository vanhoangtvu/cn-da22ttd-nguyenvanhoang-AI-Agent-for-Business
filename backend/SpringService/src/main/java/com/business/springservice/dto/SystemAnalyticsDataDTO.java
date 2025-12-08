package com.business.springservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SystemAnalyticsDataDTO {
    
    // User data
    private Long totalUsers;
    private Long totalCustomers;
    private Long totalBusinessUsers;
    private List<UserSummaryDTO> users;
    
    // Product data
    private Long totalProducts;
    private Long activeProducts;
    private List<ProductAnalyticsDTO> products;
    
    // Category data
    private List<CategorySummaryDTO> categories;
    
    // Order data
    private Long totalOrders;
    private Long deliveredOrders;
    private Long pendingOrders;
    private List<OrderAnalyticsDTO> orders;
    
    // Revenue data
    private BigDecimal totalRevenue;
    private BigDecimal monthlyRevenue;
    private BigDecimal weeklyRevenue;
    private BigDecimal dailyRevenue;
    private List<RevenueByBusinessDTO> revenueByBusiness;
    
    // Business performance
    private List<BusinessPerformanceDTO> businessPerformance;
    
    // Product performance
    private List<ProductPerformanceDTO> topSellingProducts;
    private List<ProductPerformanceDTO> lowStockProducts;
    
    // Business documents
    private Long totalDocuments;
    private List<BusinessDocumentSummaryDTO> businessDocuments;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSummaryDTO {
        private Long id;
        private String username;
        private String email;
        private String role;
        private String accountStatus;
        private String address;
        private String phoneNumber;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductAnalyticsDTO {
        private Long id;
        private String name;
        private String description;
        private BigDecimal price;
        private Integer quantity;
        private String status;
        private String categoryName;
        private String sellerUsername;
        private Long sellerId;
        private Integer totalSold;
        private BigDecimal totalRevenue;
        private String imageUrls;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategorySummaryDTO {
        private Long id;
        private String name;
        private String description;
        private String status;
        private Integer productCount;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderAnalyticsDTO {
        private Long id;
        private Long customerId;
        private String customerName;
        private String status;
        private BigDecimal totalAmount;
        private Integer totalItems;
        private String createdAt;
        private List<OrderItemSummaryDTO> items;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemSummaryDTO {
        private Long productId;
        private String productName;
        private Integer quantity;
        private BigDecimal price;
        private BigDecimal subtotal;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevenueByBusinessDTO {
        private Long businessId;
        private String businessUsername;
        private BigDecimal totalRevenue;
        private Long totalOrders;
        private Long productsSold;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BusinessPerformanceDTO {
        private Long businessId;
        private String businessUsername;
        private Integer totalProducts;
        private Integer activeProducts;
        private BigDecimal inventoryValue;
        private Long totalOrders;
        private BigDecimal revenue;
        private Double averageOrderValue;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductPerformanceDTO {
        private Long productId;
        private String productName;
        private Integer quantityInStock;
        private Integer totalSold;
        private BigDecimal revenue;
        private String categoryName;
        private String sellerUsername;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BusinessDocumentSummaryDTO {
        private Long id;
        private Long businessId;
        private String businessUsername;
        private String fileName;
        private String fileType;
        private String filePath;
        private Long fileSize;
        private String description;
        private String uploadedAt;
    }
}
