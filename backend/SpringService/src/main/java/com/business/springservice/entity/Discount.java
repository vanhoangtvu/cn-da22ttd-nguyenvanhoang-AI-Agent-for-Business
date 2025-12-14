package com.business.springservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "discounts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Discount {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "code", nullable = false, unique = true)
    private String code;
    
    @Column(name = "name", nullable = false)
    private String name;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "discount_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private DiscountType discountType;
    
    @Column(name = "discount_value", nullable = false)
    private BigDecimal discountValue;
    
    @Column(name = "min_order_value")
    private BigDecimal minOrderValue;
    
    @Column(name = "max_discount_amount")
    private BigDecimal maxDiscountAmount;
    
    @Column(name = "usage_limit")
    private Integer usageLimit;
    
    @Column(name = "used_count")
    private Integer usedCount = 0;
    
    @Column(name = "start_date")
    private LocalDateTime startDate;
    
    @Column(name = "end_date")
    private LocalDateTime endDate;
    
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private com.business.springservice.enums.Status status = com.business.springservice.enums.Status.ACTIVE;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // Helper methods
    public boolean isValid() {
        LocalDateTime now = LocalDateTime.now();
        return status == com.business.springservice.enums.Status.ACTIVE
                && (startDate == null || now.isAfter(startDate))
                && (endDate == null || now.isBefore(endDate))
                && (usageLimit == null || usedCount < usageLimit);
    }
    
    public boolean isExpired() {
        return endDate != null && LocalDateTime.now().isAfter(endDate);
    }
    
    public boolean isUsageLimitReached() {
        return usageLimit != null && usedCount >= usageLimit;
    }
    
    public enum DiscountType {
        PERCENTAGE, // Giảm theo phần trăm
        FIXED_AMOUNT, // Giảm số tiền cố định
        FREE_SHIPPING // Miễn phí ship
    }
}