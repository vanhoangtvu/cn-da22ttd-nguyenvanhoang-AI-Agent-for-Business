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
public class OrderDTO {
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Order ID")
    private Long id;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Customer ID")
    private Long customerId;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Customer username")
    private String customerUsername;
    
    @Schema(description = "Customer name for shipping", example = "Nguyen Van A")
    private String customerName;
    
    @Schema(description = "Customer email", example = "customer@example.com")
    private String customerEmail;
    
    @Schema(description = "Customer phone", example = "0901234567")
    private String customerPhone;
    
    @Schema(description = "Shipping address", example = "123 Nguyen Trai, Q1, TPHCM")
    private String shippingAddress;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Total amount")
    private BigDecimal totalAmount;
    
    @Schema(description = "Order status", example = "PENDING")
    private String status;
    
    @Schema(description = "Order note", example = "Giao hàng buổi chiều")
    private String note;

    @Schema(description = "Payment method", example = "BANK_TRANSFER")
    private String paymentMethod;

    @Schema(description = "QR code URL for payment (e.g., VietQR)", example = "https://example.com/qr/123")
    private String qrCodeUrl; // VietQR URL for bank transfer payment
    
    @Schema(description = "List of order items")
    private List<OrderItemDTO> orderItems;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Created timestamp")
    private LocalDateTime createdAt;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Updated timestamp")
    private LocalDateTime updatedAt;
}
