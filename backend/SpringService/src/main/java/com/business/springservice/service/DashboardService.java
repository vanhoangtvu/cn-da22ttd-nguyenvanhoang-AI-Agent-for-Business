package com.business.springservice.service;

import com.business.springservice.dto.ActivityLogDTO;
import com.business.springservice.dto.BusinessDashboardDTO;
import com.business.springservice.dto.DashboardStatsDTO;
import com.business.springservice.dto.RevenueReportDTO;
import com.business.springservice.dto.SystemReportDTO;
import com.business.springservice.entity.Order;
import com.business.springservice.entity.OrderItem;
import com.business.springservice.entity.Product;
import com.business.springservice.entity.User;
import com.business.springservice.enums.OrderStatus;
import com.business.springservice.enums.Role;
import com.business.springservice.enums.Status;
import com.business.springservice.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.time.temporal.WeekFields;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {
    
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final BusinessDocumentRepository documentRepository;
    private final ActivityLogService activityLogService;
    
    @Transactional(readOnly = true)
    public DashboardStatsDTO getAdminDashboardStats() {
        DashboardStatsDTO stats = new DashboardStatsDTO();
        
        // User statistics
        stats.setTotalUsers(userRepository.count());
        stats.setTotalAdmins(countUsersByRole(Role.ADMIN));
        stats.setTotalBusinesses(countUsersByRole(Role.BUSINESS));
        stats.setTotalCustomers(countUsersByRole(Role.CUSTOMER));
        
        // Category statistics
        stats.setTotalCategories(categoryRepository.count());
        stats.setActiveCategories(countCategoriesByStatus(Status.ACTIVE));
        stats.setInactiveCategories(countCategoriesByStatus(Status.INACTIVE));
        
        // Product statistics
        stats.setTotalProducts(productRepository.count());
        stats.setActiveProducts(countProductsByStatus(Status.ACTIVE));
        stats.setInactiveProducts(countProductsByStatus(Status.INACTIVE));
        
        // Order statistics
        List<Order> allOrders = orderRepository.findAll();
        stats.setTotalOrders((long) allOrders.size());
        stats.setPendingOrders(countOrdersByStatus(OrderStatus.PENDING));
        stats.setConfirmedOrders(countOrdersByStatus(OrderStatus.CONFIRMED));
        stats.setProcessingOrders(countOrdersByStatus(OrderStatus.PROCESSING));
        stats.setShippingOrders(countOrdersByStatus(OrderStatus.SHIPPING));
        stats.setDeliveredOrders(countOrdersByStatus(OrderStatus.DELIVERED));
        stats.setCancelledOrders(countOrdersByStatus(OrderStatus.CANCELLED));
        stats.setReturnedOrders(countOrdersByStatus(OrderStatus.RETURNED));
        
        // Revenue statistics
        BigDecimal totalRevenue = allOrders.stream()
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.setTotalRevenue(totalRevenue);
        
        BigDecimal deliveredRevenue = orderRepository.findByStatus(OrderStatus.DELIVERED).stream()
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.setDeliveredRevenue(deliveredRevenue);
        
        // Document statistics
        stats.setTotalDocuments(documentRepository.count());
        
        return stats;
    }
    
    @Transactional(readOnly = true)
    public BusinessDashboardDTO getBusinessDashboardStats(Long businessId) {
        User business = userRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Business user not found"));
        
        BusinessDashboardDTO stats = new BusinessDashboardDTO();
        stats.setBusinessId(businessId);
        stats.setBusinessUsername(business.getUsername());
        
        // Product statistics
        List<com.business.springservice.entity.Product> products = productRepository.findBySellerId(businessId);
        stats.setTotalProducts((long) products.size());
        stats.setActiveProducts(products.stream()
                .filter(p -> p.getStatus() == Status.ACTIVE)
                .count());
        stats.setInactiveProducts(products.stream()
                .filter(p -> p.getStatus() == Status.INACTIVE)
                .count());
        
        // Inventory statistics
        BigDecimal inventoryValue = products.stream()
                .map(p -> p.getPrice().multiply(BigDecimal.valueOf(p.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.setTotalInventoryValue(inventoryValue);
        
        Long totalStock = products.stream()
                .mapToLong(com.business.springservice.entity.Product::getQuantity)
                .sum();
        stats.setTotalStockQuantity(totalStock);
        
        Long outOfStock = products.stream()
                .filter(p -> p.getQuantity() == 0)
                .count();
        stats.setOutOfStockProducts(outOfStock);
        
        Long lowStock = products.stream()
                .filter(p -> p.getQuantity() > 0 && p.getQuantity() < 10)
                .count();
        stats.setLowStockProducts(lowStock);
        
        // Order statistics - orders containing products from this business
        List<Order> allOrders = orderRepository.findAll();
        List<Order> businessOrders = allOrders.stream()
                .filter(order -> order.getOrderItems().stream()
                        .anyMatch(item -> item.getProduct().getSeller().getId().equals(businessId)))
                .toList();
        
        stats.setTotalOrders((long) businessOrders.size());
        stats.setPendingOrders(businessOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.PENDING)
                .count());
        stats.setDeliveredOrders(businessOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.DELIVERED)
                .count());
        
        // Revenue statistics - only from this business's products
        BigDecimal totalRevenue = businessOrders.stream()
                .flatMap(order -> order.getOrderItems().stream())
                .filter(item -> item.getProduct().getSeller().getId().equals(businessId))
                .map(item -> item.getSubtotal())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.setTotalRevenue(totalRevenue);
        
        BigDecimal deliveredRevenue = businessOrders.stream()
                .filter(order -> order.getStatus() == OrderStatus.DELIVERED)
                .flatMap(order -> order.getOrderItems().stream())
                .filter(item -> item.getProduct().getSeller().getId().equals(businessId))
                .map(item -> item.getSubtotal())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.setDeliveredRevenue(deliveredRevenue);
        
        // Document statistics
        stats.setTotalDocuments((long) documentRepository.findByBusinessId(businessId).size());
        
        return stats;
    }
    
    private Long countUsersByRole(Role role) {
        return userRepository.findAll().stream()
                .filter(user -> user.getRole() == role)
                .count();
    }
    
    private Long countCategoriesByStatus(Status status) {
        return categoryRepository.findAll().stream()
                .filter(category -> category.getStatus() == status)
                .count();
    }
    
    private Long countProductsByStatus(Status status) {
        return productRepository.findAll().stream()
                .filter(product -> product.getStatus() == status)
                .count();
    }
    
    private Long countOrdersByStatus(OrderStatus status) {
        return (long) orderRepository.findByStatus(status).size();
    }
    
    @Transactional(readOnly = true)
    public List<RevenueReportDTO> getRevenueByDay(Long businessId, int days) {
        List<RevenueReportDTO> reports = new ArrayList<>();
        LocalDate today = LocalDate.now();
        
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            LocalDateTime startOfDay = date.atStartOfDay();
            LocalDateTime endOfDay = date.atTime(23, 59, 59);
            
            RevenueReportDTO report = calculateRevenueForPeriod(businessId, startOfDay, endOfDay);
            report.setPeriod(date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
            reports.add(report);
        }
        
        return reports;
    }
    
    @Transactional(readOnly = true)
    public List<RevenueReportDTO> getRevenueByWeek(Long businessId, int weeks) {
        List<RevenueReportDTO> reports = new ArrayList<>();
        LocalDate today = LocalDate.now();
        WeekFields weekFields = WeekFields.of(Locale.getDefault());
        
        for (int i = weeks - 1; i >= 0; i--) {
            LocalDate weekStart = today.minusWeeks(i)
                    .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            LocalDate weekEnd = weekStart.plusDays(6);
            
            LocalDateTime startOfWeek = weekStart.atStartOfDay();
            LocalDateTime endOfWeek = weekEnd.atTime(23, 59, 59);
            
            RevenueReportDTO report = calculateRevenueForPeriod(businessId, startOfWeek, endOfWeek);
            int weekNumber = weekStart.get(weekFields.weekOfYear());
            report.setPeriod("Week " + weekNumber + " (" + weekStart + " to " + weekEnd + ")");
            reports.add(report);
        }
        
        return reports;
    }
    
    @Transactional(readOnly = true)
    public List<RevenueReportDTO> getRevenueByMonth(Long businessId, int months) {
        List<RevenueReportDTO> reports = new ArrayList<>();
        LocalDate today = LocalDate.now();
        
        for (int i = months - 1; i >= 0; i--) {
            LocalDate monthDate = today.minusMonths(i);
            LocalDate monthStart = monthDate.with(TemporalAdjusters.firstDayOfMonth());
            LocalDate monthEnd = monthDate.with(TemporalAdjusters.lastDayOfMonth());
            
            LocalDateTime startOfMonth = monthStart.atStartOfDay();
            LocalDateTime endOfMonth = monthEnd.atTime(23, 59, 59);
            
            RevenueReportDTO report = calculateRevenueForPeriod(businessId, startOfMonth, endOfMonth);
            report.setPeriod(monthDate.format(DateTimeFormatter.ofPattern("MMMM yyyy")));
            reports.add(report);
        }
        
        return reports;
    }
    
    private RevenueReportDTO calculateRevenueForPeriod(Long businessId, LocalDateTime start, LocalDateTime end) {
        List<Order> ordersInPeriod = orderRepository.findAll().stream()
                .filter(order -> {
                    LocalDateTime createdAt = order.getCreatedAt();
                    return createdAt != null && 
                           !createdAt.isBefore(start) && 
                           !createdAt.isAfter(end);
                })
                .collect(Collectors.toList());
        
        // Filter orders that contain products from this business
        List<Order> businessOrders;
        if (businessId != null) {
            businessOrders = ordersInPeriod.stream()
                    .filter(order -> order.getOrderItems().stream()
                            .anyMatch(item -> item.getProduct().getSeller().getId().equals(businessId)))
                    .collect(Collectors.toList());
        } else {
            businessOrders = ordersInPeriod;
        }
        
        long totalOrders = businessOrders.size();
        long deliveredOrders = businessOrders.stream()
                .filter(order -> order.getStatus() == OrderStatus.DELIVERED)
                .count();
        
        // Calculate revenue and products sold
        List<OrderItem> deliveredItems = businessOrders.stream()
                .filter(order -> order.getStatus() == OrderStatus.DELIVERED)
                .flatMap(order -> order.getOrderItems().stream())
                .collect(Collectors.toList());
        
        if (businessId != null) {
            deliveredItems = deliveredItems.stream()
                    .filter(item -> item.getProduct().getSeller().getId().equals(businessId))
                    .collect(Collectors.toList());
        }
        
        BigDecimal revenue = deliveredItems.stream()
                .map(OrderItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        long productsSold = deliveredItems.stream()
                .mapToLong(OrderItem::getQuantity)
                .sum();
        
        RevenueReportDTO report = new RevenueReportDTO();
        report.setTotalOrders(totalOrders);
        report.setDeliveredOrders(deliveredOrders);
        report.setRevenue(revenue);
        report.setProductsSold(productsSold);
        
        return report;
    }
    
    @Transactional(readOnly = true)
    public SystemReportDTO getSystemReport() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfToday = now.toLocalDate().atStartOfDay();
        LocalDateTime startOfWeek = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).toLocalDate().atStartOfDay();
        LocalDateTime startOfMonth = now.with(TemporalAdjusters.firstDayOfMonth()).toLocalDate().atStartOfDay();
        LocalDateTime startOfLastMonth = now.minusMonths(1).with(TemporalAdjusters.firstDayOfMonth()).toLocalDate().atStartOfDay();
        LocalDateTime endOfLastMonth = now.minusMonths(1).with(TemporalAdjusters.lastDayOfMonth()).toLocalDate().atTime(23, 59, 59);
        
        // Lấy tất cả đơn hàng
        List<Order> allOrders = orderRepository.findAll();
        List<Order> deliveredOrders = allOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.DELIVERED)
                .collect(Collectors.toList());
        
        // 1. REVENUE OVERVIEW
        BigDecimal totalRevenue = deliveredOrders.stream()
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal todayRevenue = deliveredOrders.stream()
                .filter(o -> o.getCreatedAt().isAfter(startOfToday))
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal weekRevenue = deliveredOrders.stream()
                .filter(o -> o.getCreatedAt().isAfter(startOfWeek))
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal monthRevenue = deliveredOrders.stream()
                .filter(o -> o.getCreatedAt().isAfter(startOfMonth))
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal lastMonthRevenue = deliveredOrders.stream()
                .filter(o -> o.getCreatedAt().isAfter(startOfLastMonth) && o.getCreatedAt().isBefore(endOfLastMonth))
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        Double growthRate = 0.0;
        if (lastMonthRevenue.compareTo(BigDecimal.ZERO) > 0) {
            growthRate = monthRevenue.subtract(lastMonthRevenue)
                    .divide(lastMonthRevenue, 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    .doubleValue();
        }
        
        BigDecimal avgOrderValue = BigDecimal.ZERO;
        if (!deliveredOrders.isEmpty()) {
            avgOrderValue = totalRevenue.divide(new BigDecimal(deliveredOrders.size()), 2, RoundingMode.HALF_UP);
        }
        
        SystemReportDTO.RevenueOverview revenueOverview = SystemReportDTO.RevenueOverview.builder()
                .totalRevenue(totalRevenue)
                .todayRevenue(todayRevenue)
                .weekRevenue(weekRevenue)
                .monthRevenue(monthRevenue)
                .growthRate(growthRate)
                .avgOrderValue(avgOrderValue)
                .build();
        
        // 2. PRODUCT STATISTICS
        List<Product> allProducts = productRepository.findAll();
        long totalProducts = allProducts.size();
        long activeProducts = allProducts.stream().filter(p -> p.getStatus() == Status.ACTIVE).count();
        long outOfStockProducts = allProducts.stream().filter(p -> p.getQuantity() == 0).count();
        long lowStockProducts = allProducts.stream().filter(p -> p.getQuantity() > 0 && p.getQuantity() < 10).count();
        
        BigDecimal totalInventoryValue = allProducts.stream()
                .map(p -> p.getPrice().multiply(new BigDecimal(p.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        List<OrderItem> allOrderItems = deliveredOrders.stream()
                .flatMap(o -> o.getOrderItems().stream())
                .collect(Collectors.toList());
        
        long totalProductsSold = allOrderItems.stream()
                .mapToLong(OrderItem::getQuantity)
                .sum();
        
        SystemReportDTO.ProductStatistics productStatistics = SystemReportDTO.ProductStatistics.builder()
                .totalProducts(totalProducts)
                .activeProducts(activeProducts)
                .outOfStockProducts(outOfStockProducts)
                .lowStockProducts(lowStockProducts)
                .totalInventoryValue(totalInventoryValue)
                .totalProductsSold(totalProductsSold)
                .build();
        
        // 3. ORDER STATISTICS
        long totalOrders = allOrders.size();
        long pendingOrders = allOrders.stream().filter(o -> o.getStatus() == OrderStatus.PENDING).count();
        long processingOrders = allOrders.stream().filter(o -> o.getStatus() == OrderStatus.PROCESSING).count();
        long shippingOrders = allOrders.stream().filter(o -> o.getStatus() == OrderStatus.SHIPPING).count();
        long deliveredCount = deliveredOrders.size();
        long cancelledOrders = allOrders.stream().filter(o -> o.getStatus() == OrderStatus.CANCELLED).count();
        
        double successRate = 0.0;
        if (totalOrders > 0) {
            successRate = (deliveredCount * 100.0) / totalOrders;
        }
        
        long todayOrders = allOrders.stream()
                .filter(o -> o.getCreatedAt().isAfter(startOfToday))
                .count();
        
        SystemReportDTO.OrderStatistics orderStatistics = SystemReportDTO.OrderStatistics.builder()
                .totalOrders(totalOrders)
                .pendingOrders(pendingOrders)
                .processingOrders(processingOrders)
                .shippingOrders(shippingOrders)
                .deliveredOrders(deliveredCount)
                .cancelledOrders(cancelledOrders)
                .successRate(successRate)
                .todayOrders(todayOrders)
                .build();
        
        // 4. CUSTOMER STATISTICS
        List<User> allCustomers = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.CUSTOMER)
                .collect(Collectors.toList());
        
        long totalCustomers = allCustomers.size();
        long newCustomersThisMonth = allCustomers.stream()
                .filter(u -> u.getCreatedAt().isAfter(startOfMonth))
                .count();
        
        Set<Long> customersWithOrders = deliveredOrders.stream()
                .map(o -> o.getCustomer().getId())
                .collect(Collectors.toSet());
        
        double conversionRate = 0.0;
        if (totalCustomers > 0) {
            conversionRate = (customersWithOrders.size() * 100.0) / totalCustomers;
        }
        
        BigDecimal avgCustomerValue = BigDecimal.ZERO;
        if (!customersWithOrders.isEmpty()) {
            avgCustomerValue = totalRevenue.divide(new BigDecimal(customersWithOrders.size()), 2, RoundingMode.HALF_UP);
        }
        
        SystemReportDTO.CustomerStatistics customerStatistics = SystemReportDTO.CustomerStatistics.builder()
                .totalCustomers(totalCustomers)
                .newCustomersThisMonth(newCustomersThisMonth)
                .customersWithOrders((long) customersWithOrders.size())
                .conversionRate(conversionRate)
                .avgCustomerValue(avgCustomerValue)
                .build();
        
        // 5. BUSINESS STATISTICS
        List<User> allBusinesses = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.BUSINESS)
                .collect(Collectors.toList());
        
        long totalBusinesses = allBusinesses.size();
        long activeBusinesses = allBusinesses.stream()
                .filter(u -> productRepository.findBySellerId(u.getId()).size() > 0)
                .count();
        
        long totalBusinessProducts = allProducts.size();
        
        // Tính doanh thu theo business
        Map<Long, BigDecimal> businessRevenue = new HashMap<>();
        for (Order order : deliveredOrders) {
            for (OrderItem item : order.getOrderItems()) {
                Long sellerId = item.getProduct().getSeller().getId();
                businessRevenue.merge(sellerId, item.getSubtotal(), BigDecimal::add);
            }
        }
        
        String topBusiness = "N/A";
        BigDecimal topBusinessRevenue = BigDecimal.ZERO;
        if (!businessRevenue.isEmpty()) {
            Map.Entry<Long, BigDecimal> topEntry = businessRevenue.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .orElse(null);
            if (topEntry != null) {
                User topUser = userRepository.findById(topEntry.getKey()).orElse(null);
                topBusiness = topUser != null ? topUser.getUsername() : "N/A";
                topBusinessRevenue = topEntry.getValue();
            }
        }
        
        SystemReportDTO.BusinessStatistics businessStatistics = SystemReportDTO.BusinessStatistics.builder()
                .totalBusinesses(totalBusinesses)
                .activeBusinesses(activeBusinesses)
                .totalBusinessProducts(totalBusinessProducts)
                .topBusiness(topBusiness)
                .topBusinessRevenue(topBusinessRevenue)
                .build();
        
        // 6. TOP SELLING PRODUCTS
        Map<Long, SystemReportDTO.TopProductDTO> productSales = new HashMap<>();
        for (OrderItem item : allOrderItems) {
            Product product = item.getProduct();
            Long productId = product.getId();
            
            productSales.merge(productId, 
                SystemReportDTO.TopProductDTO.builder()
                    .productId(productId)
                    .productName(product.getName())
                    .soldQuantity((long) item.getQuantity())
                    .revenue(item.getSubtotal())
                    .businessName(product.getSeller().getUsername())
                    .build(),
                (existing, newValue) -> {
                    existing.setSoldQuantity(existing.getSoldQuantity() + newValue.getSoldQuantity());
                    existing.setRevenue(existing.getRevenue().add(newValue.getRevenue()));
                    return existing;
                });
        }
        
        List<SystemReportDTO.TopProductDTO> topSellingProducts = productSales.values().stream()
                .sorted((a, b) -> b.getSoldQuantity().compareTo(a.getSoldQuantity()))
                .limit(10)
                .collect(Collectors.toList());
        
        // 7. DAILY REVENUE (7 days)
        List<SystemReportDTO.DailyRevenueDTO> dailyRevenue = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        
        for (int i = 6; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            LocalDateTime startOfDay = date.atStartOfDay();
            LocalDateTime endOfDay = date.atTime(23, 59, 59);
            
            List<Order> dayOrders = deliveredOrders.stream()
                    .filter(o -> o.getCreatedAt().isAfter(startOfDay) && o.getCreatedAt().isBefore(endOfDay))
                    .collect(Collectors.toList());
            
            BigDecimal dayRevenue = dayOrders.stream()
                    .map(Order::getTotalAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            dailyRevenue.add(SystemReportDTO.DailyRevenueDTO.builder()
                    .date(date.format(formatter))
                    .orders((long) dayOrders.size())
                    .revenue(dayRevenue)
                    .build());
        }
        
        // BUILD FINAL REPORT
        return SystemReportDTO.builder()
                .reportTime(now)
                .revenueOverview(revenueOverview)
                .productStatistics(productStatistics)
                .orderStatistics(orderStatistics)
                .customerStatistics(customerStatistics)
                .businessStatistics(businessStatistics)
                .topSellingProducts(topSellingProducts)
                .dailyRevenue(dailyRevenue)
                .build();
    }

    @Transactional(readOnly = true)
    public List<ActivityLogDTO> getRecentActivities(int limit) {
        return activityLogService.getRecentActivities(limit)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ActivityLogDTO> getRecentActivitiesForBusiness(Long businessId, int limit) {
        return activityLogService.getActivitiesForBusiness(businessId, limit)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private ActivityLogDTO convertToDTO(com.business.springservice.entity.ActivityLog activityLog) {
        String actionDescription = getActionDescription(activityLog);
        String entityInfo = getEntityInfo(activityLog);
        String[] iconInfo = getIconInfo(activityLog.getEntityType(), activityLog.getAction());
        
        return ActivityLogDTO.builder()
                .id(activityLog.getId())
                .action(activityLog.getAction())
                .entityType(activityLog.getEntityType())
                .entityId(activityLog.getEntityId())
                .description(activityLog.getDescription())
                .details(activityLog.getDetails())
                .userId(activityLog.getUserId())
                .username(activityLog.getUsername())
                .userRole(activityLog.getUserRole())
                .createdAt(activityLog.getCreatedAt())
                .ipAddress(activityLog.getIpAddress())
                .userAgent(activityLog.getUserAgent())
                .timeAgo(calculateTimeAgo(activityLog.getCreatedAt()))
                .iconType(getIconType(activityLog.getEntityType(), activityLog.getAction()))
                .actionColor(getActionColor(activityLog.getAction()))
                .actionDescription(actionDescription)
                .entityInfo(entityInfo)
                .iconBgColor(iconInfo[0])
                .iconColor(iconInfo[1])
                .iconPath(iconInfo[2])
                .build();
    }

    private String calculateTimeAgo(LocalDateTime createdAt) {
        LocalDateTime now = LocalDateTime.now();
        long minutes = java.time.Duration.between(createdAt, now).toMinutes();

        if (minutes < 1) return "vừa xong";
        if (minutes < 60) return minutes + " phút trước";

        long hours = minutes / 60;
        if (hours < 24) return hours + " giờ trước";

        long days = hours / 24;
        if (days < 7) return days + " ngày trước";

        long weeks = days / 7;
        if (weeks < 4) return weeks + " tuần trước";

        long months = days / 30;
        return months + " tháng trước";
    }

    private String getIconType(String entityType, String action) {
        switch (entityType.toLowerCase()) {
            case "product":
                return action.contains("CREATE") ? "plus" :
                       action.contains("UPDATE") ? "edit" :
                       action.contains("DELETE") ? "trash" : "package";
            case "order":
                return action.contains("CREATE") ? "shopping-cart" :
                       action.contains("UPDATE") ? "refresh" : "clipboard";
            case "user":
                return "user";
            case "category":
                return "tag";
            default:
                return "activity";
        }
    }

    private String getActionColor(String action) {
        if (action.contains("CREATE")) return "text-green-600";
        if (action.contains("UPDATE")) return "text-blue-600";
        if (action.contains("DELETE")) return "text-red-600";
        return "text-gray-600";
    }

    private String getActionDescription(com.business.springservice.entity.ActivityLog activityLog) {
        String action = activityLog.getAction();
        String entityType = activityLog.getEntityType();
        
        switch (entityType.toLowerCase()) {
            case "product":
                if (action.contains("CREATE")) return "Sản phẩm mới được thêm";
                if (action.contains("UPDATE")) return "Sản phẩm được cập nhật";
                if (action.contains("DELETE")) return "Sản phẩm được xóa";
                break;
            case "order":
                if (action.contains("CREATE")) return "Đơn hàng được tạo";
                if (action.contains("CANCEL")) return "Đơn hàng đã bị hủy";
                if (action.contains("UPDATE")) return "Đơn hàng được cập nhật";
                if (action.contains("STATUS")) return "Trạng thái đơn hàng được cập nhật";
                break;
            case "category":
                if (action.contains("CREATE")) return "Danh mục mới được tạo";
                if (action.contains("UPDATE")) return "Danh mục được cập nhật";
                if (action.contains("DELETE")) return "Danh mục được xóa";
                break;
            case "user":
                if (action.contains("CREATE")) return "Người dùng mới đăng ký";
                if (action.contains("UPDATE")) return "Thông tin người dùng được cập nhật";
                break;
        }
        return activityLog.getDescription() != null ? activityLog.getDescription() : "Hoạt động hệ thống";
    }

    private String getEntityInfo(com.business.springservice.entity.ActivityLog activityLog) {
        if (activityLog.getDescription() != null && !activityLog.getDescription().isEmpty()) {
            return activityLog.getDescription();
        }
        return activityLog.getEntityType() + " #" + activityLog.getEntityId();
    }

    private String[] getIconInfo(String entityType, String action) {
        String bgColor, iconColor, iconPath;
        
        switch (entityType.toLowerCase()) {
            case "product":
                bgColor = action.contains("CREATE") ? "bg-blue-100 dark:bg-blue-900" :
                          action.contains("UPDATE") ? "bg-yellow-100 dark:bg-yellow-900" :
                          action.contains("DELETE") ? "bg-red-100 dark:bg-red-900" : "bg-gray-100 dark:bg-gray-900";
                iconColor = action.contains("CREATE") ? "text-blue-600" :
                            action.contains("UPDATE") ? "text-yellow-600" :
                            action.contains("DELETE") ? "text-red-600" : "text-gray-600";
                iconPath = action.contains("CREATE") ? "M12 6v6m0 0v6m0-6h6m-6 0H6" :
                           action.contains("UPDATE") ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" :
                           "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16";
                break;
            case "order":
                bgColor = action.contains("CREATE") ? "bg-green-100 dark:bg-green-900" :
                          action.contains("CANCEL") ? "bg-red-100 dark:bg-red-900" :
                          action.contains("UPDATE") || action.contains("STATUS") ? "bg-blue-100 dark:bg-blue-900" : "bg-gray-100 dark:bg-gray-900";
                iconColor = action.contains("CREATE") ? "text-green-600" :
                            action.contains("CANCEL") ? "text-red-600" :
                            action.contains("UPDATE") || action.contains("STATUS") ? "text-blue-600" : "text-gray-600";
                iconPath = "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z";
                break;
            case "category":
                bgColor = "bg-purple-100 dark:bg-purple-900";
                iconColor = "text-purple-600";
                iconPath = "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z";
                break;
            case "user":
                bgColor = "bg-indigo-100 dark:bg-indigo-900";
                iconColor = "text-indigo-600";
                iconPath = "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z";
                break;
            default:
                bgColor = "bg-gray-100 dark:bg-gray-900";
                iconColor = "text-gray-600";
                iconPath = "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z";
        }
        
        return new String[]{bgColor, iconColor, iconPath};
    }
}