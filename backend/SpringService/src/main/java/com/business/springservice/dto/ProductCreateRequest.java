package com.business.springservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductCreateRequest {
    @Schema(description = "Product name", example = "iPhone 15 Pro", required = true)
    private String name;
    
    @Schema(description = "Product description", example = "Latest iPhone model")
    private String description;
    
    @Schema(description = "Product price", example = "999.99", required = true)
    private BigDecimal price;
    
    @Schema(description = "Available quantity", example = "100", required = true)
    private Integer quantity;
    
    @Schema(description = "Product image URLs")
    private List<String> imageUrls;
    
    @Schema(description = "Category ID", example = "1", required = true)
    private Long categoryId;
    
    @Schema(description = "Product details in JSON format", example = "{\"rating\": 4.5, \"brand\": \"Apple\"}")
    private String details;
}
