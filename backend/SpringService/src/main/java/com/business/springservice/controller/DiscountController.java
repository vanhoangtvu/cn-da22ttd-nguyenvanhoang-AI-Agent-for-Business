package com.business.springservice.controller;

import com.business.springservice.dto.DiscountCreateRequest;
import com.business.springservice.dto.DiscountDTO;
import com.business.springservice.service.ActivityLogService;
import com.business.springservice.service.DiscountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/admin/discounts")
@RequiredArgsConstructor
@Tag(name = "Discount Management", description = "APIs for managing discount codes (ADMIN and BUSINESS only)")
public class DiscountController {
    
    private final DiscountService discountService;
    private final ActivityLogService activityLogService;
    
    @GetMapping
    @Operation(summary = "Get all discounts", description = "Retrieve list of all discounts")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved list"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<List<DiscountDTO>> getAllDiscounts() {
        return ResponseEntity.ok(discountService.getAllDiscounts());
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Get discount by ID", description = "Retrieve a specific discount by ID")
    public ResponseEntity<DiscountDTO> getDiscountById(@PathVariable Long id) {
        return ResponseEntity.ok(discountService.getDiscountById(id));
    }
    
    @GetMapping("/code/{code}")
    @Operation(summary = "Get discount by code", description = "Retrieve a specific discount by code")
    public ResponseEntity<DiscountDTO> getDiscountByCode(@PathVariable String code) {
        return ResponseEntity.ok(discountService.getDiscountByCode(code));
    }
    
