package com.business.springservice.service;

import com.business.springservice.dto.SystemAnalyticsDataDTO;
import com.business.springservice.entity.*;
import com.business.springservice.enums.OrderStatus;
import com.business.springservice.enums.Role;
import com.business.springservice.enums.Status;
import com.business.springservice.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {
    
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final OrderRepository orderRepository;
    private final BusinessDocumentRepository businessDocumentRepository;
    private final DiscountRepository discountRepository;
    
    @Transactional(readOnly = true)
    public SystemAnalyticsDataDTO getSystemAnalyticsData() {
        SystemAnalyticsDataDTO data = new SystemAnalyticsDataDTO();
        
        // User data
        List<User> allUsers = userRepository.findAll();
        data.setTotalUsers((long) allUsers.size());
        data.setTotalCustomers(allUsers.stream().filter(u -> u.getRole() == Role.CUSTOMER).count());
        data.setTotalBusinessUsers(allUsers.stream().filter(u -> u.getRole() == Role.BUSINESS).count());
        data.setUsers(allUsers.stream()
                .map(u -> new SystemAnalyticsDataDTO.UserSummaryDTO(
                        u.getId(),
                        u.getUsername(),
                        u.getEmail(),
                        u.getRole().name(),
                        u.getAccountStatus().name(),
                        u.getAddress(),
                        u.getPhoneNumber()
                ))
                .collect(Collectors.toList()));
        
        // Product data
        List<Product> allProducts = productRepository.findAll();
        data.setTotalProducts((long) allProducts.size());
        data.setActiveProducts(allProducts.stream().filter(p -> p.getStatus() == Status.ACTIVE).count());
        
        // Calculate product sales data
        List<Order> allOrders = orderRepository.findAll();
        Map<Long, Integer> productSalesMap = new HashMap<>();
        Map<Long, BigDecimal> productRevenueMap = new HashMap<>();
        
        allOrders.stream()
                .filter(order -> order.getStatus() == OrderStatus.DELIVERED)
                .flatMap(order -> order.getOrderItems().stream())
                .forEach(item -> {
                    Long productId = item.getProduct().getId();
                    productSalesMap.merge(productId, item.getQuantity(), Integer::sum);
                    productRevenueMap.merge(productId, item.getSubtotal(), BigDecimal::add);
                });
        
        data.setProducts(allProducts.stream()
                .map(p -> new SystemAnalyticsDataDTO.ProductAnalyticsDTO(
                        p.getId(),
                        p.getName(),
                        p.getDescription(),
                        p.getPrice(),
                        p.getQuantity(),
                        p.getStatus().name(),
                        p.getCategory().getName(),
                        p.getSeller().getUsername(),
                        p.getSeller().getId(),
                        productSalesMap.getOrDefault(p.getId(), 0),
                        productRevenueMap.getOrDefault(p.getId(), BigDecimal.ZERO),
                        p.getImageUrls(),
                        p.getDetails() // Include detailed product specifications JSON
                ))
                .collect(Collectors.toList()));
        
        // Category data
        List<Category> allCategories = categoryRepository.findAll();
        data.setCategories(allCategories.stream()
                .map(c -> new SystemAnalyticsDataDTO.CategorySummaryDTO(
                        c.getId(),
                        c.getName(),
                        c.getDescription(),
                        c.getStatus().name(),
                        (int) allProducts.stream().filter(p -> p.getCategory().getId().equals(c.getId())).count()
                ))
                .collect(Collectors.toList()));
        
        // Order data
        data.setTotalOrders((long) allOrders.size());
        data.setDeliveredOrders(allOrders.stream().filter(o -> o.getStatus() == OrderStatus.DELIVERED).count());
        data.setPendingOrders(allOrders.stream().filter(o -> o.getStatus() == OrderStatus.PENDING).count());
        
        data.setOrders(allOrders.stream()
                .map(o -> {
                    List<SystemAnalyticsDataDTO.OrderItemSummaryDTO> items = o.getOrderItems().stream()
                            .map(item -> new SystemAnalyticsDataDTO.OrderItemSummaryDTO(
                                    item.getProduct().getId(),
                                    item.getProductName(),
                                    item.getQuantity(),
                                    item.getProductPrice(),
                                    item.getSubtotal()
                            ))
                            .collect(Collectors.toList());
                    
                    return new SystemAnalyticsDataDTO.OrderAnalyticsDTO(
                            o.getId(),
                            o.getCustomer().getId(),
                            o.getCustomerName(),
                            o.getStatus().name(),
                            o.getTotalAmount(),
                            o.getOrderItems().size(),
                            o.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                            items
                    );
                })
                .collect(Collectors.toList()));
        
        // Revenue data
        List<Order> deliveredOrders = allOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.DELIVERED)
                .collect(Collectors.toList());
        
        data.setTotalRevenue(deliveredOrders.stream()
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        
        // Monthly revenue (last 30 days)
        LocalDateTime monthAgo = LocalDateTime.now().minusDays(30);
        data.setMonthlyRevenue(deliveredOrders.stream()
                .filter(o -> o.getCreatedAt().isAfter(monthAgo))
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        
        // Weekly revenue (last 7 days)
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        data.setWeeklyRevenue(deliveredOrders.stream()
                .filter(o -> o.getCreatedAt().isAfter(weekAgo))
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        
        // Daily revenue (today)
        LocalDate today = LocalDate.now();
        data.setDailyRevenue(deliveredOrders.stream()
                .filter(o -> o.getCreatedAt().toLocalDate().equals(today))
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        
        // Revenue by business
        List<User> businessUsers = allUsers.stream()
                .filter(u -> u.getRole() == Role.BUSINESS)
                .collect(Collectors.toList());
        
        data.setRevenueByBusiness(businessUsers.stream()
                .map(business -> {
                    BigDecimal revenue = deliveredOrders.stream()
                            .flatMap(order -> order.getOrderItems().stream())
                            .filter(item -> item.getProduct().getSeller().getId().equals(business.getId()))
                            .map(OrderItem::getSubtotal)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    
                    long orders = deliveredOrders.stream()
                            .filter(order -> order.getOrderItems().stream()
                                    .anyMatch(item -> item.getProduct().getSeller().getId().equals(business.getId())))
                            .count();
                    
                    long productsSold = deliveredOrders.stream()
                            .flatMap(order -> order.getOrderItems().stream())
                            .filter(item -> item.getProduct().getSeller().getId().equals(business.getId()))
                            .mapToLong(OrderItem::getQuantity)
                            .sum();
                    
                    return new SystemAnalyticsDataDTO.RevenueByBusinessDTO(
                            business.getId(),
                            business.getUsername(),
                            revenue,
                            orders,
                            productsSold
                    );
                })
                .collect(Collectors.toList()));
        
        // Business performance
        data.setBusinessPerformance(businessUsers.stream()
                .map(business -> {
                    List<Product> businessProducts = allProducts.stream()
                            .filter(p -> p.getSeller().getId().equals(business.getId()))
                            .collect(Collectors.toList());
                    
                    int totalProducts = businessProducts.size();
                    int activeProducts = (int) businessProducts.stream()
                            .filter(p -> p.getStatus() == Status.ACTIVE)
                            .count();
                    
                    BigDecimal inventoryValue = businessProducts.stream()
                            .map(p -> p.getPrice().multiply(BigDecimal.valueOf(p.getQuantity())))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    
                    List<Order> businessOrders = deliveredOrders.stream()
                            .filter(order -> order.getOrderItems().stream()
                                    .anyMatch(item -> item.getProduct().getSeller().getId().equals(business.getId())))
                            .collect(Collectors.toList());
                    
                    long totalOrders = businessOrders.size();
                    
                    BigDecimal revenue = businessOrders.stream()
                            .flatMap(order -> order.getOrderItems().stream())
                            .filter(item -> item.getProduct().getSeller().getId().equals(business.getId()))
                            .map(OrderItem::getSubtotal)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    
                    double averageOrderValue = totalOrders > 0 
                            ? revenue.divide(BigDecimal.valueOf(totalOrders), 2, RoundingMode.HALF_UP).doubleValue()
                            : 0.0;
                    
                    return new SystemAnalyticsDataDTO.BusinessPerformanceDTO(
                            business.getId(),
                            business.getUsername(),
                            totalProducts,
                            activeProducts,
                            inventoryValue,
                            totalOrders,
                            revenue,
                            averageOrderValue
                    );
                })
                .collect(Collectors.toList()));
        
        // Top selling products
        data.setTopSellingProducts(allProducts.stream()
                .map(p -> new SystemAnalyticsDataDTO.ProductPerformanceDTO(
                        p.getId(),
                        p.getName(),
                        p.getQuantity(),
                        productSalesMap.getOrDefault(p.getId(), 0),
                        productRevenueMap.getOrDefault(p.getId(), BigDecimal.ZERO),
                        p.getCategory().getName(),
                        p.getSeller().getUsername()
                ))
                .sorted((a, b) -> Integer.compare(b.getTotalSold(), a.getTotalSold()))
                .limit(20)
                .collect(Collectors.toList()));
        
        // Low stock products
        data.setLowStockProducts(allProducts.stream()
                .filter(p -> p.getStatus() == Status.ACTIVE && p.getQuantity() > 0 && p.getQuantity() < 10)
                .map(p -> new SystemAnalyticsDataDTO.ProductPerformanceDTO(
                        p.getId(),
                        p.getName(),
                        p.getQuantity(),
                        productSalesMap.getOrDefault(p.getId(), 0),
                        productRevenueMap.getOrDefault(p.getId(), BigDecimal.ZERO),
                        p.getCategory().getName(),
                        p.getSeller().getUsername()
                ))
                .sorted(Comparator.comparingInt(SystemAnalyticsDataDTO.ProductPerformanceDTO::getQuantityInStock))
                .collect(Collectors.toList()));
        
        // Business documents
        List<BusinessDocument> allDocuments = businessDocumentRepository.findAll();
        data.setTotalDocuments((long) allDocuments.size());
        data.setBusinessDocuments(allDocuments.stream()
                .map(doc -> new SystemAnalyticsDataDTO.BusinessDocumentSummaryDTO(
                        doc.getId(),
                        doc.getBusiness().getId(),
                        doc.getBusiness().getUsername(),
                        doc.getFileName(),
                        doc.getFileType(),
                        doc.getFilePath(),
                        doc.getFileSize(),
                        doc.getDescription(),
                        doc.getUploadedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                ))
                .collect(Collectors.toList()));
        
        // Discount analytics
        List<Discount> allDiscounts = discountRepository.findAll();
        data.setTotalDiscounts((long) allDiscounts.size());
        data.setActiveDiscounts(allDiscounts.stream()
                .filter(d -> d.getStatus() == Status.ACTIVE && 
                            (d.getEndDate() == null || d.getEndDate().isAfter(LocalDateTime.now())))
                .count());
        data.setTotalDiscountUsage(allDiscounts.stream()
                .mapToLong(d -> d.getUsedCount() != null ? d.getUsedCount() : 0)
                .sum());
        
        // Calculate total discount savings (estimate based on usage)
        BigDecimal totalSavings = allDiscounts.stream()
                .map(d -> {
                    if (d.getUsedCount() == null || d.getUsedCount() == 0) return BigDecimal.ZERO;
                    
                    // Estimate savings based on discount type
                    switch (d.getDiscountType()) {
                        case FIXED_AMOUNT:
                            return d.getDiscountValue().multiply(new BigDecimal(d.getUsedCount()));
                        case PERCENTAGE:
                            // Estimate average order value for percentage discounts
                            BigDecimal avgOrderValue = BigDecimal.valueOf(1500000); // 1.5M VND average
                            BigDecimal discountAmount = avgOrderValue.multiply(d.getDiscountValue().divide(BigDecimal.valueOf(100)));
                            if (d.getMaxDiscountAmount() != null && discountAmount.compareTo(d.getMaxDiscountAmount()) > 0) {
                                discountAmount = d.getMaxDiscountAmount();
                            }
                            return discountAmount.multiply(new BigDecimal(d.getUsedCount()));
                        case FREE_SHIPPING:
                            // Estimate shipping cost savings
                            return BigDecimal.valueOf(30000).multiply(new BigDecimal(d.getUsedCount()));
                        default:
                            return BigDecimal.ZERO;
                    }
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        data.setTotalDiscountSavings(totalSavings);
        
        data.setDiscounts(allDiscounts.stream()
                .map(d -> {
                    // Calculate usage percentage
                    Double usagePercentage = null;
                    if (d.getUsageLimit() != null && d.getUsageLimit() > 0) {
                        usagePercentage = (d.getUsedCount() != null ? d.getUsedCount().doubleValue() : 0.0) 
                                         / d.getUsageLimit().doubleValue() * 100.0;
                    }
                    
                    // Calculate individual discount savings
                    BigDecimal individualSavings = BigDecimal.ZERO;
                    if (d.getUsedCount() != null && d.getUsedCount() > 0) {
                        switch (d.getDiscountType()) {
                            case FIXED_AMOUNT:
                                individualSavings = d.getDiscountValue().multiply(new BigDecimal(d.getUsedCount()));
                                break;
                            case PERCENTAGE:
                                BigDecimal avgOrder = BigDecimal.valueOf(1500000);
                                BigDecimal discountAmt = avgOrder.multiply(d.getDiscountValue().divide(BigDecimal.valueOf(100)));
                                if (d.getMaxDiscountAmount() != null && discountAmt.compareTo(d.getMaxDiscountAmount()) > 0) {
                                    discountAmt = d.getMaxDiscountAmount();
                                }
                                individualSavings = discountAmt.multiply(new BigDecimal(d.getUsedCount()));
                                break;
                            case FREE_SHIPPING:
                                individualSavings = BigDecimal.valueOf(30000).multiply(new BigDecimal(d.getUsedCount()));
                                break;
                        }
                    }
                    
                    return new SystemAnalyticsDataDTO.DiscountAnalyticsDTO(
                            d.getId(),
                            d.getCode(),
                            d.getName(),
                            d.getDescription(),
                            d.getDiscountType().name(),
                            d.getDiscountValue(),
                            d.getMinOrderValue(),
                            d.getMaxDiscountAmount(),
                            d.getUsageLimit(),
                            d.getUsedCount() != null ? d.getUsedCount() : 0,
                            d.getStatus().name(),
                            d.getStartDate() != null ? d.getStartDate().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null,
                            d.getEndDate() != null ? d.getEndDate().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null,
                            d.getCreatedBy().getUsername(),
                            d.getCreatedBy().getId(),
                            d.isValid(),
                            d.isExpired(),
                            d.isUsageLimitReached(),
                            usagePercentage,
                            individualSavings,
                            d.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                    );
                })
                .collect(Collectors.toList()));
        
        return data;
    }
}
