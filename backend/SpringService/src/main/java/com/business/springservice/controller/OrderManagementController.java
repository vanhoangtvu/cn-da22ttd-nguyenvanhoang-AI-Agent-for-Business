package com.business.springservice.controller;

import com.business.springservice.dto.OrderDTO;
import com.business.springservice.enums.OrderStatus;
import com.business.springservice.service.ActivityLogService;
import com.business.springservice.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/orders")
@RequiredArgsConstructor
@Tag(name = "Order Management", description = "APIs for managing orders (ADMIN and BUSINESS only)")
public class OrderManagementController {
    
    private final OrderService orderService;
    private final ActivityLogService activityLogService;
    
    @GetMapping
    @Operation(summary = "Get all orders", description = "Retrieve all orders. Requires ADMIN or BUSINESS role.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved list"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<List<OrderDTO>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Get order by ID", description = "Retrieve order details by ID")
    public ResponseEntity<OrderDTO> getOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }
    
    @GetMapping("/customer/{customerId}")
    @Operation(summary = "Get orders by customer", description = "Retrieve all orders from a specific customer")
    public ResponseEntity<List<OrderDTO>> getOrdersByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(orderService.getOrdersByCustomer(customerId));
    }
    
    @GetMapping("/status/{status}")
    @Operation(summary = "Get orders by status", description = "Retrieve all orders with specific status")
    public ResponseEntity<List<OrderDTO>> getOrdersByStatus(
            @PathVariable @Parameter(description = "Order status: PENDING, CONFIRMED, PROCESSING, SHIPPING, DELIVERED, CANCELLED, RETURNED") String status) {
        try {
            OrderStatus orderStatus = OrderStatus.valueOf(status.toUpperCase());
            return ResponseEntity.ok(orderService.getOrdersByStatus(orderStatus));
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid order status: " + status);
        }
    }
    
    @PatchMapping("/{id}/status")
    @Operation(summary = "Update order status", description = "Update order status. Only ADMIN or BUSINESS role.")
    public ResponseEntity<OrderDTO> updateOrderStatus(
            HttpServletRequest request,
            @PathVariable Long id,
            @RequestParam @Parameter(description = "Status: PENDING, CONFIRMED, PROCESSING, SHIPPING, DELIVERED, CANCELLED, RETURNED") String status) {
        
        // Get current order before update
        OrderDTO currentOrder = orderService.getOrderById(id);
        String oldStatus = currentOrder.getStatus();
        
        // Update order status
        OrderDTO updatedOrder = orderService.updateOrderStatus(id, status);
        
        // Log activity
        Long userId = (Long) request.getAttribute("userId");
        String username = (String) request.getAttribute("username");
        String userRole = (String) request.getAttribute("userRole");
        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");
        
        activityLogService.logActivity(
            "UPDATE_ORDER_STATUS",
            "ORDER",
            updatedOrder.getId(),
            "Cập nhật trạng thái đơn hàng #" + updatedOrder.getId() + " từ " + oldStatus + " sang " + updatedOrder.getStatus(),
            "{\"oldStatus\":\"" + oldStatus + "\",\"newStatus\":\"" + updatedOrder.getStatus() + "\",\"orderId\":" + updatedOrder.getId() + "}",
            userId,
            username,
            userRole,
            ipAddress,
            userAgent
        );
        
        return ResponseEntity.ok(updatedOrder);
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