    @GetMapping("/user/{userId}")
    @Operation(summary = "Get discounts by user", description = "Retrieve all discounts created by a specific user")
    public ResponseEntity<List<DiscountDTO>> getDiscountsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(discountService.getDiscountsByUser(userId));
    }
    
    @GetMapping("/valid")
    @Operation(summary = "Get valid discounts", description = "Retrieve all currently valid discounts")
    public ResponseEntity<List<DiscountDTO>> getValidDiscounts() {
        return ResponseEntity.ok(discountService.getValidDiscounts());
    }
    
    @GetMapping("/search")
    @Operation(summary = "Search discounts", description = "Search discounts by name or code")
    public ResponseEntity<List<DiscountDTO>> searchDiscounts(@RequestParam String keyword) {
        return ResponseEntity.ok(discountService.searchDiscounts(keyword));
    }
    
    @PostMapping
    @Operation(summary = "Create new discount", description = "Create a new discount code")
    public ResponseEntity<DiscountDTO> createDiscount(
            HttpServletRequest request,
            @RequestBody DiscountCreateRequest discountRequest) {
        Long userId = (Long) request.getAttribute("userId");
        String username = (String) request.getAttribute("username");
        String userRole = (String) request.getAttribute("userRole");
        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");

        DiscountDTO createdDiscount = discountService.createDiscount(discountRequest, userId);

        // Log activity
        activityLogService.logActivity(
            "CREATE_DISCOUNT",
            "DISCOUNT",
            createdDiscount.getId(),
            "Mã giảm giá mới được tạo: " + createdDiscount.getCode(),
            "{\"code\":\"" + createdDiscount.getCode() + "\",\"discountType\":\"" + createdDiscount.getDiscountType() + "\",\"value\":" + createdDiscount.getDiscountValue() + "}",
            userId,
            username,
            userRole,
            ipAddress,
            userAgent
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(createdDiscount);
    }
    
    @PatchMapping("/{id}")
    @Operation(summary = "Update discount", description = "Update an existing discount")
    public ResponseEntity<DiscountDTO> updateDiscount(
            @PathVariable Long id,
            @RequestBody DiscountCreateRequest request,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        String username = (String) httpRequest.getAttribute("username");
        String userRole = (String) httpRequest.getAttribute("userRole");
        String ipAddress = getClientIpAddress(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        DiscountDTO updatedDiscount = discountService.updateDiscount(id, request);

        // Log activity
        activityLogService.logActivity(
            "UPDATE_DISCOUNT",
            "DISCOUNT",
            id,
            "Mã giảm giá được cập nhật: " + updatedDiscount.getCode(),
            "{\"code\":\"" + updatedDiscount.getCode() + "\",\"discountType\":\"" + updatedDiscount.getDiscountType() + "\",\"value\":" + updatedDiscount.getDiscountValue() + "}",
            userId,
            username,
            userRole,
            ipAddress,
            userAgent
        );

        return ResponseEntity.ok(updatedDiscount);
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete discount", description = "Delete a discount by ID (soft delete)")
    public ResponseEntity<Void> deleteDiscount(@PathVariable Long id, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        String username = (String) request.getAttribute("username");
        String userRole = (String) request.getAttribute("userRole");
        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");

        // Get discount info before deletion for logging
        DiscountDTO discount = discountService.getDiscountById(id);

        discountService.deleteDiscount(id);

        // Log activity
        activityLogService.logActivity(
            "DELETE_DISCOUNT",
            "DISCOUNT",
            id,
            "Mã giảm giá đã bị xóa: " + discount.getCode(),
            "{\"code\":\"" + discount.getCode() + "\",\"discountType\":\"" + discount.getDiscountType() + "\"}",
            userId,
            username,
            userRole,
            ipAddress,
            userAgent
        );

        return ResponseEntity.noContent().build();
    }
    
    @PatchMapping("/{id}/status")
    @Operation(summary = "Update discount status", description = "Update discount status (ACTIVE/INACTIVE)")
    public ResponseEntity<DiscountDTO> updateDiscountStatus(
            @PathVariable Long id,
            @RequestParam @Parameter(description = "Status: ACTIVE or INACTIVE") String status,
            HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        String username = (String) request.getAttribute("username");
        String userRole = (String) request.getAttribute("userRole");
        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");

        DiscountDTO updatedDiscount = discountService.updateDiscountStatus(id, status);

        // Log activity
        activityLogService.logActivity(
            "UPDATE_DISCOUNT_STATUS",
            "DISCOUNT",
            id,
            "Trạng thái mã giảm giá được cập nhật: " + updatedDiscount.getCode() + " -> " + status,
            "{\"code\":\"" + updatedDiscount.getCode() + "\",\"status\":\"" + status + "\"}",
            userId,
            username,
            userRole,
            ipAddress,
            userAgent
        );

        return ResponseEntity.ok(updatedDiscount);
    }
    
    @PostMapping("/calculate")
    @Operation(summary = "Calculate discount amount", description = "Calculate discount amount for an order without applying it")
    public ResponseEntity<BigDecimal> calculateDiscountAmount(
            @RequestParam String discountCode,
            @RequestParam BigDecimal orderAmount) {
        BigDecimal discountAmount = discountService.calculateDiscountAmount(discountCode, orderAmount);
        return ResponseEntity.ok(discountAmount);
    }
    
    @PostMapping("/apply")
    @Operation(summary = "Apply discount", description = "Apply discount to an order and increase usage count")
    public ResponseEntity<BigDecimal> applyDiscount(
            @RequestParam String discountCode,
            @RequestParam BigDecimal orderAmount,
            HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        String username = (String) request.getAttribute("username");
        String userRole = (String) request.getAttribute("userRole");
        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");

        BigDecimal discountAmount = discountService.applyDiscount(discountCode, orderAmount);

        // Log activity
        activityLogService.logActivity(
            "APPLY_DISCOUNT",
            "DISCOUNT",
            null,
            "Mã giảm giá được áp dụng: " + discountCode + " cho đơn hàng " + orderAmount,
            "{\"code\":\"" + discountCode + "\",\"orderAmount\":" + orderAmount + ",\"discountAmount\":" + discountAmount + "}",
            userId,
            username,
            userRole,
            ipAddress,
            userAgent
        );

        return ResponseEntity.ok(discountAmount);
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        return request.getRemoteAddr();
    }
}