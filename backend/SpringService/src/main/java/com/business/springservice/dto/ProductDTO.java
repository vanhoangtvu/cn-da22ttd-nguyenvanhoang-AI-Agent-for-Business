package com.business.springservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductDTO {
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Product ID")
    private Long id;
    
    @Schema(description = "Product name", example = "iPhone 15 Pro")
    private String name;
    
    @Schema(description = "Product description", example = "Latest iPhone model with advanced features")
    private String description;
    
    @Schema(description = "Product price", example = "999.99")
    private BigDecimal price;
    
    @Schema(description = "Available quantity", example = "100")
    private Integer quantity;
    
    @Schema(description = "Product image URLs", example = "[\"https://example.com/img1.jpg\", \"https://example.com/img2.jpg\"]")
    private List<String> imageUrls;
    
    @Schema(description = "Product status", example = "ACTIVE")
    private String status;
    
    @Schema(description = "Category ID", example = "1")
    private Long categoryId;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Category name")
    private String categoryName;
    
    @Schema(description = "Seller/Business user ID", example = "2")
    private Long sellerId;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Seller username")
    private String sellerUsername;
    
    @Schema(description = "Product details in JSON format", example = "{\"rating\": 4.5, \"brand\": \"Apple\"}")
    private String details;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Created timestamp")
    private LocalDateTime createdAt;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Updated timestamp")
    private LocalDateTime updatedAt;
}
