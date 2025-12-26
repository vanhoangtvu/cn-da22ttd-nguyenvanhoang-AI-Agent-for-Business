package com.business.springservice.controller;

import com.business.springservice.dto.DiscountDTO;
import com.business.springservice.service.DiscountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/discounts")
@RequiredArgsConstructor
@Tag(name = "Public Discount", description = "Public APIs for customers to view and validate discount codes")
public class PublicDiscountController {

    private final DiscountService discountService;

    @GetMapping("/valid")
    @Operation(summary = "Get valid discounts", description = "Retrieve all currently valid and active discounts (public access)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved list"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<List<DiscountDTO>> getValidDiscounts() {
        return ResponseEntity.ok(discountService.getValidDiscounts());
    }

    @PostMapping("/validate")
    @Operation(summary = "Validate discount code", description = "Check if a discount code is valid and calculate discount amount WITHOUT applying it")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Discount is valid"),
            @ApiResponse(responseCode = "400", description = "Invalid discount code or order amount too low")
    })
    public ResponseEntity<Map<String, Object>> validateDiscount(
            @RequestParam String discountCode,
            @RequestParam BigDecimal orderAmount) {
        try {
            // Use calculateDiscountAmount which doesn't increase usage count
            BigDecimal discountAmount = discountService.calculateDiscountAmount(discountCode, orderAmount);

            // Get discount details
            DiscountDTO discount = discountService.getDiscountByCode(discountCode);

            Map<String, Object> response = new HashMap<>();
            response.put("valid", true);
            response.put("discountCode", discountCode);
            response.put("discountAmount", discountAmount);
            response.put("discountType", discount.getDiscountType());
            response.put("discountValue", discount.getDiscountValue());
            response.put("finalAmount", orderAmount.subtract(discountAmount));
            response.put("message", "Mã giảm giá hợp lệ");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("valid", false);
            response.put("discountCode", discountCode);
            response.put("discountAmount", BigDecimal.ZERO);
            response.put("message", e.getMessage());

            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/code/{code}")
    @Operation(summary = "Get discount by code", description = "Retrieve discount details by code (public access)")
    public ResponseEntity<DiscountDTO> getDiscountByCode(@PathVariable String code) {
        try {
            return ResponseEntity.ok(discountService.getDiscountByCode(code));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
