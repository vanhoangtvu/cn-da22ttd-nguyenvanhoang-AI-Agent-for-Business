package com.business.springservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderCreateRequest {

    @Schema(description = "Order note", example = "Giao hàng buổi chiều")
    private String note;

    @Schema(description = "Payment method", example = "BANK_TRANSFER", allowableValues = { "CASH", "BANK_TRANSFER" })
    private String paymentMethod = "CASH"; // Default to CASH

    @Schema(description = "Discount code (optional)", example = "WELCOME10")
    private String discountCode;

    @Schema(description = "List of order items", required = true)
    private List<OrderItemRequest> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemRequest {
        @Schema(description = "Product ID", example = "1", required = true)
        private Long productId;

        @Schema(description = "Quantity", example = "2", required = true)
        private Integer quantity;
    }
}
