package com.business.springservice.controller;

import com.business.springservice.dto.ActivityLogDTO;
import com.business.springservice.dto.BusinessDashboardDTO;
import com.business.springservice.dto.DashboardStatsDTO;
import com.business.springservice.dto.RevenueReportDTO;
import com.business.springservice.dto.SystemReportDTO;
import com.business.springservice.service.DashboardService;
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
@RequestMapping("/admin/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Dashboard statistics APIs (ADMIN and BUSINESS only)")
public class DashboardController {
    
    private final DashboardService dashboardService;
    
    @GetMapping("/admin-stats")
    @Operation(summary = "Get admin dashboard statistics", 
               description = "Get complete system statistics including users, products, categories, orders, and revenue. Admin only.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved statistics"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Access denied - Admin only")
    })
    public ResponseEntity<DashboardStatsDTO> getAdminDashboard() {
        return ResponseEntity.ok(dashboardService.getAdminDashboardStats());
    }
    
    @GetMapping("/business-stats")
    @Operation(summary = "Get my business dashboard statistics", 
               description = "Get statistics for current logged-in business user including products, orders, and revenue from their products.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved statistics"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<BusinessDashboardDTO> getMyBusinessDashboard(HttpServletRequest request) {
        Long businessId = (Long) request.getAttribute("userId");
        return ResponseEntity.ok(dashboardService.getBusinessDashboardStats(businessId));
    }
    
    @GetMapping("/revenue/daily")
    @Operation(summary = "Get daily revenue report", 
               description = "Get revenue report by day for business user. Shows revenue and products sold per day.")
    public ResponseEntity<List<RevenueReportDTO>> getDailyRevenue(
            HttpServletRequest request,
            @RequestParam(defaultValue = "7") @Parameter(description = "Number of days", example = "7") int days) {
        Long businessId = (Long) request.getAttribute("userId");
        return ResponseEntity.ok(dashboardService.getRevenueByDay(businessId, days));
    }
    
    @GetMapping("/revenue/weekly")
    @Operation(summary = "Get weekly revenue report", 
               description = "Get revenue report by week for business user. Shows revenue and products sold per week.")
    public ResponseEntity<List<RevenueReportDTO>> getWeeklyRevenue(
            HttpServletRequest request,
            @RequestParam(defaultValue = "4") @Parameter(description = "Number of weeks", example = "4") int weeks) {
        Long businessId = (Long) request.getAttribute("userId");
        return ResponseEntity.ok(dashboardService.getRevenueByWeek(businessId, weeks));
    }
    
    @GetMapping("/revenue/monthly")
    @Operation(summary = "Get monthly revenue report", 
               description = "Get revenue report by month for business user. Shows revenue and products sold per month.")
    public ResponseEntity<List<RevenueReportDTO>> getMonthlyRevenue(
            HttpServletRequest request,
            @RequestParam(defaultValue = "6") @Parameter(description = "Number of months", example = "6") int months) {
        Long businessId = (Long) request.getAttribute("userId");
        return ResponseEntity.ok(dashboardService.getRevenueByMonth(businessId, months));
    }
    
    @GetMapping("/admin/revenue/daily")
    @Operation(summary = "Get daily revenue report for admin", 
               description = "Get system-wide revenue report by day. Admin only.")
    public ResponseEntity<List<RevenueReportDTO>> getAdminDailyRevenue(
            @RequestParam(defaultValue = "7") @Parameter(description = "Number of days") int days) {
        return ResponseEntity.ok(dashboardService.getRevenueByDay(null, days));
    }
    
    @GetMapping("/admin/revenue/weekly")
    @Operation(summary = "Get weekly revenue report for admin", 
               description = "Get system-wide revenue report by week. Admin only.")
    public ResponseEntity<List<RevenueReportDTO>> getAdminWeeklyRevenue(
            @RequestParam(defaultValue = "4") @Parameter(description = "Number of weeks") int weeks) {
        return ResponseEntity.ok(dashboardService.getRevenueByWeek(null, weeks));
    }
    
    @GetMapping("/admin/revenue/monthly")
    @Operation(summary = "Get monthly revenue report for admin", 
               description = "Get system-wide revenue report by month. Admin only.")
    public ResponseEntity<List<RevenueReportDTO>> getAdminMonthlyRevenue(
            @RequestParam(defaultValue = "6") @Parameter(description = "Number of months") int months) {
        return ResponseEntity.ok(dashboardService.getRevenueByMonth(null, months));
    }
    
    @GetMapping("/system-report")
    @Operation(summary = "Get comprehensive system report", 
               description = "Tự động tính toán và trả về báo cáo tổng hợp hệ thống bao gồm: " +
                           "doanh thu (tổng, hôm nay, tuần, tháng, tăng trưởng), " +
                           "thống kê sản phẩm (tổng, đang bán, hết hàng, tồn kho), " +
                           "thống kê đơn hàng (tất cả trạng thái, tỷ lệ thành công), " +
                           "thống kê khách hàng (tổng, mới, chuyển đổi), " +
                           "thống kê doanh nghiệp (tổng, hoạt động, top seller), " +
                           "top 10 sản phẩm bán chạy, " +
                           "doanh thu 7 ngày gần nhất. " +
                           "Admin và Business có thể truy cập.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved system report"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<SystemReportDTO> getSystemReport() {
        return ResponseEntity.ok(dashboardService.getSystemReport());
    }

    @GetMapping("/recent-activities")
    @Operation(summary = "Get recent activities for admin dashboard",
               description = "Get the most recent system activities including product changes, orders, user registrations, etc. Admin only.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved recent activities"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Access denied - Admin only")
    })
    public ResponseEntity<List<ActivityLogDTO>> getRecentActivities(
            @RequestParam(defaultValue = "20") @Parameter(description = "Number of activities to retrieve", example = "20") int limit) {
        return ResponseEntity.ok(dashboardService.getRecentActivities(limit));
    }

    @GetMapping("/business/recent-activities")
    @Operation(summary = "Get recent activities for business dashboard",
               description = "Get recent activities related to the business user's products and orders.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved recent activities"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<List<ActivityLogDTO>> getRecentActivitiesForBusiness(
            HttpServletRequest request,
            @RequestParam(defaultValue = "20") @Parameter(description = "Number of activities to retrieve", example = "20") int limit) {
        Long businessId = (Long) request.getAttribute("userId");
        return ResponseEntity.ok(dashboardService.getRecentActivitiesForBusiness(businessId, limit));
    }
}