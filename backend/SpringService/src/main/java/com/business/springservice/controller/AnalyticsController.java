package com.business.springservice.controller;

import com.business.springservice.dto.SystemAnalyticsDataDTO;
import com.business.springservice.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics & AI Integration", description = "Comprehensive data analytics API for AI/RAG services")
public class AnalyticsController {
    
    private final AnalyticsService analyticsService;
    
    @GetMapping("/system-data")
    @Operation(
        summary = "Get complete system analytics data (ADMIN only)", 
        description = "Retrieve comprehensive data including ALL users, products, orders, revenue, and business performance. " +
                     "This endpoint returns ALL data from the entire system. Only ADMIN can access this. " +
                     "For BUSINESS users, use /business-data/{businessId} instead."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved system analytics data"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - Invalid or missing JWT token"),
        @ApiResponse(responseCode = "403", description = "Access denied - Only ADMIN role allowed")
    })
    public ResponseEntity<SystemAnalyticsDataDTO> getSystemAnalyticsData() {
        return ResponseEntity.ok(analyticsService.getSystemAnalyticsData());
    }
    
    @GetMapping("/business-data/{businessId}")
    @Operation(
        summary = "Get business-specific analytics data", 
        description = "Retrieve analytics data ONLY for the specified business. " +
                     "Returns only products, orders, and revenue related to this business. " +
                     "Business users can only access their own data."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved business analytics data"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - Invalid or missing JWT token"),
        @ApiResponse(responseCode = "403", description = "Access denied"),
        @ApiResponse(responseCode = "404", description = "Business not found")
    })
    public ResponseEntity<SystemAnalyticsDataDTO> getBusinessAnalyticsData(@PathVariable Long businessId) {
        return ResponseEntity.ok(analyticsService.getBusinessAnalyticsData(businessId));
    }
}
