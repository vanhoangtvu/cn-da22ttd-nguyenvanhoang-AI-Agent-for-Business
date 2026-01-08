package com.business.springservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {
    
    @Schema(description = "Total number of users")
    private Long totalUsers;
    
    @Schema(description = "Number of ADMIN users")
    private Long totalAdmins;
    
    @Schema(description = "Number of BUSINESS users")
    private Long totalBusinesses;
    
    @Schema(description = "Number of CUSTOMER users")
    private Long totalCustomers;
    
    @Schema(description = "Total number of categories")
    private Long totalCategories;
    
    @Schema(description = "Number of ACTIVE categories")
    private Long activeCategories;
    
    @Schema(description = "Number of INACTIVE categories")
    private Long inactiveCategories;
    
    @Schema(description = "Total number of products")
    private Long totalProducts;
    
    @Schema(description = "Number of ACTIVE products")
    private Long activeProducts;
    
    @Schema(description = "Number of INACTIVE products")
    private Long inactiveProducts;
    
    @Schema(description = "Total number of orders")
    private Long totalOrders;
    
    @Schema(description = "Number of PENDING orders")
    private Long pendingOrders;
    
    @Schema(description = "Number of CONFIRMED orders")
    private Long confirmedOrders;
    
    @Schema(description = "Number of PROCESSING orders")
    private Long processingOrders;
    
    @Schema(description = "Number of SHIPPING orders")
    private Long shippingOrders;
    
    @Schema(description = "Number of DELIVERED orders")
    private Long deliveredOrders;
    
    @Schema(description = "Number of CANCELLED orders")
    private Long cancelledOrders;
    
    @Schema(description = "Number of RETURNED orders")
    private Long returnedOrders;
    
    @Schema(description = "Total revenue from all orders")
    private BigDecimal totalRevenue;
    
    @Schema(description = "Revenue from DELIVERED orders only")
    private BigDecimal deliveredRevenue;
    
    @Schema(description = "Total number of business documents")
    private Long totalDocuments;
    
    @Schema(description = "Product growth percentage compared to last month")
    private Double productGrowthPercent;
    
    @Schema(description = "Order growth percentage compared to last month")
    private Double orderGrowthPercent;
    
    @Schema(description = "Revenue growth percentage compared to last month")
    private Double revenueGrowthPercent;
    
    @Schema(description = "User growth percentage compared to last month")
    private Double userGrowthPercent;
}
