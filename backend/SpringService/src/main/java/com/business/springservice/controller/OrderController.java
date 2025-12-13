package com.business.springservice.controller;

import com.business.springservice.dto.OrderCreateRequest;
import com.business.springservice.dto.OrderDTO;
import com.business.springservice.dto.OrderUpdateAddressRequest;
import com.business.springservice.service.ActivityLogService;
import com.business.springservice.service.OrderService;
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

import java.util.List;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
@Tag(name = "Orders", description = "APIs for order management (requires authentication)")
public class OrderController {
    
    private final OrderService orderService;
    private final ActivityLogService activityLogService;
    
    @PostMapping
    @Operation(summary = "Create new order", description = "Create a new order. Customer ID will be extracted from JWT token.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Order created successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request or insufficient stock"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<OrderDTO> createOrder(
            HttpServletRequest request,
            @RequestBody OrderCreateRequest orderRequest) {
        Long customerId = (Long) request.getAttribute("userId");
        String username = (String) request.getAttribute("username");
        String userRole = (String) request.getAttribute("userRole");
        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");

        OrderDTO createdOrder = orderService.createOrder(orderRequest, customerId);

        // Log activity
        activityLogService.logActivity(
            "CREATE_ORDER",
            "ORDER",
            createdOrder.getId(),
            "Đơn hàng mới được tạo: #" + createdOrder.getId(),
            "{\"totalAmount\":" + createdOrder.getTotalAmount() + ",\"itemCount\":" + createdOrder.getOrderItems().size() + "}",
            customerId,
            username,
            userRole,
            ipAddress,
            userAgent
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(createdOrder);
    }
    
    @GetMapping("/my-orders")
    @Operation(summary = "Get my orders", description = "Get all orders of current logged-in customer")
    public ResponseEntity<List<OrderDTO>> getMyOrders(HttpServletRequest request) {
        Long customerId = (Long) request.getAttribute("userId");
        return ResponseEntity.ok(orderService.getOrdersByCustomer(customerId));
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Get order by ID", description = "Get order details by ID")
    public ResponseEntity<OrderDTO> getOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }
    
    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel order", description = "Cancel an order. Only order owner can cancel.")
    public ResponseEntity<Void> cancelOrder(
            HttpServletRequest request,
            @PathVariable Long id) {
        Long customerId = (Long) request.getAttribute("userId");
        String username = (String) request.getAttribute("username");
        String userRole = (String) request.getAttribute("userRole");
        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");

        // Get order before canceling
        OrderDTO orderBeforeCancel = orderService.getOrderById(id);
        
        // Cancel order
        orderService.cancelOrder(id, customerId);
        
        // Log activity
        activityLogService.logActivity(
            "CANCEL_ORDER",
            "ORDER",
            id,
            "Đơn hàng #" + id + " đã bị hủy",
            "{\"orderId\":" + id + ",\"totalAmount\":" + orderBeforeCancel.getTotalAmount() + ",\"customerId\":" + customerId + "}",
            customerId,
            username,
            userRole,
            ipAddress,
            userAgent
        );
        
        return ResponseEntity.noContent().build();
    }
    
    @PatchMapping("/{id}/address")
    @Operation(summary = "Update shipping address", description = "Update shipping address. Only available for PENDING or CONFIRMED orders.")
    public ResponseEntity<OrderDTO> updateShippingAddress(
            HttpServletRequest request,
            @PathVariable Long id,
            @RequestBody OrderUpdateAddressRequest addressRequest) {
        Long customerId = (Long) request.getAttribute("userId");
        return ResponseEntity.ok(orderService.updateShippingAddress(id, customerId, addressRequest.getShippingAddress()));
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
