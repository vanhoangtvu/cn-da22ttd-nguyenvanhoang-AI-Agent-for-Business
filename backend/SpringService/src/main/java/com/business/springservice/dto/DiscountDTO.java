package com.business.springservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DiscountDTO {
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Discount ID")
    private Long id;
    
    @Schema(description = "Discount code", example = "SAVE20")
    private String code;
    
    @Schema(description = "Discount name", example = "Giảm giá 20% cho khách hàng mới")
    private String name;
    
    @Schema(description = "Discount description")
    private String description;
    
    @Schema(description = "Discount type: PERCENTAGE, FIXED_AMOUNT, FREE_SHIPPING")
    private String discountType;
    
    @Schema(description = "Discount value (percentage or amount)", example = "20")
    private BigDecimal discountValue;
    
    @Schema(description = "Minimum order value to apply discount", example = "100000")
    private BigDecimal minOrderValue;
    
    @Schema(description = "Maximum discount amount", example = "500000")
    private BigDecimal maxDiscountAmount;
    
    @Schema(description = "Usage limit", example = "100")
    private Integer usageLimit;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Used count")
    private Integer usedCount;
    
    @Schema(description = "Start date")
    private LocalDateTime startDate;
    
    @Schema(description = "End date")
    private LocalDateTime endDate;
    
    @Schema(description = "Discount status")
    private String status;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Created by user ID")
    private Long createdBy;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Created by username")
    private String createdByUsername;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Created timestamp")
    private LocalDateTime createdAt;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Updated timestamp")
    private LocalDateTime updatedAt;
    
    // Helper properties for UI
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Is discount valid now")
    private Boolean isValid;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Is discount expired")
    private Boolean isExpired;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Usage percentage")
    private Double usagePercentage;
}