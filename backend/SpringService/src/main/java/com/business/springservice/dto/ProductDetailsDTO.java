package com.business.springservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductDetailsDTO {
    
    private Double rating;
    private Integer reviews;
    private Integer discount;
    private Double originalPrice;
    private String sku;
    private String brand;
    private String warranty;
    private Double weight;
    private String dimensions;
    private String material;
    private String color;
    private Map<String, String> specifications;
    private String deliveryTime;
    private String returnPolicy;
    private Boolean isFeatured;
    private List<String> features;
    
    // Helper methods for common operations
    public boolean hasDiscount() {
        return discount != null && discount > 0;
    }
    
    public Double getDiscountedPrice(Double originalPrice) {
        if (!hasDiscount() || originalPrice == null) {
            return originalPrice;
        }
        return originalPrice * (1 - discount / 100.0);
    }
    
    public boolean hasRating() {
        return rating != null && rating > 0;
    }
    
    public boolean hasSpecifications() {
        return specifications != null && !specifications.isEmpty();
    }
    
    public boolean hasFeatures() {
        return features != null && !features.isEmpty();
    }
}