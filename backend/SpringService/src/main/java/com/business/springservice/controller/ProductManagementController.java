package com.business.springservice.controller;

import com.business.springservice.dto.ProductCreateRequest;
import com.business.springservice.dto.ProductDTO;
import com.business.springservice.service.ActivityLogService;
import com.business.springservice.service.ProductService;
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
@RequestMapping("/admin/products")
@RequiredArgsConstructor
@Tag(name = "Product Management", description = "APIs for managing products (ADMIN and BUSINESS only)")
public class ProductManagementController {
    
    private final ProductService productService;
    private final ActivityLogService activityLogService;
    
    @GetMapping
    @Operation(summary = "Get all products", description = "Retrieve list of all products. Requires ADMIN or BUSINESS role.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved list"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<List<ProductDTO>> getAllProducts() {
        return ResponseEntity.ok(productService.getAllProducts());
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Get product by ID", description = "Retrieve a specific product by ID")
    public ResponseEntity<ProductDTO> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }
    
    @GetMapping("/category/{categoryId}")
    @Operation(summary = "Get products by category", description = "Retrieve all products in a specific category")
    public ResponseEntity<List<ProductDTO>> getProductsByCategory(@PathVariable Long categoryId) {
        return ResponseEntity.ok(productService.getProductsByCategory(categoryId));
    }
    
    @GetMapping("/seller/{sellerId}")
    @Operation(summary = "Get products by seller", description = "Retrieve all products from a specific seller")
    public ResponseEntity<List<ProductDTO>> getProductsBySeller(@PathVariable Long sellerId) {
        return ResponseEntity.ok(productService.getProductsBySeller(sellerId));
    }
    
    @GetMapping("/search")
    @Operation(summary = "Search products", description = "Search products by name")
    public ResponseEntity<List<ProductDTO>> searchProducts(@RequestParam String keyword) {
        return ResponseEntity.ok(productService.searchProducts(keyword));
    }
    
    @PostMapping
    @Operation(summary = "Create new product", description = "Create a new product. Seller will be set to current user.")
    public ResponseEntity<ProductDTO> createProduct(
            HttpServletRequest request,
            @RequestBody ProductCreateRequest productRequest) {
        Long sellerId = (Long) request.getAttribute("userId");
        String username = (String) request.getAttribute("username");
        String userRole = (String) request.getAttribute("userRole");
        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");

        ProductDTO createdProduct = productService.createProduct(productRequest, sellerId);

        // Log activity
        activityLogService.logActivity(
            "CREATE_PRODUCT",
            "PRODUCT",
            createdProduct.getId(),
            "Sản phẩm mới được thêm: " + createdProduct.getName(),
            "{\"productName\":\"" + createdProduct.getName() + "\",\"price\":" + createdProduct.getPrice() + "}",
            sellerId,
            username,
            userRole,
            ipAddress,
            userAgent
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(createdProduct);
    }
    
    @PatchMapping("/{id}")
    @Operation(summary = "Update product", description = "Update an existing product")
    public ResponseEntity<ProductDTO> updateProduct(
            @PathVariable Long id,
            @RequestBody ProductCreateRequest request,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        String username = (String) httpRequest.getAttribute("username");
        String userRole = (String) httpRequest.getAttribute("userRole");
        String ipAddress = getClientIpAddress(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        ProductDTO updatedProduct = productService.updateProduct(id, request);

        // Log activity
        activityLogService.logActivity(
            "UPDATE_PRODUCT",
            "PRODUCT",
            id,
            "Sản phẩm được cập nhật: " + updatedProduct.getName(),
            "{\"productName\":\"" + updatedProduct.getName() + "\",\"price\":" + updatedProduct.getPrice() + "}",
            userId,
            username,
            userRole,
            ipAddress,
            userAgent
        );

        return ResponseEntity.ok(updatedProduct);
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete product", description = "Delete a product by ID")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        String username = (String) request.getAttribute("username");
        String userRole = (String) request.getAttribute("userRole");
        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");

        // Get product info before deletion for logging
        ProductDTO product = productService.getProductById(id);

        productService.deleteProduct(id);

        // Log activity
        activityLogService.logActivity(
            "DELETE_PRODUCT",
            "PRODUCT",
            id,
            "Sản phẩm đã bị xóa: " + product.getName(),
            "{\"productName\":\"" + product.getName() + "\",\"price\":" + product.getPrice() + "}",
            userId,
            username,
            userRole,
            ipAddress,
            userAgent
        );

        return ResponseEntity.noContent().build();
    }
    
    @PatchMapping("/{id}/status")
    @Operation(summary = "Update product status", description = "Update product status (ACTIVE/INACTIVE). Only ADMIN or BUSINESS role.")
    public ResponseEntity<ProductDTO> updateProductStatus(
            @PathVariable Long id,
            @RequestParam @Parameter(description = "Status: ACTIVE or INACTIVE") String status,
            HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        String username = (String) request.getAttribute("username");
        String userRole = (String) request.getAttribute("userRole");
        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");

        ProductDTO updatedProduct = productService.updateProductStatus(id, status);

        // Log activity
        activityLogService.logActivity(
            "UPDATE_PRODUCT_STATUS",
            "PRODUCT",
            id,
            "Trạng thái sản phẩm được cập nhật: " + updatedProduct.getName() + " -> " + status,
            "{\"productName\":\"" + updatedProduct.getName() + "\",\"status\":\"" + status + "\"}",
            userId,
            username,
            userRole,
            ipAddress,
            userAgent
        );

        return ResponseEntity.ok(updatedProduct);
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
