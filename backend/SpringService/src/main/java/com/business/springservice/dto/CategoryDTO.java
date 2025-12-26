package com.business.springservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CategoryDTO {
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Category ID")
    private Long id;
    
    @Schema(description = "Category name", example = "Electronics")
    private String name;
    
    @Schema(description = "Category description", example = "Electronic devices and gadgets")
    private String description;
    
    @Schema(description = "Category image URL", example = "https://example.com/category.jpg")
    private String imageUrl;
    
    @Schema(description = "Category status", example = "ACTIVE")
    private String status;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Number of products in this category")
    private Long productCount;
}
