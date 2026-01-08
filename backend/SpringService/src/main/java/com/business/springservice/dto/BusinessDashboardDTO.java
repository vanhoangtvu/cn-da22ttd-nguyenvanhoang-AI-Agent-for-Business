package com.business.springservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessDashboardDTO {
    
    @Schema(description = "Business user ID")
    private Long businessId;
    
    @Schema(description = "Business username")
    private String businessUsername;
    
    @Schema(description = "Total number of products")
    private Long totalProducts;
    
    @Schema(description = "Number of ACTIVE products")
    private Long activeProducts;
    
    @Schema(description = "Number of INACTIVE products")
    private Long inactiveProducts;
    
    @Schema(description = "Total inventory value (price x quantity)")
    private BigDecimal totalInventoryValue;
    
    @Schema(description = "Total quantity in stock")
    private Long totalStockQuantity;
    
    @Schema(description = "Number of out-of-stock products")
    private Long outOfStockProducts;
    
    @Schema(description = "Number of low-stock products (quantity < 10)")
    private Long lowStockProducts;
    
    @Schema(description = "Total orders for this business's products")
    private Long totalOrders;
    
    @Schema(description = "Number of PENDING orders")
    private Long pendingOrders;
    
    @Schema(description = "Number of DELIVERED orders")
    private Long deliveredOrders;
    
    @Schema(description = "Total revenue from all orders")
    private BigDecimal totalRevenue;
    
    @Schema(description = "Revenue from DELIVERED orders only")
    private BigDecimal deliveredRevenue;
    
    @Schema(description = "Total number of uploaded documents")
    private Long totalDocuments;
    
    @Schema(description = "Product growth percentage compared to last month")
    private Double productGrowthPercent;
    
    @Schema(description = "Order growth percentage compared to last month")
    private Double orderGrowthPercent;
    
    @Schema(description = "Revenue growth percentage compared to last month")
    private Double revenueGrowthPercent;
}
