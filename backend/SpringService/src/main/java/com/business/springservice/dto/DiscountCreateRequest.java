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
public class DiscountCreateRequest {
    
    @Schema(description = "Discount code", example = "SAVE20", required = true)
    private String code;
    
    @Schema(description = "Discount name", example = "Giảm giá 20% cho khách hàng mới", required = true)
    private String name;
    
    @Schema(description = "Discount description")
    private String description;
    
    @Schema(description = "Discount type: PERCENTAGE, FIXED_AMOUNT, FREE_SHIPPING", required = true)
    private String discountType;
    
    @Schema(description = "Discount value (percentage for PERCENTAGE type, amount for FIXED_AMOUNT)", example = "20", required = true)
    private BigDecimal discountValue;
    
    @Schema(description = "Minimum order value to apply discount", example = "100000")
    private BigDecimal minOrderValue;
    
    @Schema(description = "Maximum discount amount (for PERCENTAGE type)", example = "500000")
    private BigDecimal maxDiscountAmount;
    
    @Schema(description = "Usage limit (null for unlimited)", example = "100")
    private Integer usageLimit;
    
    @Schema(description = "Start date (null for immediate start)")
    private LocalDateTime startDate;
    
    @Schema(description = "End date (null for no expiry)")
    private LocalDateTime endDate;
}